export type MapLocation = {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
  address?: string;
};

export type SearchResult = {
  id: string;
  place_name: string;
  center: [number, number];
  place_type: string[];
};

export type LocationMapProps = {
  location: MapLocation;
  className?: string;
  showMarker?: boolean;
  onMarkerClick?: () => void;
  searchable?: boolean;
  onLocationChange?: (location: MapLocation) => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
};

export type Location = {
  id: number;
  documentId: string;
  name?: string;
  mapData: MapLocation;
};
