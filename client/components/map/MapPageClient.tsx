'use client';

import { useState, useCallback, useTransition, useMemo } from 'react';
import { LocationMap } from './LocationMap';
import { Location, MapMarker, MapLocation } from './types';

// Default map view (US center)
const DEFAULT_VIEW: MapLocation = {
  longitude: -98.5795,
  latitude: 39.8283,
  zoom: 3,
  pitch: 0,
  bearing: 0,
};

type MapPageClientProps = {
  initialLocations: Location[];
  onRefetch: () => Promise<Location[]>;
};

export function MapPageClient({ initialLocations, onRefetch }: Readonly<MapPageClientProps>) {
  const [locations, setLocations] = useState(initialLocations);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isPending, startTransition] = useTransition();

  const mapMarkers: MapMarker[] = useMemo(() => {
    return locations.map((loc) => ({
      id: loc.documentId,
      longitude: loc.mapData.longitude,
      latitude: loc.mapData.latitude,
      name: loc.name ? String(loc.name) : 'Unnamed Location',
      address: loc.mapData.address,
    }));
  }, [locations]);

  // Calculate center point from all locations
  const mapCenter: MapLocation = useMemo(() => {
    if (locations.length === 0) return DEFAULT_VIEW;

    if (locations.length === 1) {
      return locations[0].mapData;
    }

    // Calculate bounding box center
    const lngs = locations.map((l) => l.mapData.longitude);
    const lats = locations.map((l) => l.mapData.latitude);
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

    // Calculate zoom based on spread
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const maxSpread = Math.max(lngSpread, latSpread);
    const zoom = maxSpread > 10 ? 4 : maxSpread > 5 ? 6 : maxSpread > 1 ? 8 : 10;

    return {
      longitude: centerLng,
      latitude: centerLat,
      zoom,
      pitch: 0,
      bearing: 0,
    };
  }, [locations]);

  const handleMarkerSelect = useCallback((marker: MapMarker) => {
    const location = locations.find((loc) => loc.documentId === marker.id);
    if (location) {
      setSelectedLocation(location);
    }
  }, [locations]);

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      const newLocations = await onRefetch();
      setLocations(newLocations);
      setSelectedLocation(null);
    });
  }, [onRefetch]);

  return (
    <div className="relative min-h-screen">
      <LocationMap
        location={mapCenter}
        showMarker={false}
        searchable
        onRefresh={handleRefresh}
        isRefreshing={isPending}
        markers={mapMarkers}
        onMarkerSelect={handleMarkerSelect}
      />

      {/* Location count badge */}
      <div className="absolute top-4 right-4 z-10 bg-black/70 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
        {locations.length} location{locations.length !== 1 ? 's' : ''}
      </div>

      {/* Selected Location Info Overlay */}
      {selectedLocation && (
        <div className="absolute bottom-14 left-4 right-4 z-10 rounded-xl bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:bg-black/90">
          <button
            onClick={() => setSelectedLocation(null)}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
          <h1 className="truncate text-lg font-semibold text-black dark:text-white pr-8">
            {selectedLocation.name ? String(selectedLocation.name) : 'Unnamed Location'}
          </h1>
          {selectedLocation.mapData.address && (
            <p className="mt-1 truncate text-sm text-gray-600 dark:text-gray-400">
              {selectedLocation.mapData.address}
            </p>
          )}
        </div>
      )}

      {/* Empty state */}
      {locations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 text-center shadow-lg">
            <p className="text-lg font-semibold text-gray-900 dark:text-white">No locations found</p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Add locations in Strapi to see them on the map
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
