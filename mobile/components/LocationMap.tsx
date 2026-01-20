import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';
import { StyleSheet, View } from 'react-native';

// Set your Mapbox access token
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '');

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
  style?: object;
  showMarker?: boolean;
  onMarkerPress?: () => void;
};

export function LocationMap({
  location,
  style,
  showMarker = true,
  onMarkerPress
}: LocationMapProps) {
  return (
    <View style={[styles.container, style]}>
      <MapView style={styles.map}>
        <Camera
          centerCoordinate={[location.longitude, location.latitude]}
          zoomLevel={location.zoom}
          pitch={location.pitch}
          heading={location.bearing}
        />
        {showMarker && (
          <PointAnnotation
            id="location-marker"
            coordinate={[location.longitude, location.latitude]}
            onSelected={onMarkerPress}
          >
            <View style={styles.marker} />
          </PointAnnotation>
        )}
      </MapView>
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4945ff',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
