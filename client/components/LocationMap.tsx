'use client';

import Map, {
  FullscreenControl,
  GeolocateControl,
  Marker,
  NavigationControl,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useCallback, useRef } from 'react';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export type MapLocation = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  address?: string;
};

type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

type LocationMapProps = {
  location: MapLocation;
  className?: string;
  showMarker?: boolean;
  onMarkerClick?: () => void;
  searchable?: boolean;
  onLocationChange?: (location: MapLocation) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
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

const getPlaceIcon = (placeType: string[]) => {
  if (placeType.includes('poi')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    );
  }
  if (placeType.includes('address')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    );
  }
  if (placeType.includes('place') || placeType.includes('locality')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
      </svg>
    );
  }
  if (placeType.includes('region') || placeType.includes('country')) {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  );
};

export function LocationMap({
  location,
  className,
  showMarker = true,
  onMarkerClick,
  searchable = false,
  onLocationChange,
  onRefresh,
  isRefreshing = false,
}: LocationMapProps) {
  const mapRef = useRef<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [currentLocation, setCurrentLocation] = useState(() => sanitizeLocation(location));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    setCurrentLocation(sanitizeLocation(location));
  }, [location]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length <= 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const encodedQuery = encodeURIComponent(searchQuery.trim());
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&limit=5`
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
        } else {
          setSearchResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

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

      // Fly to location
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
  }, []);

  return (
    <div
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {searchable && (
        <div style={styles.searchContainer}>
          <div style={styles.searchRow}>
            <div style={styles.searchWrapper}>
              <div style={styles.searchInputContainer}>
                <div style={styles.searchIcon}>
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
                  }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search for a location..."
                  style={styles.searchInput}
                />
                {isSearching && (
                  <div style={styles.spinner}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                    </svg>
                  </div>
                )}
                {searchQuery && !isSearching && (
                  <button onClick={handleClear} style={styles.clearButton} type="button">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                  </button>
                )}
              </div>

              {showResults && searchQuery.length > 2 && (
                <div style={styles.resultsDropdown}>
                  {searchResults.length > 0 ? (
                    searchResults.map((result) => {
                      const [title, ...rest] = result.place_name.split(',');
                      const subtitle = rest.join(',').trim();
                      return (
                        <button
                          key={result.id}
                          onClick={() => handleSelectResult(result)}
                          style={styles.resultItem}
                          type="button"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f6f6f9';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <div style={styles.resultIcon}>{getPlaceIcon(result.place_type)}</div>
                          <div style={styles.resultTextContainer}>
                            <div style={styles.resultTitle}>{title}</div>
                            {subtitle && <div style={styles.resultSubtitle}>{subtitle}</div>}
                          </div>
                        </button>
                      );
                    })
                  ) : !isSearching ? (
                    <div style={styles.noResults}>No results found</div>
                  ) : null}
                </div>
              )}
            </div>

            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                style={{
                  ...styles.refreshButton,
                  ...(isRefreshing ? styles.refreshButtonRefreshing : {}),
                }}
                type="button"
              >
                {isRefreshing ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
          longitude: currentLocation.longitude,
          latitude: currentLocation.latitude,
          zoom: currentLocation.zoom,
          pitch: currentLocation.pitch,
          bearing: currentLocation.bearing,
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

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  searchContainer: {
    position: 'absolute',
    top: '1rem',
    left: '1rem',
    right: '1rem',
    zIndex: 10,
  },
  searchRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  },
  searchWrapper: {
    position: 'relative',
    flex: 1,
    maxWidth: '350px',
  },
  refreshButton: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    backgroundColor: '#4945ff',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
  refreshButtonRefreshing: {
    backgroundColor: '#6c63ff',
  },
  searchInputContainer: {
    display: 'flex',
    alignItems: 'center',
    background: 'white',
    border: '1px solid #dcdce4',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  searchIcon: {
    padding: '0 12px',
    color: '#8e8e93',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    padding: '12px 0',
    border: 'none',
    fontSize: '14px',
    outline: 'none',
    background: 'transparent',
  },
  spinner: {
    padding: '8px 12px',
    color: '#4945ff',
    display: 'flex',
    alignItems: 'center',
  },
  clearButton: {
    padding: '8px 12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#8e8e93',
    display: 'flex',
    alignItems: 'center',
  },
  resultsDropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'white',
    border: '1px solid #dcdce4',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  resultItem: {
    width: '100%',
    padding: '12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid #f0f0f0',
    cursor: 'pointer',
    textAlign: 'left',
  },
  resultIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    backgroundColor: 'rgba(73, 69, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: '#4945ff',
  },
  resultTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  resultTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#32324d',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resultSubtitle: {
    fontSize: '12px',
    color: '#8e8e93',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: '2px',
  },
  noResults: {
    padding: '16px',
    textAlign: 'center',
    color: '#8e8e93',
    fontSize: '14px',
  },
};
