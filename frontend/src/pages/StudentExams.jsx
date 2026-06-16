// import React from 'react'
// import { Routes, Route, Navigate } from 'react-router-dom'
// import StudentLayout from '../components/StudentLayout'
// import DashboardView from './DashboardView'
// import UpcomingQuizView from './UpcomingQuizView'
// import AvailableQuizView from './AvailableQuizView'
// import HistoryView from './HistoryView'
// import GuidelinesView from './GuidelinesView'
// import TakeExamView from './TakeExamView'
// import ExamResultsView from './ExamResultsView'
// import ExamAnalysisView from './ExamAnalysisView'
// import ExamScoreboardView from './ExamScoreboardView'
// import ExamDetailsView from './ExamDetailsView'
// import ProfileView from './ProfileView'

// /**
//  * StudentExams - Main container with routing for all student exam views
//  */
// export default function StudentExams() {
//   return (
//     <StudentLayout>
//       <Routes>
//         <Route path="dashboard" element={<DashboardView />} />
//         <Route path="upcoming" element={<UpcomingQuizView />} />
//         <Route path="available" element={<AvailableQuizView />} />
//         <Route path="history" element={<HistoryView />} />
//         <Route path="guidelines" element={<GuidelinesView />} />
//         <Route path="profile" element={<ProfileView />} />
//         <Route path="exams/:examId/details" element={<ExamDetailsView />} />
//         <Route path="exams/:examId/take" element={<TakeExamView />} />
//         <Route path="exams/:examId/results" element={<ExamResultsView />} />
//         <Route path="exams/:examId/analysis" element={<ExamAnalysisView />} />
//         <Route path="exams/:examId/scoreboard" element={<ExamScoreboardView />} />
//         <Route path="" element={<Navigate to="dashboard" replace />} />
//         <Route path="*" element={<Navigate to="dashboard" replace />} />
//       </Routes>
//     </StudentLayout>
//   )
// }


import React, { Suspense, lazy } from 'react'
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
import ExamScoreboardView from './ExamScoreboardView'
import ExamDetailsView from './ExamDetailsView'
import ProfileView from './ProfileView'

// PRACTICE HUB — Lazy loaded (no impact on existing bundle size)
const PracticeHub = lazy(() => import('../practice/pages/PracticeHub'))
const PracticeGuidelines = lazy(() => import('../practice/pages/PracticeGuidelines'))
const AptitudeLearning = lazy(() => import('../practice/pages/AptitudeLearning'))
const AptitudePractice = lazy(() => import('../practice/pages/AptitudePractice'))
const TechnicalPractice = lazy(() => import('../practice/pages/TechnicalPractice'))
const PracticeExamViewer = lazy(() => import('../practice/pages/PracticeExamViewer'))
const PracticeResults = lazy(() => import('../practice/pages/PracticeResults'))
const CompanyPractice = lazy(() => import('../practice/pages/CompanyPractice'))
const PracticeHistory = lazy(() => import('../practice/pages/PracticeHistory'))
const CodingProblemList = lazy(() => import('../practice/pages/CodingProblemList'))
const CodingWorkspace = lazy(() => import('../practice/pages/CodingWorkspace'))

const PracticeLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-gray-500">Loading...</div>
  </div>
)

/**
 * StudentExams - Main container with routing for all student exam views
 */
export default function StudentExams() {
  return (
    <StudentLayout>
      <Routes>
        {/* ===== EXISTING ROUTES (UNCHANGED) ===== */}
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
        <Route path="exams/:examId/scoreboard" element={<ExamScoreboardView />} />

        {/* ===== PRACTICE HUB ROUTES (NEW) ===== */}
        <Route path="practice" element={<Suspense fallback={<PracticeLoading />}><PracticeHub /></Suspense>} />
        <Route path="practice/guidelines" element={<Suspense fallback={<PracticeLoading />}><PracticeGuidelines /></Suspense>} />
        <Route path="practice/aptitude/learn" element={<Suspense fallback={<PracticeLoading />}><AptitudeLearning /></Suspense>} />
        <Route path="practice/aptitude/learn/:topicKey" element={<Suspense fallback={<PracticeLoading />}><AptitudeLearning /></Suspense>} />
        <Route path="practice/aptitude/practice" element={<Suspense fallback={<PracticeLoading />}><AptitudePractice /></Suspense>} />
        <Route path="practice/technical/:mode" element={<Suspense fallback={<PracticeLoading />}><TechnicalPractice /></Suspense>} />
        <Route path="practice/exam" element={<Suspense fallback={<PracticeLoading />}><PracticeExamViewer /></Suspense>} />
        <Route path="practice/results" element={<Suspense fallback={<PracticeLoading />}><PracticeResults /></Suspense>} />
        <Route path="practice/company" element={<Suspense fallback={<PracticeLoading />}><CompanyPractice /></Suspense>} />
        <Route path="practice/history" element={<Suspense fallback={<PracticeLoading />}><PracticeHistory /></Suspense>} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
        <Route path="practice/coding" element={<Suspense fallback={<PracticeLoading />}><CodingProblemList /></Suspense>} />
        <Route path="practice/coding/problem/:slug" element={<Suspense fallback={<PracticeLoading />}><CodingWorkspace /></Suspense>} />

      </Routes>
    </StudentLayout>
  )
}
