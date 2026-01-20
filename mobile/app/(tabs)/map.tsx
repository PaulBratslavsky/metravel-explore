import { useCallback, useState } from 'react'
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { LocationMap } from '@/components/LocationMap'
import { useLocations } from '@/hooks/useLocations'

export default function MapScreen() {
  const { data, isLoading, error, refetch } = useLocations()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mapKey, setMapKey] = useState(0)

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await refetch()
    setMapKey((prev) => prev + 1) // Force LocationMap to remount and reset state
    setIsRefreshing(false)
  }, [refetch])

  // Refetch when tab comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4945ff" />
        <Text style={styles.loadingText}>Loading locations...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Error loading locations</Text>
        <Text style={styles.errorDetail}>{error.message}</Text>
      </View>
    )
  }

  const locations = data?.data
  const firstLocation = locations?.[0]

  if (!firstLocation?.mapData) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>No locations found</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        <LocationMap
          key={mapKey}
          location={firstLocation.mapData}
          searchable
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />

        {/* Location Info Overlay */}
        <View style={styles.infoOverlay}>
          <Text style={styles.title} numberOfLines={1}>{firstLocation.name || 'Location'}</Text>
          {firstLocation.mapData.address && (
            <Text style={styles.address} numberOfLines={1}>{firstLocation.mapData.address}</Text>
          )}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mapContainer: {
    flex: 1,
  },
  infoOverlay: {
    position: 'absolute',
    bottom: 56,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e53e3e',
  },
  errorDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
})
