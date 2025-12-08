import { Routes, Route, Navigate } from 'react-router-dom'
import StudentLayout from '../components/StudentLayout'
import DashboardView from './students/DashboardView'
import UpcomingQuizView from './students/UpcomingQuizView'
import AvailableQuizView from './students/AvailableQuizView'
import HistoryView from './students/HistoryView'
import GuidelinesView from './students/GuidelinesView'
// import TakeExamView from './TakeExamView'
// import ExamResultsView from './ExamResultsView'

/**
 * StudentExams - Main container with routing for all student exam views
 */
const StudentRoutes = () => {
  return (
    <>
      {/* <h1>Under construction.</h1> */}
    <StudentLayout>
      <Routes>
        <Route path="dashboard" element={<DashboardView />} />
        <Route path="upcoming" element={<UpcomingQuizView />} />
        <Route path="available" element={<AvailableQuizView />} />
        <Route path="history" element={<HistoryView />} />
        <Route path="guidelines" element={<GuidelinesView />} />
        {/* <Route path="exams/:examId/take" element={<TakeExamView />} />
        <Route path="exams/:examId/results" element={<ExamResultsView />} /> */}
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </StudentLayout>
    </>
  )
}

export default StudentRoutes;