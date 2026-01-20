import * as qs from 'qs'

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type QueryOptions = {
  populate?: object | string | boolean
  filters?: object
  sort?: string | string[]
  pagination?: {
    page?: number
    pageSize?: number
    limit?: number
    start?: number
  }
  fields?: string[]
  publicationState?: 'live' | 'preview'
  locale?: string | string[]
}

export type StrapiError = {
  status: number
  name: string
  message: string
  details?: unknown
}

export type StrapiMeta = {
  pagination?: {
    page: number
    pageSize: number
    pageCount: number
    total: number
  }
}

export type StrapiResponse<T> = {
  data: T
  meta?: StrapiMeta
}

const BASE_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://localhost:1337'

function buildUrl(endpoint: string, options?: QueryOptions): string {
  const url = new URL(`/api/${endpoint}`, BASE_URL)
  if (options) {
    url.search = qs.stringify(options, {
      encodeValuesOnly: true,
      encoder: (str, defaultEncoder, charset, type) => {
        const encoded = defaultEncoder(str, defaultEncoder, charset)
        return type === 'value' ? encoded.replaceAll('%3A', ':').replaceAll('%2A', '*') : encoded
      },
    })
  }
  return url.toString()
}

type RequestOptions = {
  authToken?: string
  signal?: AbortSignal
}

async function request<T>(
  url: string,
  method: HTTPMethod,
  options?: RequestOptions & { body?: unknown }
): Promise<StrapiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (options?.authToken) {
    headers['Authorization'] = `Bearer ${options.authToken}`
  }

  const response = await fetch(url, {
    method,
    headers,
    body: method !== 'GET' && method !== 'DELETE' && options?.body
      ? JSON.stringify(options.body)
      : undefined,
    signal: options?.signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const error: StrapiError = errorData.error ?? {
      status: response.status,
      name: 'Error',
      message: response.statusText || 'An error occurred',
    }
    throw error
  }

  if (method === 'DELETE') {
    return { data: true as T }
  }

  const json = await response.json()
  return {
    data: json.data ?? json,
    meta: json.meta,
  }
}

const api = {
  get: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, 'GET', options),

  post: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, 'POST', { ...options, body }),

  put: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, 'PUT', { ...options, body }),

  patch: <T>(url: string, body: unknown, options?: RequestOptions) =>
    request<T>(url, 'PATCH', { ...options, body }),

  delete: <T>(url: string, options?: RequestOptions) =>
    request<T>(url, 'DELETE', options),
}

function collection(pluralApiId: string) {
  return {
    find: <T>(query?: QueryOptions, options?: RequestOptions) =>
      api.get<T[]>(buildUrl(pluralApiId, query), options),

    findOne: <T>(documentId: string, query?: QueryOptions, options?: RequestOptions) =>
      api.get<T>(buildUrl(`${pluralApiId}/${documentId}`, query), options),

    create: <T>(data: unknown, options?: RequestOptions) =>
      api.post<T>(buildUrl(pluralApiId), { data }, options),

    update: <T>(documentId: string, data: unknown, options?: RequestOptions) =>
      api.put<T>(buildUrl(`${pluralApiId}/${documentId}`), { data }, options),

    delete: <T>(documentId: string, options?: RequestOptions) =>
      api.delete<T>(buildUrl(`${pluralApiId}/${documentId}`), options),
  }
}

function single(singularApiId: string) {
  return {
    find: <T>(query?: QueryOptions, options?: RequestOptions) =>
      api.get<T>(buildUrl(singularApiId, query), options),

    update: <T>(data: unknown, options?: RequestOptions) =>
      api.put<T>(buildUrl(singularApiId), { data }, options),

    delete: <T>(options?: RequestOptions) =>
      api.delete<T>(buildUrl(singularApiId), options),
  }
}

export const strapi = {
  collection,
  single,
  api,
}
