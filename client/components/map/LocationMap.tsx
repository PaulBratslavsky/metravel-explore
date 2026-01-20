'use client';

import Map, {
  FullscreenControl,
  GeolocateControl,
  Marker,
  NavigationControl,
  MapRef,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useClickOutside, useDebouncedValue } from '@/hooks';
import { MapLocation, SearchResult, LocationMapProps } from './types';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

const DEFAULT_LOCATION: MapLocation = {
  longitude: -122.4194,
  latitude: 37.7749,
  zoom: 12,
  pitch: 0,
  bearing: 0,
};

const PLACE_ICONS: Record<string, React.ReactNode> = {
  poi: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ),
  address: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ),
  place: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
    </svg>
  ),
  region: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    </svg>
  ),
  default: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ),
};

const getPlaceIcon = (placeType: string[]) => {
  if (placeType.includes('poi')) return PLACE_ICONS.poi;
  if (placeType.includes('address')) return PLACE_ICONS.address;
  if (placeType.includes('place') || placeType.includes('locality')) return PLACE_ICONS.place;
  if (placeType.includes('region') || placeType.includes('country')) return PLACE_ICONS.region;
  return PLACE_ICONS.default;
};

const sanitizeLocation = (location: Partial<MapLocation>): MapLocation => ({
  longitude: Number.isFinite(location?.longitude) ? location.longitude! : DEFAULT_LOCATION.longitude,
  latitude: Number.isFinite(location?.latitude) ? location.latitude! : DEFAULT_LOCATION.latitude,
  zoom: Number.isFinite(location?.zoom) ? location.zoom! : DEFAULT_LOCATION.zoom,
  pitch: Number.isFinite(location?.pitch) ? location.pitch! : DEFAULT_LOCATION.pitch,
  bearing: Number.isFinite(location?.bearing) ? location.bearing! : DEFAULT_LOCATION.bearing,
  address: location?.address,
});

export function LocationMap({
  location,
  className,
  showMarker = true,
  onMarkerClick,
  searchable = false,
  onLocationChange,
  onRefresh,
  isRefreshing = false,
}: Readonly<LocationMapProps>) {
  const mapRef = useRef<MapRef>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [currentLocation, setCurrentLocation] = useState(() => sanitizeLocation(location));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  useClickOutside(
    searchContainerRef,
    () => {
      setShowResults(false);
      setSelectedIndex(-1);
    },
    showResults
  );

  useEffect(() => {
    if (debouncedSearchQuery.trim().length <= 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const controller = new AbortController();

    async function search() {
      setIsSearching(true);
      setSearchError(null);

      try {
        const encodedQuery = encodeURIComponent(debouncedSearchQuery.trim());
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&limit=5`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();

        if (data.features) {
          setSearchResults(
            data.features.map((feature: SearchResult) => ({
              id: feature.id,
              place_name: feature.place_name,
              center: feature.center,
              place_type: feature.place_type,
            }))
          );
          setSelectedIndex(-1);
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Search error:', error);
          setSearchError('Failed to search. Please try again.');
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }

    search();

    return () => controller.abort();
  }, [debouncedSearchQuery]);

  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

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
      setSearchQuery(result.place_name.split(',')[0]);
      setSearchResults([]);
      setShowResults(false);
      setSelectedIndex(-1);

      mapRef.current?.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        duration: 1000,
      });

      onLocationChange?.(newLocation);
    },
    [currentLocation.pitch, currentLocation.bearing, onLocationChange]
  );

  const handleClear = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setSearchError(null);
    setSelectedIndex(-1);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setShowResults(false);
        setSelectedIndex(-1);
        return;
      }

      if (!showResults || searchResults.length === 0) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
          break;
        case 'Enter':
          event.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
            handleSelectResult(searchResults[selectedIndex]);
          }
          break;
      }
    },
    [showResults, searchResults, selectedIndex, handleSelectResult]
  );

  const renderSearchResults = () => {
    if (searchError) {
      return (
        <div className="p-4 text-center text-red-500 text-sm" role="alert">
          {searchError}
        </div>
      );
    }

    if (searchResults.length > 0) {
      return searchResults.map((result, index) => {
        const [title, ...rest] = result.place_name.split(',');
        const subtitle = rest.join(',').trim();
        const isSelected = index === selectedIndex;
        return (
          <button
            key={result.id}
            onClick={() => handleSelectResult(result)}
            className={`w-full p-3 flex items-start gap-3 bg-transparent border-none border-b border-gray-100 cursor-pointer text-left last:border-b-0 hover:bg-gray-50 ${
              isSelected ? 'bg-gray-100' : ''
            }`}
            type="button"
            role="option"
            aria-selected={isSelected}
          >
            <div className="w-8 h-8 rounded-md bg-indigo-600/10 flex items-center justify-center shrink-0 text-indigo-600">
              {getPlaceIcon(result.place_type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 whitespace-nowrap overflow-hidden text-ellipsis">
                {title}
              </div>
              {subtitle && (
                <div className="text-xs text-gray-400 whitespace-nowrap overflow-hidden text-ellipsis mt-0.5">
                  {subtitle}
                </div>
              )}
            </div>
          </button>
        );
      });
    }

    if (!isSearching) {
      return <div className="p-4 text-center text-gray-400 text-sm">No results found</div>;
    }

    return null;
  };

  const safeLocation = sanitizeLocation(location);

  return (
    <div className={`absolute inset-0 flex flex-col ${className || ''}`}>
      {searchable && (
        <div className="absolute top-4 left-4 right-4 z-10" ref={searchContainerRef}>
          <div className="flex items-start gap-2">
            <div className="relative flex-1 max-w-sm">
              <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden shadow-md focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20">
                <div className="px-3 text-gray-400 flex items-center" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowResults(true);
                    setSelectedIndex(-1);
                  }}
                  onFocus={() => setShowResults(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search for a location..."
                  className="flex-1 py-3 border-none text-sm outline-none bg-transparent placeholder:text-gray-400"
                  aria-label="Search for a location"
                  aria-expanded={showResults && searchQuery.length > 2}
                  aria-controls="search-results"
                  aria-activedescendant={selectedIndex >= 0 ? `result-${selectedIndex}` : undefined}
                  role="combobox"
                  aria-autocomplete="list"
                />
                {isSearching && (
                  <div className="px-3 py-2 text-indigo-600 flex items-center" aria-live="polite">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="animate-spin"
                      aria-hidden="true"
                    >
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                    </svg>
                    <span className="sr-only">Searching...</span>
                  </div>
                )}
                {searchQuery && !isSearching && (
                  <button
                    onClick={handleClear}
                    className="px-3 py-2 bg-transparent border-none cursor-pointer text-gray-400 flex items-center hover:text-gray-600"
                    type="button"
                    aria-label="Clear search"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>

              {showResults && searchQuery.length > 2 && (
                <div
                  id="search-results"
                  ref={resultsRef}
                  className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-300 rounded-lg shadow-lg max-h-72 overflow-y-auto"
                  role="listbox"
                  aria-label="Search results"
                >
                  {renderSearchResults()}
                </div>
              )}
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className={`w-11 h-11 rounded-lg border-none cursor-pointer flex items-center justify-center text-white shadow-md transition-all shrink-0 hover:bg-indigo-700 disabled:cursor-not-allowed active:scale-95 ${
                  isRefreshing ? 'bg-indigo-400' : 'bg-indigo-600'
                }`}
                type="button"
                aria-label={isRefreshing ? 'Refreshing...' : 'Refresh to original location'}
              >
                {isRefreshing ? (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="animate-spin"
                    aria-hidden="true"
                  >
                    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                  </svg>
                ) : (
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: safeLocation.longitude,
          latitude: safeLocation.latitude,
          zoom: safeLocation.zoom,
          pitch: safeLocation.pitch,
          bearing: safeLocation.bearing,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%', flex: 1 }}
      >
        <FullscreenControl />
        <NavigationControl />
        <GeolocateControl />
        {showMarker && (
          <Marker
            longitude={currentLocation.longitude}
            latitude={currentLocation.latitude}
            color="#4945ff"
            onClick={onMarkerClick}
          />
        )}
      </Map>
    </div>
  );
}
