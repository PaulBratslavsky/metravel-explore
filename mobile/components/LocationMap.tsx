import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

// Set your Mapbox access token
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export type MapLocation = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  address?: string;
};

const DEFAULT_LOCATION: MapLocation = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

const sanitizeLocation = (location: Partial<MapLocation>): MapLocation => ({
  longitude: Number.isFinite(location?.longitude) ? location.longitude! : DEFAULT_LOCATION.longitude,
  latitude: Number.isFinite(location?.latitude) ? location.latitude! : DEFAULT_LOCATION.latitude,
  zoom: Number.isFinite(location?.zoom) ? location.zoom! : DEFAULT_LOCATION.zoom,
  pitch: Number.isFinite(location?.pitch) ? location.pitch! : DEFAULT_LOCATION.pitch,
  bearing: Number.isFinite(location?.bearing) ? location.bearing! : DEFAULT_LOCATION.bearing,
  address: location?.address,
});

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

type LocationMapProps = {
  location: MapLocation;
  style?: object;
  showMarker?: boolean;
  onMarkerPress?: () => void;
  searchable?: boolean;
  onLocationChange?: (location: MapLocation) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export function LocationMap({
  location,
  style,
  showMarker = true,
  onMarkerPress,
  searchable = false,
  onLocationChange,
  onRefresh,
  isRefreshing = false,
}: LocationMapProps) {
  const cameraRef = useRef<Camera>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => sanitizeLocation(location));

  // Sync with prop changes
  useEffect(() => {
    setCurrentLocation(sanitizeLocation(location));
  }, [location]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim() || !MAPBOX_ACCESS_TOKEN) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const encodedQuery = encodeURIComponent(query.trim());
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`
      );
      const data = await response.json();

      if (data.features) {
        setSearchResults(
          data.features.map((feature: any) => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center,
            place_type: feature.place_type,
          }))
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (text.length > 2) {
        searchLocation(text);
      } else {
        setSearchResults([]);
      }
    },
    [searchLocation]
  );

  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      const [longitude, latitude] = result.center;
      const newLocation: MapLocation = {
        longitude,
        latitude,
        zoom: 14,
        pitch: currentLocation.pitch,
        bearing: currentLocation.bearing,
        address: result.place_name,
      };

      setCurrentLocation(newLocation);
      setSearchQuery(result.place_name);
      setSearchResults([]);
      setIsSearchFocused(false);
      Keyboard.dismiss();

      // Animate camera to new location
      cameraRef.current?.setCamera({
        centerCoordinate: [longitude, latitude],
        zoomLevel: 14,
        animationDuration: 1000,
      });

      onLocationChange?.(newLocation);
    },
    [currentLocation.pitch, currentLocation.bearing, onLocationChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  const getPlaceIcon = (placeType: string[]): keyof typeof Ionicons.glyphMap => {
    if (placeType.includes('poi')) return 'location';
    if (placeType.includes('address')) return 'home';
    if (placeType.includes('place') || placeType.includes('locality')) return 'business';
    if (placeType.includes('region') || placeType.includes('country')) return 'globe';
    return 'location-outline';
  };

  return (
    <View style={[styles.container, style]}>
      <MapView style={styles.map}>
        <Camera
          ref={cameraRef}
          centerCoordinate={[currentLocation.longitude, currentLocation.latitude]}
          zoomLevel={currentLocation.zoom}
          pitch={currentLocation.pitch}
          heading={currentLocation.bearing}
        />
        {showMarker && (
          <PointAnnotation
            id="location-marker"
            coordinate={[currentLocation.longitude, currentLocation.latitude]}
            onSelected={onMarkerPress}
          >
            <View style={styles.marker} />
          </PointAnnotation>
        )}
      </MapView>

      {searchable && (
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <BlurView
                intensity={80}
                tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'light'}
                style={styles.searchBarBlur}
              >
                <View style={styles.searchBar}>
                  <Ionicons
                    name="search"
                    size={18}
                    color="#8E8E93"
                    style={styles.searchIcon}
                  />
                  <TextInput
                    style={styles.searchInput}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                    placeholder="Search location"
                    placeholderTextColor="#8E8E93"
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => {
                      // Delay to allow result selection
                      setTimeout(() => setIsSearchFocused(false), 200);
                    }}
                    returnKeyType="search"
                    clearButtonMode="never"
                    autoCorrect={false}
                  />
                  {isSearching && (
                    <ActivityIndicator
                      size="small"
                      color="#007AFF"
                      style={styles.searchSpinner}
                    />
                  )}
                  {searchQuery.length > 0 && !isSearching && (
                    <Pressable
                      onPress={handleClearSearch}
                      hitSlop={8}
                      style={styles.clearButton}
                    >
                      <View style={styles.clearButtonInner}>
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </View>
                    </Pressable>
                  )}
                </View>
              </BlurView>
            </View>

            {onRefresh && (
              <Pressable
                onPress={onRefresh}
                disabled={isRefreshing}
                style={({ pressed }) => [
                  styles.refreshButton,
                  pressed && styles.refreshButtonPressed,
                  isRefreshing && styles.refreshButtonRefreshing,
                ]}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={20} color="#fff" />
                )}
              </Pressable>
            )}
          </View>

          {isSearchFocused && searchResults.length > 0 && (
            <BlurView
              intensity={90}
              tint={Platform.OS === 'ios' ? 'systemChromeMaterial' : 'light'}
              style={styles.resultsContainer}
            >
              {searchResults.map((result, index) => (
                <Pressable
                  key={result.id}
                  style={({ pressed }) => [
                    styles.resultItem,
                    pressed && styles.resultItemPressed,
                    index < searchResults.length - 1 && styles.resultItemBorder,
                  ]}
                  onPress={() => handleSelectResult(result)}
                >
                  <View style={styles.resultIconContainer}>
                    <Ionicons
                      name={getPlaceIcon(result.place_type)}
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultText} numberOfLines={1}>
                      {result.place_name.split(',')[0]}
                    </Text>
                    <Text style={styles.resultSubtext} numberOfLines={1}>
                      {result.place_name.split(',').slice(1).join(',').trim()}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </BlurView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchBarBlur: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#4945ff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshButtonPressed: {
    backgroundColor: '#3832e0',
    transform: [{ scale: 0.95 }],
  },
  refreshButtonRefreshing: {
    backgroundColor: '#6c63ff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    color: '#000000',
    paddingVertical: 0,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#8E8E93',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultsContainer: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  resultItemPressed: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(60, 60, 67, 0.12)',
  },
  resultIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultText: {
    fontSize: 17,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 2,
  },
  resultSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
