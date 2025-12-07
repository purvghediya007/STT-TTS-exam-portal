import { useState, useEffect, useCallback } from 'react'
import { fetchStudents, fetchStudentDetails } from '../services/api'

/**
 * Custom hook for managing students list
 */
export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const refreshStudents = useCallback(async (filters = {}) => {
    try {
      setError(null)
      setLoading(true)
      const response = await fetchStudents({ limit: 100, ...filters })
      setStudents(response.students || [])
    } catch (err) {
      console.error('Error fetching students:', err)
      setError('Failed to load students')
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStudents()
  }, [refreshStudents])

  return {
    students,
    loading,
    error,
    refreshStudents
  }
}

/**
 * Custom hook for fetching a single student's details
 */
export function useStudentDetails(studentId) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadStudent = async () => {
      try {
        setError(null)
        setLoading(true)
        const data = await fetchStudentDetails(studentId)
        setStudent(data)
      } catch (err) {
        console.error('Error fetching student details:', err)
        setError('Failed to load student details')
      } finally {
        setLoading(false)
      }
    }

    if (studentId) {
      loadStudent()
    }
  }, [studentId])

  return {
    student,
    loading,
    error
  }
}

