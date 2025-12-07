/**
 * Unit tests for useExams hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useExams } from '../useExams'
import * as api from '../../services/api'

// Mock the API module
vi.mock('../../services/api', () => ({
  fetchExams: vi.fn(),
  getExamSummary: vi.fn(),
  MOCK_EXAMS: [
    {
      id: 'EX-101',
      title: 'Test Exam',
      shortDescription: 'Test description',
      startsAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      endsAt: new Date(Date.now() + 7200000).toISOString(), // 2 hours from now
      durationMin: 60,
      timePerQuestionSec: 30,
      status: 'upcoming',
      attemptsLeft: 2,
      allowedReRecords: 1,
      teacherName: 'Prof. Test',
      pointsTotal: 100,
      thumbnailUrl: null,
      settingsSummary: { strictMode: false },
    },
  ],
}))

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('useExams', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it('should fetch exams on mount', async () => {
    const mockExams = {
      exams: [
        {
          id: 'EX-1',
          title: 'Test Exam 1',
          shortDescription: 'Description',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: new Date(Date.now() + 7200000).toISOString(),
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. X',
          pointsTotal: 100,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
      ],
      page: 1,
      limit: 20,
      total: 1,
    }

    vi.mocked(api.fetchExams).mockResolvedValue(mockExams)

    const { result } = renderHook(() => useExams())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.exams).toHaveLength(1)
    expect(result.current.filteredExams).toHaveLength(1)
    expect(api.fetchExams).toHaveBeenCalledTimes(1)
  })

  it('should filter exams by status', async () => {
    const now = Date.now()
    const mockExams = {
      exams: [
        {
          id: 'EX-1',
          title: 'Live Exam',
          shortDescription: 'Description',
          startsAt: new Date(now - 3600000).toISOString(), // 1 hour ago
          endsAt: new Date(now + 3600000).toISOString(), // 1 hour from now
          durationMin: 120,
          timePerQuestionSec: 60,
          status: 'live' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. X',
          pointsTotal: 100,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
        {
          id: 'EX-2',
          title: 'Upcoming Exam',
          shortDescription: 'Description',
          startsAt: new Date(now + 3600000).toISOString(), // 1 hour from now
          endsAt: new Date(now + 7200000).toISOString(), // 2 hours from now
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. Y',
          pointsTotal: 50,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
      ],
      page: 1,
      limit: 20,
      total: 2,
    }

    vi.mocked(api.fetchExams).mockResolvedValue(mockExams)

    const { result } = renderHook(() => useExams({ initialStatus: 'live' }))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Filter should show only live exams
    const liveExams = result.current.filteredExams.filter(
      (exam) => exam.status === 'live'
    )
    expect(liveExams.length).toBeGreaterThan(0)
  })

  it('should filter exams by search query', async () => {
    const mockExams = {
      exams: [
        {
          id: 'EX-1',
          title: 'Algorithms Exam',
          shortDescription: 'Data structures',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: new Date(Date.now() + 7200000).toISOString(),
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. X',
          pointsTotal: 100,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
        {
          id: 'EX-2',
          title: 'Database Exam',
          shortDescription: 'SQL queries',
          startsAt: new Date(Date.now() + 3600000).toISOString(),
          endsAt: new Date(Date.now() + 7200000).toISOString(),
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. Y',
          pointsTotal: 50,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
      ],
      page: 1,
      limit: 20,
      total: 2,
    }

    vi.mocked(api.fetchExams).mockResolvedValue(mockExams)

    const { result } = renderHook(() => useExams())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Set search query
    result.current.setSearchQuery('Algorithms')

    await waitFor(() => {
      expect(result.current.filteredExams.length).toBe(1)
      expect(result.current.filteredExams[0].title).toContain('Algorithms')
    })
  })

  it('should sort exams by start time', async () => {
    const now = Date.now()
    const mockExams = {
      exams: [
        {
          id: 'EX-2',
          title: 'Later Exam',
          shortDescription: 'Description',
          startsAt: new Date(now + 7200000).toISOString(), // 2 hours from now
          endsAt: new Date(now + 10800000).toISOString(),
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. Y',
          pointsTotal: 50,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
        {
          id: 'EX-1',
          title: 'Earlier Exam',
          shortDescription: 'Description',
          startsAt: new Date(now + 3600000).toISOString(), // 1 hour from now
          endsAt: new Date(now + 7200000).toISOString(),
          durationMin: 60,
          timePerQuestionSec: 30,
          status: 'upcoming' as const,
          attemptsLeft: 1,
          allowedReRecords: 0,
          teacherName: 'Prof. X',
          pointsTotal: 100,
          thumbnailUrl: null,
          settingsSummary: { strictMode: false },
        },
      ],
      page: 1,
      limit: 20,
      total: 2,
    }

    vi.mocked(api.fetchExams).mockResolvedValue(mockExams)

    const { result } = renderHook(() => useExams())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    result.current.setSortOption('startTime')

    await waitFor(() => {
      expect(result.current.filteredExams[0].id).toBe('EX-1')
      expect(result.current.filteredExams[1].id).toBe('EX-2')
    })
  })

  it('should use mock data when API fails', async () => {
    vi.mocked(api.fetchExams).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useExams())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isDemoMode).toBe(true)
    expect(result.current.exams.length).toBeGreaterThan(0)
    expect(result.current.error).toBeTruthy()
  })

  it('should prefetch exam summary', async () => {
    const mockSummary = {
      id: 'EX-1',
      title: 'Test Exam',
      instructions: 'Test instructions',
      timePerQuestionSec: 30,
      durationMin: 60,
      attemptsLeft: 1,
      allowedReRecords: 0,
      strictMode: false,
      otherSettings: {},
    }

    vi.mocked(api.getExamSummary).mockResolvedValue(mockSummary)

    const { result } = renderHook(() => useExams())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await result.current.prefetchExamSummary('EX-1')

    expect(api.getExamSummary).toHaveBeenCalledWith('EX-1')
  })
})





