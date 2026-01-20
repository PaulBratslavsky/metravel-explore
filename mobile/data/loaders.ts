import { strapi } from '@/lib/api'
import type { Location, TStrapiResponse } from '@/types'

const PAGE_SIZE = 10

// Locations (Collection Type)
const locations = strapi.collection('locations')

export interface GetLocationsParams {
  page?: number
  pageSize?: number
}

export async function getLocations(
  params?: GetLocationsParams
): Promise<TStrapiResponse<Location[]>> {
  const { page = 1, pageSize = PAGE_SIZE } = params || {}

  const response = await locations.find<Location>({
    sort: ['createdAt:desc'],
    pagination: {
      page,
      pageSize,
    },
    populate: '*',
  })

  return response
}

export async function getLocationById(
  documentId: string
): Promise<TStrapiResponse<Location>> {
  const response = await locations.findOne<Location>(documentId, {
    populate: '*',
  })

  return response
}
