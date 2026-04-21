import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import DashboardView from './DashboardView'
import UpcomingQuizView from './UpcomingQuizView'
import AvailableQuizView from './AvailableQuizView'
import HistoryView from './HistoryView'
import GuidelinesView from './GuidelinesView'
import TakeExamView from './TakeExamView'
import ExamResultsView from './ExamResultsView'
import ExamAnalysisView from './ExamAnalysisView'
import ExamDetailsView from './ExamDetailsView'
import ProfileView from './ProfileView'

/**
 * StudentExams - Main container with routing for all student exam views
 */
export default function StudentExams() {
  return (
    <StudentLayout>
      <Routes>
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="upcoming" element={<UpcomingQuizView />} />
        <Route path="available" element={<AvailableQuizView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="guidelines" element={<GuidelinesView />} />
        <Route path="profile" element={<ProfileView />} />
        <Route path="exams/:examId/details" element={<ExamDetailsView />} />
        <Route path="exams/:examId/take" element={<TakeExamView />} />
        <Route path="exams/:examId/results" element={<ExamResultsView />} />
        <Route path="exams/:examId/analysis" element={<ExamAnalysisView />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </StudentLayout>
  )
}
