'use client';

import Map, {
  FullscreenControl,
  GeolocateControl,
  Marker,
  NavigationControl,
} from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

export type MapLocation = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  address?: string;
};

type LocationMapProps = {
  location: MapLocation;
  className?: string;
  showMarker?: boolean;
  onMarkerClick?: () => void;
};

export function LocationMap({
  location,
  className,
  showMarker = true,
  onMarkerClick,
}: LocationMapProps) {
  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Map
        initialViewState={{
          longitude: location.longitude,
          latitude: location.latitude,
          zoom: location.zoom,
          pitch: location.pitch,
          bearing: location.bearing,
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        <FullscreenControl />
        <NavigationControl />
        <GeolocateControl />
        {showMarker && (
          <Marker
            longitude={location.longitude}
            latitude={location.latitude}
            color="#4945ff"
            onClick={onMarkerClick}
          />
        )}
      </Map>
    </div>
  );
}
