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

// Redirect to /login if the user is not logged in
function ProtectedRoute({ children }) {
  if (isAuthenticated()) {
    return children;
  }
  return <Navigate to="/login" replace />;
}

// Redirect to /login if not logged in, or to /board if not an admin
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
        {/* Public routes — anyone can visit */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin-only routes */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />

        {/* Protected routes — any logged-in user */}
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

        {/* Profile — any logged-in user */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Redirect old URLs to new ones */}
        <Route path="/tasks" element={<Navigate to="/board" replace />} />
        <Route path="/project" element={<Navigate to="/projects" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
