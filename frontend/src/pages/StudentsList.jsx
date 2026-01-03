import React, { useState, useMemo } from 'react'
import { Search, Users, Mail, GraduationCap, Eye, Filter } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStudents } from '../hooks/useStudents'

/**
 * StudentsList - Page to view all students
 */
export default function StudentsList() {
  const navigate = useNavigate()
  const { students, loading, error } = useStudents()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDepartment, setFilterDepartment] = useState('all')

  // Mock data fallback - remove when API is connected
  const mockStudents = [
    {
      id: 'STU001',
      enrollmentNumber: '230170116001',
      username: 'John Doe',
      email: 'john.doe@example.com',
      department: 'Computer Science',
      year: 3,
      examCount: 5,
      avgScore: 85
    },
    {
      id: 'STU002',
      enrollmentNumber: '230170116002',
      username: 'Jane Smith',
      email: 'jane.smith@example.com',
      department: 'Computer Science',
      year: 2,
      examCount: 3,
      avgScore: 92
    },
    {
      id: 'STU003',
      enrollmentNumber: '230170116003',
      username: 'Bob Johnson',
      email: 'bob.johnson@example.com',
      department: 'Information Technology',
      year: 4,
      examCount: 8,
      avgScore: 78
    }
  ]

  const displayStudents = students.length > 0 ? students : mockStudents

  const departments = useMemo(() => {
    return ['all', ...new Set(displayStudents.map(s => s.department).filter(Boolean))]
  }, [displayStudents])

  const filteredStudents = displayStudents.filter(student => {
    // Department filter
    if (filterDepartment !== 'all' && student.department !== filterDepartment) {
      return false
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      return (
        (student.username || '').toLowerCase().includes(query) ||
        (student.enrollmentNumber || '').toLowerCase().includes(query) ||
        (student.email || '').toLowerCase().includes(query)
      )
    }

    return true
  })

  const handleViewStudent = (studentId) => {
    navigate(`/faculty/students/${studentId}`)
  }

  if (loading && students.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 font-medium">
        Loading students...
      </div>
    )
  }

  if (error && students.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-800">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Students</h1>
        <p className="text-sm md:text-base text-gray-600">View and manage student information</p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, enrollment, or email..."
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="w-full md:w-auto px-4 py-2 text-sm border border-gray-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept === 'all' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filteredStudents.length === 0 ? (
          <div className="p-16 text-center">
            <Users className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">No students found</p>
            <p className="text-gray-400 text-sm">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Enrollment</th>
                  <th className="hidden lg:table-cell px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="hidden sm:table-cell px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Year</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Exams</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider">Avg Score</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                          {(student.username || 'UN').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{student.username}</div>
                          <div className="text-[10px] text-gray-500 flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-600">{student.enrollmentNumber}</td>
                    <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-600">{student.department || '—'}</td>
                    <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-600">{student.year || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-bold">
                        {student.examCount || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                        {student.avgScore}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewStudent(student.id)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 text-gray-700 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
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