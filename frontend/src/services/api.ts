/**
 * API service layer for student exams
 * TODO: Replace getAuthHeaders() with your actual auth implementation
 * TODO: Update API_BASE_URL to your FastAPI backend URL
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Get authentication headers
 * TODO: Implement this based on your auth system (JWT, session, etc.)
 */
function getAuthHeaders(): HeadersInit {
  // Placeholder - replace with actual auth token retrieval
  // Example: const token = authContext.getToken() or localStorage.getItem('token')
  const token = localStorage.getItem('auth_token') || ''
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE_URL}${endpoint}`
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = {
          error: 'unknown',
          message: `HTTP ${response.status}: ${response.statusText}`,
        }
      }
      const error = { status: response.status, ...errorData }
      console.error('API error:', url, error)
      throw error
    }

    return response
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Network error - server may not be running:', url)
      throw new Error('Unable to connect to server. Please ensure the server is running.')
    }
    throw error
  }
}

/**
 * Exam data types
 */
export interface Exam {
  id: string
  title: string
  shortDescription: string
  startsAt: string
  endsAt: string
  durationMin: number
  timePerQuestionSec: number | null
  status: 'live' | 'upcoming' | 'finished'
  attemptsLeft: number
  allowedReRecords: number
  teacherName: string
  pointsTotal: number
  questions?: Question[]
  thumbnailUrl: string | null
  settingsSummary: {
    strictMode: boolean
    [key: string]: unknown
  }
}

export interface ExamsResponse {
  exams: Exam[]
  page: number
  limit: number
  total: number
}

export interface ExamSummary {
  id: string
  title: string
  instructions: string
  timePerQuestionSec: number | null
  durationMin: number
  attemptsLeft: number
  allowedReRecords: number
  strictMode: boolean
  otherSettings: Record<string, unknown>
}

export interface StartExamResponse {
  attemptId: string
  expiresAt: string
  firstQuestionId: string
}

export interface StartExamError {
  error: string
  message: string
}

/**
 * Fetch exams list with filters
 */
export async function fetchExams(params: {
  status?: 'all' | 'live' | 'upcoming' | 'finished'
  page?: number
  limit?: number
}): Promise<ExamsResponse> {
  const queryParams = new URLSearchParams()
  if (params.status && params.status !== 'all') {
    queryParams.append('status', params.status)
  }
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())

  try {
    const response = await fetchAPI(`/student/exams?${queryParams}`)
    const data = await response.json()
    
    // Ensure response has the expected structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format')
    }
    
    return {
      exams: Array.isArray(data.exams) ? data.exams : [],
      page: data.page || 1,
      limit: data.limit || 100,
      total: data.total || 0
    }
  } catch (error) {
    console.error('Error fetching exams:', error)
    throw error
  }
}

/**
 * Fetch exam summary (for prefetching)
 */
export async function getExamSummary(examId: string): Promise<ExamSummary> {
  const response = await fetchAPI(`/student/exams/${examId}/summary`)
  return response.json()
}

/**
 * Start an exam attempt
 */
export async function startExam(
  examId: string
): Promise<StartExamResponse> {
  const response = await fetchAPI(`/student/exams/${examId}/start`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  return response.json()
}

/**
 * Fetch exam questions
 */
export async function fetchExamQuestions(examId: string): Promise<{
  questions: Question[]
  totalQuestions: number
  pointsTotal: number
}> {
  const response = await fetchAPI(`/student/exams/${examId}/questions`)
  return response.json()
}

/**
 * Submit exam answers
 */
export async function submitExam(
  examId: string,
  data: {
    answers: Record<string, number | string>
    attemptId: string
    startedAt: string
    timeSpent: number
    studentId: string
    mediaAnswers?: Record<string, string>
  }
): Promise<{
  submissionId: string
  score: number
  maxScore: number
  percentage: number
}>{
  const response = await fetchAPI(`/student/exams/${examId}/submit`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return response.json()
}

/**
 * Mock data fallback when API fails
 */
export const MOCK_EXAMS: Exam[] = [
  {
    id: 'EX-101',
    title: 'Intro to Algorithms - Midterm',
    shortDescription: 'Data structures, complexity, and basic algorithms.',
    startsAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    endsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString(), // 90 min from now
    durationMin: 120,
    timePerQuestionSec: 60,
    status: 'live',
    attemptsLeft: 1,
    allowedReRecords: 1,
    teacherName: 'Prof. X',
    pointsTotal: 100,
    thumbnailUrl: null,
    settingsSummary: { strictMode: false },
  },
  {
    id: 'EX-102',
    title: 'Database Systems - Final',
    shortDescription: 'SQL queries, normalization, and transaction management.',
    startsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    endsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 180 * 60 * 1000).toISOString(),
    durationMin: 180,
    timePerQuestionSec: 90,
    status: 'upcoming',
    attemptsLeft: 2,
    allowedReRecords: 0,
    teacherName: 'Dr. Y',
    pointsTotal: 150,
    thumbnailUrl: null,
    settingsSummary: { strictMode: true },
  },
  {
    id: 'EX-103',
    title: 'Web Development - Quiz 1',
    shortDescription: 'HTML, CSS, and JavaScript fundamentals.',
    startsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    endsAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
    durationMin: 60,
    timePerQuestionSec: 45,
    status: 'finished',
    attemptsLeft: 0,
    allowedReRecords: 0,
    teacherName: 'Prof. Z',
    pointsTotal: 50,
    thumbnailUrl: null,
    settingsSummary: { strictMode: false },
  },
]

/**
 * Faculty API types
 */
export interface Question {
  id: string
  type: 'viva' | 'interview'
  question: string
  points: number
  media?: {
    image?: { file: string; url: string; type: string } | null
    video?: { file: string; url: string; type: string } | null
    graph?: { file: string; url: string; type: string } | null
  }
}

// Export Question type for use in components
export type { Question }

export interface DraftExam {
  id: string
  title: string
  shortDescription: string
  instructions?: string | null
  status: 'draft'
  questions: Question[]
  createdAt: string
  teacherName: string
}

export interface FacultyExam {
  id: string
  title: string
  shortDescription: string
  startsAt: string
  endsAt: string
  durationMin: number
  timePerQuestionSec: number | null
  status: 'live' | 'upcoming' | 'finished' | 'draft'
  createdAt: string
  submissionCount: number
  totalStudents: number
  pointsTotal: number
  questions?: Question[]
  settingsSummary: {
    strictMode: boolean
    [key: string]: unknown
  }
}

export interface FacultyExamsResponse {
  exams: FacultyExam[]
  page: number
  limit: number
  total: number
}

export interface FacultyStats {
  totalExams: number
  activeExams: number
  upcomingExams: number
  completedExams: number
  totalStudents: number
  avgSubmissions: number
}

/**
 * Mock faculty exams data
 */
export const MOCK_FACULTY_EXAMS: FacultyExam[] = [
  {
    id: 'FAC-EX-001',
    title: 'Data Structures and Algorithms - Midterm Exam',
    shortDescription: 'Comprehensive exam covering arrays, linked lists, trees, and sorting algorithms.',
    startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 120 * 60 * 1000).toISOString(),
    durationMin: 120,
    timePerQuestionSec: 90,
    status: 'upcoming',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    submissionCount: 0,
    totalStudents: 45,
    pointsTotal: 100,
    settingsSummary: {
      strictMode: true,
      attemptsLeft: 1,
      allowedReRecords: 0,
      instructions: 'Read all questions carefully. No calculators allowed.'
    }
  },
  {
    id: 'FAC-EX-002',
    title: 'Database Management Systems - Quiz 2',
    shortDescription: 'SQL queries, normalization, and transaction management concepts.',
    startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    endsAt: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(), // 1 hour from now
    durationMin: 60,
    timePerQuestionSec: 60,
    status: 'live',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    submissionCount: 32,
    totalStudents: 50,
    pointsTotal: 50,
    settingsSummary: {
      strictMode: false,
      attemptsLeft: 2,
      allowedReRecords: 1,
      instructions: 'Answer all questions. Partial credit will be given.'
    }
  },
  {
    id: 'FAC-EX-003',
    title: 'Web Development Fundamentals - Final Exam',
    shortDescription: 'HTML, CSS, JavaScript, and React concepts assessment.',
    startsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    endsAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 + 180 * 60 * 1000).toISOString(),
    durationMin: 180,
    timePerQuestionSec: 120,
    status: 'finished',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    submissionCount: 48,
    totalStudents: 50,
    pointsTotal: 150,
    settingsSummary: {
      strictMode: true,
      attemptsLeft: 1,
      allowedReRecords: 0,
      instructions: 'Complete all sections. Code must be properly formatted.'
    }
  }
]

/**
 * Fetch faculty exams list with filters
 */
export async function fetchFacultyExams(params: {
  status?: 'all' | 'live' | 'upcoming' | 'finished'
  page?: number
  limit?: number
}): Promise<FacultyExamsResponse> {
  try {
    const queryParams = new URLSearchParams()
    if (params.status && params.status !== 'all') {
      queryParams.append('status', params.status)
    }
    if (params.page) queryParams.append('page', params.page.toString())
    if (params.limit) queryParams.append('limit', params.limit.toString())

    const response = await fetchAPI(`/faculty/exams?${queryParams}`)
    return response.json()
  } catch (err) {
    console.warn('API fetch failed, using localStorage fallback:', err)
    // Fallback to localStorage if server is not available
    try {
      const storedExams = localStorage.getItem('faculty_exams')
      let exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
      
      // Initialize if empty
      if (!storedExams) {
        localStorage.setItem('faculty_exams', JSON.stringify(MOCK_FACULTY_EXAMS))
      }
      
      return {
        exams,
        page: params.page || 1,
        limit: params.limit || 100,
        total: exams.length
      }
    } catch (fallbackErr) {
      // Last resort: return mock data
      return {
        exams: MOCK_FACULTY_EXAMS,
        page: params.page || 1,
        limit: params.limit || 100,
        total: MOCK_FACULTY_EXAMS.length
      }
    }
  }
}

/**
 * Fetch faculty dashboard statistics
 */
export async function fetchFacultyStats(): Promise<FacultyStats> {
  try {
    const response = await fetchAPI('/faculty/stats')
    return response.json()
  } catch (err) {
    console.warn('API fetch failed, calculating stats from local data:', err)
    // Calculate stats from localStorage exams
    const storedExams = localStorage.getItem('faculty_exams')
    const exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
    
    const now = new Date()
    const stats = {
      totalExams: exams.length,
      activeExams: exams.filter(e => {
        const starts = new Date(e.startsAt)
        const ends = new Date(e.endsAt)
        return now >= starts && now < ends
      }).length,
      upcomingExams: exams.filter(e => {
        const starts = new Date(e.startsAt)
        return now < starts
      }).length,
      completedExams: exams.filter(e => {
        const ends = new Date(e.endsAt)
        return now >= ends
      }).length,
      totalStudents: exams.reduce((sum, e) => sum + (e.totalStudents || 0), 0),
      avgSubmissions: exams.length > 0 
        ? Math.round(exams.reduce((sum, e) => sum + (e.submissionCount || 0), 0) / exams.length)
        : 0
    }
    
    return stats
  }
}

/**
 * Create a new exam
 */
export async function createExam(examData: {
  title: string
  shortDescription: string
  startsAt: string
  endsAt: string
  durationMin: number
  timePerQuestionSec?: number | null
  pointsTotal: number
  settingsSummary?: Record<string, unknown>
}): Promise<FacultyExam> {
  try {
    const response = await fetchAPI('/faculty/exams', {
      method: 'POST',
      body: JSON.stringify(examData),
    })
    const newExam = await response.json()
    // Also save to localStorage as backup
    try {
      const storedExams = localStorage.getItem('faculty_exams')
      const exams = storedExams ? JSON.parse(storedExams) : []
      exams.push(newExam)
      localStorage.setItem('faculty_exams', JSON.stringify(exams))
    } catch (e) {
      // Ignore localStorage errors
    }
    return newExam
  } catch (err) {
    console.warn('API create failed, saving to localStorage:', err)
    // Fallback: Create exam locally
    const newExam: FacultyExam = {
      id: `FAC-EX-${Date.now()}`,
      title: examData.title,
      shortDescription: examData.shortDescription,
      startsAt: examData.startsAt,
      endsAt: examData.endsAt,
      durationMin: examData.durationMin,
      timePerQuestionSec: examData.timePerQuestionSec || null,
      status: new Date(examData.startsAt) > new Date() ? 'upcoming' : 'live',
      createdAt: new Date().toISOString(),
      submissionCount: 0,
      totalStudents: 0,
      pointsTotal: examData.pointsTotal,
      settingsSummary: examData.settingsSummary || { strictMode: false }
    }
    
    // Save to localStorage
    try {
      const storedExams = localStorage.getItem('faculty_exams')
      const exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
      exams.push(newExam)
      localStorage.setItem('faculty_exams', JSON.stringify(exams))
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return newExam
  }
}

/**
 * Update an existing exam
 */
export async function updateExam(
  examId: string,
  examData: Partial<FacultyExam>
): Promise<FacultyExam> {
  try {
    const response = await fetchAPI(`/faculty/exams/${examId}`, {
      method: 'PUT',
      body: JSON.stringify(examData),
    })
    return response.json()
  } catch (err) {
    console.warn('API update failed, updating localStorage:', err)
    // Update exam locally for demo
    const storedExams = localStorage.getItem('faculty_exams')
    const exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
    const index = exams.findIndex(e => e.id === examId)
    
    if (index !== -1) {
      exams[index] = { ...exams[index], ...examData }
      // Update status based on dates
      if (examData.startsAt || examData.endsAt) {
        const starts = new Date(examData.startsAt || exams[index].startsAt)
        const ends = new Date(examData.endsAt || exams[index].endsAt)
        const now = new Date()
        if (now < starts) exams[index].status = 'upcoming'
        else if (now >= starts && now < ends) exams[index].status = 'live'
        else exams[index].status = 'finished'
      }
      localStorage.setItem('faculty_exams', JSON.stringify(exams))
      return exams[index]
    }
    throw new Error('Exam not found')
  }
}

/**
 * Delete an exam
 */
export async function deleteExam(examId: string): Promise<void> {
  try {
    await fetchAPI(`/faculty/exams/${examId}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.warn('API delete failed, deleting from localStorage:', err)
    // Delete exam locally for demo
    const storedExams = localStorage.getItem('faculty_exams')
    const exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
    const filtered = exams.filter(e => e.id !== examId)
    localStorage.setItem('faculty_exams', JSON.stringify(filtered))
  }
}

/**
 * Create a draft exam
 */
export async function createDraftExam(draftData: {
  title: string
  shortDescription: string
  instructions?: string | null
  teacherName: string
  questions?: Question[]
}): Promise<DraftExam> {
  try {
    const response = await fetchAPI('/faculty/exams/drafts', {
      method: 'POST',
      body: JSON.stringify(draftData),
    })
    return response.json()
  } catch (err) {
    console.warn('API create draft failed, saving to localStorage:', err)
    // Fallback: Create draft locally
    const newDraft: DraftExam = {
      id: `DRAFT-${Date.now()}`,
      title: draftData.title,
      shortDescription: draftData.shortDescription,
      instructions: draftData.instructions || null,
      status: 'draft',
      questions: draftData.questions || [],
      createdAt: new Date().toISOString(),
      teacherName: draftData.teacherName
    }
    
    try {
      const storedDrafts = localStorage.getItem('faculty_drafts')
      const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
      drafts.push(newDraft)
      localStorage.setItem('faculty_drafts', JSON.stringify(drafts))
    } catch (e) {
      // Ignore localStorage errors
    }
    
    return newDraft
  }
}

/**
 * Update a draft exam
 */
export async function updateDraftExam(
  draftId: string,
  draftData: Partial<DraftExam>
): Promise<DraftExam> {
  try {
    const response = await fetchAPI(`/faculty/exams/drafts/${draftId}`, {
      method: 'PUT',
      body: JSON.stringify(draftData),
    })
    return response.json()
  } catch (err: any) {
    console.warn('API update draft failed, trying localStorage fallback:', err)
    
    // If it's a 413 error (payload too large), try to sync from server first
    if (err.status === 413) {
      console.warn('Payload too large, attempting to sync from server first')
      try {
        const draftsResponse = await fetchAPI('/faculty/exams/drafts')
        const serverDrafts = await draftsResponse.json()
        const serverDraft = Array.isArray(serverDrafts) 
          ? serverDrafts.find((d: DraftExam) => d.id === draftId)
          : null
        
        if (serverDraft) {
          // Merge with server draft
          const storedDrafts = localStorage.getItem('faculty_drafts')
          const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
          const index = drafts.findIndex((d: DraftExam) => d.id === draftId)
          
          const updatedDraft = { ...serverDraft, ...draftData }
          if (index !== -1) {
            drafts[index] = updatedDraft
          } else {
            drafts.push(updatedDraft)
          }
          localStorage.setItem('faculty_drafts', JSON.stringify(drafts))
          return updatedDraft
        }
      } catch (syncErr) {
        console.warn('Failed to sync from server:', syncErr)
      }
    }
    
    // Fallback to localStorage only
    const storedDrafts = localStorage.getItem('faculty_drafts')
    const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
    const index = drafts.findIndex((d: DraftExam) => d.id === draftId)
    
    if (index !== -1) {
      const updatedDraft = { ...drafts[index], ...draftData }
      drafts[index] = updatedDraft
      localStorage.setItem('faculty_drafts', JSON.stringify(drafts))
      return updatedDraft
    }
    
    // If still not found, throw a more descriptive error
    throw new Error(`Draft not found: ${draftId}. The draft may have been deleted or the server may need to be restarted.`)
  }
}

/**
 * Publish a draft exam (convert to full exam)
 */
export async function publishDraftExam(
  draftId: string,
  examData: {
    title: string
    shortDescription: string
    instructions?: string | null
    startsAt: string
    endsAt: string
    durationMin: number
    timePerQuestionSec?: number | null
    pointsTotal: number
    questions: Question[]
    settingsSummary: Record<string, unknown>
  }
): Promise<FacultyExam> {
  try {
    const response = await fetchAPI(`/faculty/exams/drafts/${draftId}/publish`, {
      method: 'POST',
      body: JSON.stringify(examData),
    })
    const newExam = await response.json()
    
    // Remove draft from localStorage
    try {
      const storedDrafts = localStorage.getItem('faculty_drafts')
      const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
      const filtered = drafts.filter((d: DraftExam) => d.id !== draftId)
      localStorage.setItem('faculty_drafts', JSON.stringify(filtered))
    } catch (e) {
      // Ignore
    }
    
    return newExam
  } catch (err) {
    console.warn('API publish draft failed, creating exam locally:', err)
    // Fallback: Create exam from draft
    let teacherName = 'Current Faculty'
    try {
      const userData = JSON.parse(localStorage.getItem('user_data'))
      if (userData?.role === 'faculty') {
        teacherName = userData.name || userData.facultyId || 'Current Faculty'
      }
    } catch (e) {
      // Ignore
    }

    const newExam: FacultyExam = {
      id: `FAC-EX-${Date.now()}`,
      title: examData.title,
      shortDescription: examData.shortDescription,
      startsAt: examData.startsAt,
      endsAt: examData.endsAt,
      durationMin: examData.durationMin,
      timePerQuestionSec: examData.timePerQuestionSec || null,
      status: new Date(examData.startsAt) > new Date() ? 'upcoming' : 'live',
      createdAt: new Date().toISOString(),
      submissionCount: 0,
      totalStudents: 0,
      pointsTotal: examData.pointsTotal,
      questions: examData.questions,
      settingsSummary: examData.settingsSummary || { strictMode: false }
    }
    
    // Save to localStorage
    try {
      const storedExams = localStorage.getItem('faculty_exams')
      const exams = storedExams ? JSON.parse(storedExams) : MOCK_FACULTY_EXAMS
      exams.push(newExam)
      localStorage.setItem('faculty_exams', JSON.stringify(exams))
      
      // Remove draft
      const storedDrafts = localStorage.getItem('faculty_drafts')
      const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
      const filtered = drafts.filter((d: DraftExam) => d.id !== draftId)
      localStorage.setItem('faculty_drafts', JSON.stringify(filtered))
    } catch (e) {
      // Ignore
    }
    
    return newExam
  }
}

/**
 * Fetch all draft exams
 */
export async function fetchDraftExams(): Promise<DraftExam[]> {
  try {
    const response = await fetchAPI('/faculty/exams/drafts')
    return response.json()
  } catch (err) {
    console.warn('API fetch drafts failed, using localStorage:', err)
    try {
      const storedDrafts = localStorage.getItem('faculty_drafts')
      return storedDrafts ? JSON.parse(storedDrafts) : []
    } catch (e) {
      return []
    }
  }
}

/**
 * Delete a draft exam
 */
export async function deleteDraftExam(draftId: string): Promise<void> {
  try {
    await fetchAPI(`/faculty/exams/drafts/${draftId}`, {
      method: 'DELETE',
    })
  } catch (err) {
    console.warn('API delete draft failed, deleting from localStorage:', err)
    try {
      const storedDrafts = localStorage.getItem('faculty_drafts')
      const drafts = storedDrafts ? JSON.parse(storedDrafts) : []
      const filtered = drafts.filter((d: DraftExam) => d.id !== draftId)
      localStorage.setItem('faculty_drafts', JSON.stringify(filtered))
    } catch (e) {
      // Ignore
    }
  }
}

/**
 * Student API types
 */
export interface Student {
  id: string
  enrollment: string
  name: string
  email: string
  department: string
  year: number
  phone?: string
  joinedDate: string
}

export interface StudentExamSubmission {
  examId: string
  examTitle: string
  status: 'completed' | 'in_progress' | 'pending'
  score: number | null
  maxScore: number
  submittedAt: string | null
  startedAt: string
  timeSpent: number // in minutes
  attempts: number
}

export interface StudentDetails extends Student {
  examSubmissions: StudentExamSubmission[]
  stats: {
    totalExams: number
    completedExams: number
    averageScore: number
    totalAttempts: number
  }
}

export interface StudentsResponse {
  students: Student[]
  page: number
  limit: number
  total: number
}

/**
 * Fetch all students with filters
 */
export async function fetchStudents(params: {
  department?: string
  year?: number
  page?: number
  limit?: number
  search?: string
}): Promise<StudentsResponse> {
  const queryParams = new URLSearchParams()
  if (params.department) queryParams.append('department', params.department)
  if (params.year) queryParams.append('year', params.year.toString())
  if (params.page) queryParams.append('page', params.page.toString())
  if (params.limit) queryParams.append('limit', params.limit.toString())
  if (params.search) queryParams.append('search', params.search)

  const response = await fetchAPI(`/faculty/students?${queryParams}`)
  return response.json()
}

/**
 * Fetch student details by ID
 */
export async function fetchStudentDetails(studentId: string): Promise<StudentDetails> {
  const response = await fetchAPI(`/faculty/students/${studentId}`)
  return response.json()
}

/**
 * Fetch exam submissions for a specific exam
 */
export async function fetchExamSubmissions(examId: string): Promise<{
  submissions: Array<{
    studentId: string
    studentName: string
    studentEnrollment: string
    status: 'completed' | 'in_progress' | 'pending'
    score: number | null
    maxScore: number
    submittedAt: string | null
    startedAt: string
    attempts: number
  }>
  total: number
}> {
  const response = await fetchAPI(`/faculty/exams/${examId}/submissions`)
  return response.json()
}
