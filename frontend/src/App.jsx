// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import ResetPassword from "./components/ResetPassword";
import ForgotPasswordCard from "./components/ForgotPasswordCard";
import ProtectedRoute from "./components/ProtectedRoute";
import Student from "./pages/StudentRoutes";
import Faculty from "./pages/FacultyRoutes";
import "./App.css";

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/"
            element={
              <div className="portal-shell">
                <div className="gradient-beam beam-1" />
                <div className="gradient-beam beam-2" />
                <LoginCard />
              </div>
            }
          />
          <Route
            path="/signup"
            element={
              <div className="portal-shell">
                <div className="gradient-beam beam-1" />
                <div className="gradient-beam beam-2" />
                <RegisterCard />
              </div>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <div className="portal-shell">
                <div className="gradient-beam beam-1" />
                <div className="gradient-beam beam-2" />
                <ForgotPasswordCard />
              </div>
            }
          />
          {/* Student routes - all nested under /student */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute requiredRole="student">
                <StudentExams />
              </ProtectedRoute>
            }
          />

          {/* Redirect /student to /student/dashboard */}
          <Route
            path="/student"
            element={
              <ProtectedRoute requiredRole="student">
                <Navigate to="/student/dashboard" replace />
              </ProtectedRoute>
            }
          />

          {/* Faculty routes - all nested under /faculty */}
          <Route
            path="/faculty/*"
            element={
              <ProtectedRoute requiredRole="teacher">
                <FacultyExams />
              </ProtectedRoute>
            }
          />

          {/* Redirect /faculty to /faculty/dashboard */}
          <Route
            path="/faculty"
            element={
              <ProtectedRoute requiredRole="teacher">
                <Navigate to="/faculty/dashboard" replace />
              </ProtectedRoute>
            }
          />
              
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
