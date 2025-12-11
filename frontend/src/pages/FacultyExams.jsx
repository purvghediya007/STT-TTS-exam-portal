import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import FacultyLayout from '../components/FacultyLayout'
import FacultyDashboardView from './FacultyDashboardView'
import FacultyExamsList from './FacultyExamsList'
import StudentsList from './StudentsList'
import StudentDetails from './StudentDetails'

/**
 * FacultyExams - Main container with routing for all faculty views
 */
export default function FacultyExams() {
  return (
    <FacultyLayout>
      <Routes>
        <Route path="dashboard" element={<FacultyDashboardView />} />
        <Route path="exams" element={<FacultyExamsList />} />
        <Route path="students" element={<StudentsList />} />
        <Route path="students/:studentId" element={<StudentDetails />} />
        <Route path="analytics" element={<div className="p-8"><h1 className="text-2xl font-bold">Analytics</h1><p className="text-gray-600 mt-2">Analytics page coming soon...</p></div>} />
        <Route path="settings" element={<div className="p-8"><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-600 mt-2">Settings page coming soon...</p></div>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </FacultyLayout>
  )
}

