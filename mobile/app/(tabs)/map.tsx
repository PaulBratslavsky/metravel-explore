import { useCallback } from 'react'
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { LocationMap } from '@/components/LocationMap'
import { useLocations } from '@/hooks/useLocations'

export default function MapScreen() {
  const { data, isLoading, error, refetch } = useLocations()

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
      <View style={styles.header}>
        <Text style={styles.title}>{firstLocation.name || 'Location'}</Text>
        {firstLocation.mapData.address && (
          <Text style={styles.address}>{firstLocation.mapData.address}</Text>
        )}
      </View>
      <View style={styles.mapContainer}>
        <LocationMap location={firstLocation.mapData} />
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
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
