import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, GraduationCap, Calendar, Award, CheckCircle2, Clock, FileText } from 'lucide-react'
import { useStudentDetails } from '../hooks/useStudents'

/**
 * StudentDetails - Page to view individual student details and exam submissions
 */
export default function StudentDetails() {
  const { studentId } = useParams()
  const navigate = useNavigate()
  const { student: apiStudent, loading, error } = useStudentDetails(studentId)

  // Mock data fallback - remove when API is connected
  const mockStudent = {
    id: studentId,
    enrollment: '230170116001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    department: 'Computer Science',
    year: 3,
    phone: '+1 234-567-8900',
    joinedDate: '2023-09-01',
    examSubmissions: [
    {
      examId: 'EX-101',
      examTitle: 'Introduction to Algorithms - Midterm',
      status: 'completed',
      score: 85,
      maxScore: 100,
      submittedAt: '2024-01-15T10:30:00Z',
      startedAt: '2024-01-15T09:00:00Z',
      timeSpent: 90,
      attempts: 1
    },
    {
      examId: 'EX-102',
      examTitle: 'Database Systems - Final',
      status: 'completed',
      score: 92,
      maxScore: 150,
      submittedAt: '2024-02-20T14:45:00Z',
      startedAt: '2024-02-20T13:00:00Z',
      timeSpent: 105,
      attempts: 1
    },
    {
      examId: 'EX-103',
      examTitle: 'Web Development - Quiz 1',
      status: 'in_progress',
      score: null,
      maxScore: 50,
      submittedAt: null,
      startedAt: '2024-03-10T11:00:00Z',
      timeSpent: 30,
      attempts: 1
    }
    ],
    stats: {
    totalExams: examSubmissions.length,
    completedExams: examSubmissions.filter(e => e.status === 'completed').length,
    averageScore: examSubmissions
      .filter(e => e.status === 'completed' && e.score !== null)
      .reduce((sum, e) => sum + (e.score / e.maxScore * 100), 0) / examSubmissions.filter(e => e.status === 'completed' && e.score !== null).length || 0,
      totalAttempts: 0
    }
  }

  const student = apiStudent || mockStudent
  const examSubmissions = student.examSubmissions || []
  const stats = student.stats || {
    totalExams: examSubmissions.length,
    completedExams: examSubmissions.filter(e => e.status === 'completed').length,
    averageScore: examSubmissions
      .filter(e => e.status === 'completed' && e.score !== null)
      .reduce((sum, e) => sum + (e.score / e.maxScore * 100), 0) / examSubmissions.filter(e => e.status === 'completed' && e.score !== null).length || 0,
    totalAttempts: examSubmissions.reduce((sum, e) => sum + e.attempts, 0)
  }

  if (loading && !apiStudent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading student details...</div>
      </div>
    )
  }

  if (error && !apiStudent) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate('/faculty/students')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Students
      </button>

      {/* Student Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
            {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{student.name}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="w-5 h-5" />
                <span>{student.enrollment}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-5 h-5" />
                <span>{student.email}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Department:</span>
                <span>{student.department}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <span className="font-medium">Year:</span>
                <span>{student.year}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Exams</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalExams}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div className="text-xs text-gray-500 uppercase tracking-wide">Completed</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.completedExams}</div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Award className="w-5 h-5 text-yellow-600" />
            <div className="text-xs text-gray-500 uppercase tracking-wide">Avg Score</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {stats.averageScore > 0 ? Math.round(stats.averageScore) : '-'}%
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-purple-600" />
            <div className="text-xs text-gray-500 uppercase tracking-wide">Total Attempts</div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{stats.totalAttempts}</div>
        </div>
      </div>

      {/* Exam Submissions */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Exam Submissions</h2>
        </div>

        {examSubmissions.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No exam submissions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Exam
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Attempts
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {examSubmissions.map((submission) => (
                  <tr key={submission.examId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{submission.examTitle}</div>
                        <div className="text-sm text-gray-500">ID: {submission.examId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        submission.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : submission.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {submission.status === 'completed' ? 'Completed' : submission.status === 'in_progress' ? 'In Progress' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {submission.score !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {submission.score}/{submission.maxScore}
                          </span>
                          <span className="text-sm text-gray-500">
                            ({Math.round((submission.score / submission.maxScore) * 100)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {submission.submittedAt
                        ? new Date(submission.submittedAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{submission.attempts}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

