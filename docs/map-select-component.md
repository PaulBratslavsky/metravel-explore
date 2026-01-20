# Building a Cross-Platform Map Select Component for Next.js and React Native

This document analyzes the approach to building a reusable map selection component that works across Next.js (web) and React Native (mobile), based on the functionality of our Strapi MapBox plugin.

## Current Strapi Plugin Architecture

The existing plugin (`strapi-plugin-map-box`) provides:

- **MapBoxField**: Main component with map display, marker placement, and search
- **useMapLocationHook**: State management for view state and marker position
- **useLocationService**: Geocoding search via Mapbox API
- **MapSearch**: Search input component

### Data Structure

```typescript
type MapBoxValue = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  address: string
}
```

## Cross-Platform Strategy

### The Challenge

The primary challenge is that **map rendering libraries differ between platforms**:

| Platform | Library | Notes |
|----------|---------|-------|
| Web (Next.js) | `react-map-gl` | Uses Mapbox GL JS |
| React Native | `react-native-maps` | Uses native map SDKs (Google Maps, Apple Maps) |
| React Native (Mapbox) | `@rnmapbox/maps` | Mapbox SDK for RN |

### Recommended Approach: Shared Logic, Platform-Specific UI

```
┌─────────────────────────────────────────────────────┐
│                   Shared Package                     │
│  ┌─────────────────────────────────────────────────┐│
│  │  • Types (MapBoxValue, ViewState)               ││
│  │  • useMapLocation hook (state management)       ││
│  │  • useGeocodingSearch hook (API calls)          ││
│  │  • Validation utilities                         ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
            │                           │
            ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   Next.js Package    │     │  React Native Package│
│  ┌─────────────────┐│     │  ┌─────────────────┐│
│  │ MapSelectField  ││     │  │ MapSelectField  ││
│  │ (react-map-gl)  ││     │  │ (react-native-  ││
│  │                 ││     │  │  maps or        ││
│  │ SearchInput     ││     │  │  @rnmapbox/maps)││
│  └─────────────────┘│     │  └─────────────────┘│
└─────────────────────┘     └─────────────────────┘
```

## Implementation

### 1. Shared Types and Hooks (`@metravel/map-core`)

```typescript
// types.ts
export type MapValue = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  address: string
}

export type ViewState = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

export const DEFAULT_VIEW_STATE: ViewState = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 13,
  pitch: 0,
  bearing: 0,
}
```

```typescript
// useMapLocation.ts
import { useState, useCallback } from 'react'
import { MapValue, ViewState, DEFAULT_VIEW_STATE } from './types'

export function useMapLocation(initialValue?: MapValue) {
  const [viewState, setViewState] = useState<ViewState>(() =>
    initialValue ? {
      longitude: initialValue.longitude,
      latitude: initialValue.latitude,
      zoom: initialValue.zoom,
      pitch: initialValue.pitch,
      bearing: initialValue.bearing,
    } : DEFAULT_VIEW_STATE
  )

  const [markerPosition, setMarkerPosition] = useState(() => ({
    longitude: initialValue?.longitude ?? DEFAULT_VIEW_STATE.longitude,
    latitude: initialValue?.latitude ?? DEFAULT_VIEW_STATE.latitude,
  }))

  const [address, setAddress] = useState(initialValue?.address ?? '')

  const updateLocation = useCallback((
    lng: number,
    lat: number,
    newAddress?: string
  ) => {
    setMarkerPosition({ longitude: lng, latitude: lat })
    if (newAddress) setAddress(newAddress)
  }, [])

  const getValue = useCallback((): MapValue => ({
    longitude: markerPosition.longitude,
    latitude: markerPosition.latitude,
    zoom: viewState.zoom,
    pitch: viewState.pitch,
    bearing: viewState.bearing,
    address,
  }), [markerPosition, viewState, address])

  return {
    viewState,
    setViewState,
    markerPosition,
    updateLocation,
    address,
    setAddress,
    getValue,
  }
}
```

```typescript
// useGeocodingSearch.ts
import { useState, useCallback } from 'react'

type SearchResult = {
  longitude: number
  latitude: number
  address: string
}

type UseGeocodingSearchOptions = {
  accessToken: string
  onResult?: (result: SearchResult) => void
}

export function useGeocodingSearch({ accessToken, onResult }: UseGeocodingSearchOptions) {
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const search = useCallback(async (query: string): Promise<SearchResult | null> => {
    if (!query.trim()) return null

    setIsSearching(true)
    setError(null)

    try {
      const encoded = encodeURIComponent(query.trim())
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${accessToken}`
      )
      const data = await response.json()

      if (data.features?.[0]) {
        const [longitude, latitude] = data.features[0].center
        const result = {
          longitude,
          latitude,
          address: data.features[0].place_name,
        }
        onResult?.(result)
        return result
      }

      setError('No results found')
      return null
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
      return null
    } finally {
      setIsSearching(false)
    }
  }, [accessToken, onResult])

  return { search, isSearching, error }
}
```

### 2. Next.js Implementation (`@metravel/map-web`)

```tsx
'use client'

import { useState } from 'react'
import Map, {
  FullscreenControl,
  GeolocateControl,
  Marker,
  NavigationControl,
} from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapLocation, useGeocodingSearch, MapValue } from '@metravel/map-core'

type MapSelectFieldProps = {
  value?: MapValue
  onChange: (value: MapValue) => void
  accessToken: string
}

export function MapSelectField({ value, onChange, accessToken }: MapSelectFieldProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const {
    viewState,
    setViewState,
    markerPosition,
    updateLocation,
    getValue,
  } = useMapLocation(value)

  const { search, isSearching } = useGeocodingSearch({
    accessToken,
    onResult: (result) => {
      updateLocation(result.longitude, result.latitude, result.address)
      setViewState(prev => ({
        ...prev,
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 14,
      }))
      onChange(getValue())
    },
  })

  const handleMapClick = (event: mapboxgl.MapLayerMouseEvent) => {
    const { lng, lat } = event.lngLat
    updateLocation(lng, lat)
    onChange(getValue())
  }

  const handleMarkerDragEnd = (event: { lngLat: { lng: number; lat: number } }) => {
    updateLocation(event.lngLat.lng, event.lngLat.lat)
    onChange(getValue())
  }

  const handleSearch = () => {
    search(searchQuery)
  }

  return (
    <div className="relative h-[400px] w-full">
      {/* Search Bar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for a location..."
          className="px-3 py-2 border rounded-md w-64"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          {isSearching ? '...' : 'Search'}
        </button>
      </div>

      {/* Map */}
      <Map
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={accessToken}
        style={{ width: '100%', height: '100%' }}
      >
        <FullscreenControl />
        <NavigationControl />
        <GeolocateControl />
        <Marker
          longitude={markerPosition.longitude}
          latitude={markerPosition.latitude}
          color="#4945ff"
          draggable
          onDragEnd={handleMarkerDragEnd}
        />
      </Map>
    </div>
  )
}
```

### 3. React Native Implementation (`@metravel/map-native`)

```tsx
import { useState } from 'react'
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import { useMapLocation, useGeocodingSearch, MapValue } from '@metravel/map-core'

type MapSelectFieldProps = {
  value?: MapValue
  onChange: (value: MapValue) => void
  accessToken: string
}

export function MapSelectField({ value, onChange, accessToken }: MapSelectFieldProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const {
    viewState,
    setViewState,
    markerPosition,
    updateLocation,
    getValue,
  } = useMapLocation(value)

  const { search, isSearching } = useGeocodingSearch({
    accessToken,
    onResult: (result) => {
      updateLocation(result.longitude, result.latitude, result.address)
      setViewState(prev => ({
        ...prev,
        longitude: result.longitude,
        latitude: result.latitude,
        zoom: 14,
      }))
      onChange(getValue())
    },
  })

  const handleMapPress = (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate
    updateLocation(longitude, latitude)
    onChange(getValue())
  }

  const handleMarkerDragEnd = (event: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = event.nativeEvent.coordinate
    updateLocation(longitude, latitude)
    onChange(getValue())
  }

  // Convert zoom level to react-native-maps delta
  const latitudeDelta = 360 / Math.pow(2, viewState.zoom)
  const longitudeDelta = latitudeDelta

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={() => search(searchQuery)}
          placeholder="Search for a location..."
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => search(searchQuery)}
          disabled={isSearching}
        >
          <Text style={styles.searchButtonText}>
            {isSearching ? '...' : 'Search'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          latitude: viewState.latitude,
          longitude: viewState.longitude,
          latitudeDelta,
          longitudeDelta,
        }}
        onPress={handleMapPress}
      >
        <Marker
          coordinate={{
            latitude: markerPosition.latitude,
            longitude: markerPosition.longitude,
          }}
          draggable
          onDragEnd={handleMarkerDragEnd}
        />
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    width: '100%',
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#4945ff',
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  map: {
    flex: 1,
  },
})
```

### 4. Usage Examples

#### Next.js Form

```tsx
'use client'

import { useState } from 'react'
import { MapSelectField } from '@metravel/map-web'
import { MapValue } from '@metravel/map-core'

export function CreateLocationForm() {
  const [mapValue, setMapValue] = useState<MapValue | undefined>()

  const handleSubmit = async () => {
    if (!mapValue) return

    await fetch('/api/locations', {
      method: 'POST',
      body: JSON.stringify({ data: { mapData: mapValue } }),
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <MapSelectField
        value={mapValue}
        onChange={setMapValue}
        accessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
      />
      <button type="submit">Save Location</button>
    </form>
  )
}
```

#### React Native Form

```tsx
import { useState } from 'react'
import { View, Button } from 'react-native'
import { MapSelectField } from '@metravel/map-native'
import { MapValue } from '@metravel/map-core'
import { strapi } from '@/lib/api'

export function CreateLocationScreen() {
  const [mapValue, setMapValue] = useState<MapValue | undefined>()

  const handleSubmit = async () => {
    if (!mapValue) return

    await strapi.collection('locations').create({ mapData: mapValue })
  }

  return (
    <View>
      <MapSelectField
        value={mapValue}
        onChange={setMapValue}
        accessToken={process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN!}
      />
      <Button title="Save Location" onPress={handleSubmit} />
    </View>
  )
}
```

## Comparison: Approaches

### Option A: Fully Shared Component (Not Recommended)

Using `react-native-web` to run React Native components on web.

| Pros | Cons |
|------|------|
| Single codebase | `react-native-maps` web support is limited |
| Consistent API | Larger bundle size |
| | Missing web-specific features (Mapbox GL) |
| | More complex build setup |

### Option B: Shared Logic, Platform UI (Recommended)

Separate rendering, shared business logic.

| Pros | Cons |
|------|------|
| Best-of-breed maps per platform | Two UI implementations to maintain |
| Optimal bundle size | Slight API differences possible |
| Full feature access | |
| Easier to customize per platform | |

### Option C: Fully Separate Implementations

No shared code between platforms.

| Pros | Cons |
|------|------|
| Maximum flexibility | Code duplication |
| No shared dependencies | Divergent behavior risk |
| | Higher maintenance burden |

## Recommendation

**Use Option B: Shared Logic, Platform-Specific UI**

This approach provides:

1. **Type Safety**: Shared types ensure data consistency
2. **DRY Logic**: Hooks for state and search are reused
3. **Optimal UX**: Native map experience on each platform
4. **Maintainability**: Changes to business logic apply everywhere
5. **Flexibility**: Platform-specific customizations when needed

## File Structure

```
packages/
├── map-core/                 # Shared logic (publishable)
│   ├── src/
│   │   ├── types.ts
│   │   ├── useMapLocation.ts
│   │   ├── useGeocodingSearch.ts
│   │   └── index.ts
│   └── package.json
├── map-web/                  # Next.js components
│   ├── src/
│   │   ├── MapSelectField.tsx
│   │   ├── MapDisplay.tsx    # Read-only display
│   │   └── index.ts
│   └── package.json
└── map-native/               # React Native components
    ├── src/
    │   ├── MapSelectField.tsx
    │   ├── MapDisplay.tsx
    │   └── index.ts
    └── package.json
```

## Next Steps

1. Create `@metravel/map-core` package with shared types and hooks
2. Build `@metravel/map-web` using `react-map-gl`
3. Build `@metravel/map-native` using `react-native-maps` or `@rnmapbox/maps`
4. Add form integration examples for both platforms
5. Consider adding reverse geocoding for marker drag events
