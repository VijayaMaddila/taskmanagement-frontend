import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Backlog from "./pages/Backlog";
import Team from "./pages/Team";
import Profile from "./pages/Profile";

import { isAuthenticated, hasRole } from "./utils/auth";
function ProtectedRoute({ children }) {
  if (isAuthenticated()) {
    return children;
  }
  return <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  if (!hasRole("ADMIN")) {
    return <Navigate to="/board" replace />;
  }
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/login"
          element={
            isAuthenticated() ? (
              <Navigate
                to={hasRole("ADMIN") ? "/dashboard" : "/board"}
                replace
              />
            ) : (
              <Login />
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated() ? (
              <Navigate
                to={hasRole("ADMIN") ? "/dashboard" : "/board"}
                replace
              />
            ) : (
              <Register />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/board"
          element={
            <ProtectedRoute>
              <Tasks />
            </ProtectedRoute>
          }
        />
        <Route
          path="/backlog"
          element={
            <ProtectedRoute>
              <Backlog />
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <Team />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/tasks" element={<Navigate to="/board" replace />} />
        <Route path="/project" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
