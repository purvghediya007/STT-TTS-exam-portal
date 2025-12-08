// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginCard from "./components/LoginCard";
import RegisterCard from "./components/RegisterCard";
import ForgotPasswordCard from "./components/ForgotPasswordCard";
import ProtectedRoute from "./components/ProtectedRoute";
import Student from "./pages/StudentRoutes";
import Faculty from "./pages/FacultyRoutes";
import "./App.css";

const App = () => {
  return (
    <BrowserRouter>
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
              <Student />
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
            <ProtectedRoute requiredRole="faculty">
              <Faculty />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirect /faculty to /faculty/dashboard */}
        <Route 
          path="/faculty" 
          element={
            <ProtectedRoute requiredRole="faculty">
              <Navigate to="/faculty/dashboard" replace />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
