/**
 * Custom hook for managing exams list with filtering, sorting, search, and polling
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  fetchExams,
  getExamSummary,
  type Exam,
  type ExamsResponse,
  MOCK_EXAMS,
} from '../services/api'
import { getSecondsRemaining } from '../utils/format'
// @ts-ignore - JS file
import { useDebouncedValue } from './useDebouncedValue.js'

export type FilterStatus = 'all' | 'live' | 'upcoming' | 'finished'
export type SortOption = 'startTime' | 'title' | 'deadline'

interface UseExamsOptions {
  initialStatus?: FilterStatus
  autoRefreshInterval?: number // in milliseconds, default 60000 (60s)
}

interface UseExamsReturn {
  exams: Exam[]
  filteredExams: Exam[]
  loading: boolean
  error: string | null
  isDemoMode: boolean
  searchQuery: string
  filterStatus: FilterStatus
  sortOption: SortOption
  setSearchQuery: (query: string) => void
  setFilterStatus: (status: FilterStatus) => void
  setSortOption: (option: SortOption) => void
  refreshExams: () => Promise<void>
  prefetchExamSummary: (examId: string) => Promise<void>
  countdowns: Record<string, number> // examId -> seconds remaining
}

const STORAGE_KEY = 'student_exams_cache'
const STORAGE_FILTER_KEY = 'student_exams_filter_state'

/**
 * Determine exam status based on current time
 */
function getExamStatus(exam: Exam): 'live' | 'upcoming' | 'finished' {
  const now = new Date()
  const start = new Date(exam.startsAt)
  const end = new Date(exam.endsAt)

  if (now < start) return 'upcoming'
  if (now >= start && now < end) return 'live'
  return 'finished'
}


export function useExams(options: UseExamsOptions = {}): UseExamsReturn {
  const { initialStatus = 'all', autoRefreshInterval = 60000 } = options

  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [searchQuery, setSearchQueryState] = useState('')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(initialStatus)
  const [sortOption, setSortOption] = useState<SortOption>('startTime')
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})

  // Debounce search query
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 250)

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  )

  // Load cached filter state from sessionStorage
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_FILTER_KEY)
      if (cached) {
        const { search, filter, sort } = JSON.parse(cached)
        if (search) {
          setSearchQueryState(search)
        }
        if (filter) setFilterStatus(filter)
        if (sort) setSortOption(sort)
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Save filter state to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_FILTER_KEY,
        JSON.stringify({
          search: searchQuery,
          filter: filterStatus,
          sort: sortOption,
        })
      )
    } catch {
      // Ignore storage errors
    }
  }, [searchQuery, filterStatus, sortOption])

  // Load cached exams from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY)
      if (cached) {
        const data = JSON.parse(cached)
        setExams(data.exams || [])
        setIsDemoMode(data.isDemoMode || false)
        setLoading(false)
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // Fetch exams from API
  const refreshExams = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const response: ExamsResponse = await fetchExams({
        status: filterStatus === 'all' ? undefined : filterStatus,
        limit: 100, // Fetch all for client-side filtering
      })

      // Ensure we have exams array
      if (!response || !response.exams) {
        console.error('Invalid API response:', response)
        throw new Error('Invalid API response format')
      }

      // Update status based on current time
      const now = new Date()
      const updatedExams = response.exams.map((exam) => {
        const actualStatus = getExamStatus(exam)
        return { ...exam, status: actualStatus }
      })

      setExams(updatedExams)
      setIsDemoMode(false)

      // Cache in sessionStorage
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            exams: updatedExams,
            isDemoMode: false,
            timestamp: Date.now(),
          })
        )
      } catch {
        // Ignore storage errors
      }
    } catch (err) {
      console.error('API fetch failed:', err)
      // Only use mock data if we have no cached data
      try {
        const cached = sessionStorage.getItem(STORAGE_KEY)
        if (cached) {
          const data = JSON.parse(cached)
          if (data.exams && data.exams.length > 0) {
            setExams(data.exams)
            setIsDemoMode(data.isDemoMode || false)
            setError('Using cached data. Server connection failed.')
            return
          }
        }
      } catch {
        // Ignore cache errors
      }
      
      setExams(MOCK_EXAMS)
      setIsDemoMode(true)
      setError('Unable to connect to server. Showing demo data.')

      // Cache mock data
      try {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            exams: MOCK_EXAMS,
            isDemoMode: true,
            timestamp: Date.now(),
          })
        )
      } catch {
        // Ignore storage errors
      }
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  // Initial fetch
  useEffect(() => {
    refreshExams()
  }, [refreshExams])

  // Auto-refresh for live exams
  useEffect(() => {
    const hasLiveExams = exams.some((exam) => exam.status === 'live')
    if (hasLiveExams && !isDemoMode) {
      refreshIntervalRef.current = setInterval(() => {
        refreshExams()
      }, autoRefreshInterval)

      return () => {
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
        }
      }
    }
  }, [exams, isDemoMode, autoRefreshInterval, refreshExams])

  // Update countdowns for live exams every second
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      const liveExams = exams.filter((exam) => exam.status === 'live')
      const newCountdowns: Record<string, number> = {}
      liveExams.forEach((exam) => {
        newCountdowns[exam.id] = getSecondsRemaining(exam.endsAt)
      })
      setCountdowns(newCountdowns)
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [exams])

  const handleSearchChange = useCallback((query: string) => {
    setSearchQueryState(query)
  }, [])

  // Prefetch exam summary
  const prefetchExamSummary = useCallback(async (examId: string) => {
    try {
      await getExamSummary(examId)
      // Could cache this in a separate store if needed
    } catch (err) {
      // Silently fail - prefetch is optional
      console.debug('Prefetch failed for exam:', examId, err)
    }
  }, [])

  // Filter and sort exams
  const filteredExams = useMemo(() => {
    let result = [...exams]

    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter((exam) => {
        const actualStatus = getExamStatus(exam)
        return actualStatus === filterStatus
      })
    }

    // Apply search filter (using debounced query)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim()
      result = result.filter(
        (exam) =>
          exam.title.toLowerCase().includes(query) ||
          exam.id.toLowerCase().includes(query) ||
          exam.shortDescription.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'startTime':
          return (
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
          )
        case 'deadline':
          return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return result
  }, [exams, filterStatus, debouncedSearchQuery, sortOption])

  return {
    exams,
    filteredExams,
    loading,
    error,
    isDemoMode,
    searchQuery,
    filterStatus,
    sortOption,
    setSearchQuery: handleSearchChange,
    setFilterStatus,
    setSortOption,
    refreshExams,
    prefetchExamSummary,
    countdowns,
  }
}

