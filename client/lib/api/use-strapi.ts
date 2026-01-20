'use client'

import { useCallback, useEffect, useState } from 'react'
import { strapi, QueryOptions, StrapiError } from './client'

type UseQueryState<T> = {
  data: T | null
  isLoading: boolean
  isError: boolean
  error: StrapiError | null
}

type UseQueryOptions = {
  enabled?: boolean
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
}

export function useCollection<T>(
  pluralApiId: string,
  query?: QueryOptions,
  options: UseQueryOptions = {}
) {
  const { enabled = true, revalidateOnFocus = true, revalidateOnReconnect = true } = options
  const [state, setState] = useState<UseQueryState<T[]>>({
    data: null,
    isLoading: enabled,
    isError: false,
    error: null,
  })

  const queryKey = JSON.stringify({ pluralApiId, query })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }))
    try {
      const response = await strapi.collection(pluralApiId).find<T>(query)
      setState({ data: response.data, isLoading: false, isError: false, error: null })
    } catch (e) {
      const error = e as StrapiError
      setState({ data: null, isLoading: false, isError: true, error })
    }
  }, [pluralApiId, queryKey])

  const refetch = useCallback(() => {
    if (enabled) fetchData()
  }, [enabled, fetchData])

  useEffect(() => {
    if (enabled) fetchData()
  }, [enabled, fetchData])

  useEffect(() => {
    if (!revalidateOnFocus) return
    const onFocus = () => refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [revalidateOnFocus, refetch])

  useEffect(() => {
    if (!revalidateOnReconnect) return
    const onOnline = () => refetch()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [revalidateOnReconnect, refetch])

  return { ...state, refetch }
}

export function useSingle<T>(
  singularApiId: string,
  query?: QueryOptions,
  options: UseQueryOptions = {}
) {
  const { enabled = true, revalidateOnFocus = true, revalidateOnReconnect = true } = options
  const [state, setState] = useState<UseQueryState<T>>({
    data: null,
    isLoading: enabled,
    isError: false,
    error: null,
  })

  const queryKey = JSON.stringify({ singularApiId, query })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }))
    try {
      const response = await strapi.single(singularApiId).find<T>(query)
      setState({ data: response.data, isLoading: false, isError: false, error: null })
    } catch (e) {
      const error = e as StrapiError
      setState({ data: null, isLoading: false, isError: true, error })
    }
  }, [singularApiId, queryKey])

  const refetch = useCallback(() => {
    if (enabled) fetchData()
  }, [enabled, fetchData])

  useEffect(() => {
    if (enabled) fetchData()
  }, [enabled, fetchData])

  useEffect(() => {
    if (!revalidateOnFocus) return
    const onFocus = () => refetch()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [revalidateOnFocus, refetch])

  useEffect(() => {
    if (!revalidateOnReconnect) return
    const onOnline = () => refetch()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [revalidateOnReconnect, refetch])

  return { ...state, refetch }
}

type MutationState<T> = {
  data: T | null
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: StrapiError | null
}

type MutationCallbacks<T> = {
  onSuccess?: (data: T) => void
  onError?: (error: StrapiError) => void
}

export function useCreate<T, P = Record<string, unknown>>(
  pluralApiId: string,
  callbacks?: MutationCallbacks<T>
) {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
  })

  const mutate = useCallback(async (data: P) => {
    setState({ data: null, isLoading: true, isError: false, isSuccess: false, error: null })
    try {
      const response = await strapi.collection(pluralApiId).create<T>(data)
      setState({ data: response.data, isLoading: false, isError: false, isSuccess: true, error: null })
      callbacks?.onSuccess?.(response.data)
      return response
    } catch (e) {
      const error = e as StrapiError
      setState({ data: null, isLoading: false, isError: true, isSuccess: false, error })
      callbacks?.onError?.(error)
      throw error
    }
  }, [pluralApiId, callbacks])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, isError: false, isSuccess: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}

export function useUpdate<T, P = Record<string, unknown>>(
  pluralApiId: string,
  callbacks?: MutationCallbacks<T>
) {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
  })

  const mutate = useCallback(async (documentId: string, data: P) => {
    setState({ data: null, isLoading: true, isError: false, isSuccess: false, error: null })
    try {
      const response = await strapi.collection(pluralApiId).update<T>(documentId, data)
      setState({ data: response.data, isLoading: false, isError: false, isSuccess: true, error: null })
      callbacks?.onSuccess?.(response.data)
      return response
    } catch (e) {
      const error = e as StrapiError
      setState({ data: null, isLoading: false, isError: true, isSuccess: false, error })
      callbacks?.onError?.(error)
      throw error
    }
  }, [pluralApiId, callbacks])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, isError: false, isSuccess: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}

export function useDelete<T = boolean>(
  pluralApiId: string,
  callbacks?: MutationCallbacks<T>
) {
  const [state, setState] = useState<MutationState<T>>({
    data: null,
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null,
  })

  const mutate = useCallback(async (documentId: string) => {
    setState({ data: null, isLoading: true, isError: false, isSuccess: false, error: null })
    try {
      const response = await strapi.collection(pluralApiId).delete<T>(documentId)
      setState({ data: response.data, isLoading: false, isError: false, isSuccess: true, error: null })
      callbacks?.onSuccess?.(response.data)
      return response
    } catch (e) {
      const error = e as StrapiError
      setState({ data: null, isLoading: false, isError: true, isSuccess: false, error })
      callbacks?.onError?.(error)
      throw error
    }
  }, [pluralApiId, callbacks])

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, isError: false, isSuccess: false, error: null })
  }, [])

  return { ...state, mutate, reset }
}
