import { useState, useEffect, useCallback } from 'react'
import { fetchFacultyExams, fetchFacultyStats, deleteExam } from '../services/api'

/**
 * Custom hook for managing faculty exams
 */
export function useFacultyExams() {
  const [exams, setExams] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshExams = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetchFacultyExams({ status: 'all', limit: 100 })
      setExams(response.exams || [])
    } catch (err) {
      console.error('Error fetching faculty exams:', err)
      setError('Failed to load exams')
      // Try to load from localStorage as fallback
      try {
        const storedExams = localStorage.getItem('faculty_exams')
        if (storedExams) {
          setExams(JSON.parse(storedExams))
          setError(null)
        } else {
          setExams([])
        }
      } catch {
        setExams([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const data = await fetchFacultyStats()
      setStats(data)
    } catch (err) {
      console.error('Error fetching faculty stats:', err)
    }
  }, [])

  const handleDeleteExam = useCallback(async (examId) => {
    try {
      await deleteExam(examId)
      setExams(prev => prev.filter(ex => ex.id !== examId))
      await refreshStats()
    } catch (err) {
      console.error('Error deleting exam:', err)
      throw err
    }
  }, [refreshStats])

  useEffect(() => {
    refreshExams()
    refreshStats()
  }, [refreshExams, refreshStats])

  return {
    exams,
    stats,
    loading,
    error,
    refreshExams,
    refreshStats,
    deleteExam: handleDeleteExam
  }
}

