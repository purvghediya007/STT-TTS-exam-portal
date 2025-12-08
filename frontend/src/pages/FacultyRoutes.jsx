import { h1 } from 'framer-motion/client'
import { Routes, Route, Navigate } from 'react-router-dom'
import FacultyLayout from '../components/FacultyLayout'
import FacultyDashboardView from './faculty/FacultyDashboardView'
import FacultyExamsList from './faculty/FacultyExamsList'
import StudentsList from './faculty/StudentsList'
import StudentDetails from './faculty/StudentDetails'
import Analytics from './faculty/Analytics'
import Settings from './faculty/Settings'

import e from "cors"

/**
 * FacultyExams - Main container with routing for all faculty views
 */
const FacultyRoutes = () => {
  return (
    <>
    <FacultyLayout>
      <Routes>
        <Route path="dashboard" element={<FacultyDashboardView />} />
        <Route path="exams" element={<FacultyExamsList />} />
        <Route path="students" element={<StudentsList />} />
        <Route path="students/:studentId" element={<StudentDetails />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </FacultyLayout>
    </>
  )
}

export default FacultyRoutes;