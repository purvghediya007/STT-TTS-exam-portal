import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import FacultyLayout from '../components/FacultyLayout'
import FacultyDashboardView from './FacultyDashboardView'
import FacultyExamsList from './FacultyExamsList'
import StudentsList from './StudentsList'
import StudentDetails from './StudentDetails'
import ExamSubmissionsView from './ExamSubmissionsView'
import FacultyAnalyticsDashboard from './FacultyAnalyticsDashboard'
import ProfileView from './ProfileView'

/**
 * FacultyExams - Main container with routing for all faculty views
 */
export default function FacultyExams() {
  return (
    <FacultyLayout>
      <Routes>
        <Route path="dashboard" element={<FacultyDashboardView />} />
        <Route path="exams" element={<FacultyExamsList />} />
        <Route path="exams/:examId/submissions" element={<ExamSubmissionsView />} />
        <Route path="students" element={<StudentsList />} />
        <Route path="students/:studentId" element={<StudentDetails />} />
        <Route path="analytics" element={<FacultyAnalyticsDashboard />} />
        <Route path="profile" element={<ProfileView />} />
        <Route path="settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-600 mt-2">Settings page coming soon...</p></div>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </FacultyLayout>
  )
}

