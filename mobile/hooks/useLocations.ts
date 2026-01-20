import { useQuery } from '@tanstack/react-query'
import { getLocations, getLocationById } from '@/data/loaders'

export function useLocations(page = 1, pageSize = 10) {
  return useQuery({
    queryKey: ['locations', page, pageSize],
    queryFn: () => getLocations({ page, pageSize }),
  })
}

export function useLocation(documentId: string) {
  return useQuery({
    queryKey: ['location', documentId],
    queryFn: () => getLocationById(documentId),
    enabled: !!documentId,
  })
}
