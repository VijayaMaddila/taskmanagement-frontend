import { useNavigate, useLocation } from "react-router-dom";
import { hasRole } from "../utils/auth";
import { useState, useEffect } from "react";
import { fetchAll } from "../utils/api";
import "./Sidebar.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function getInitials(name = "") {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "U";
}

// Colors for project dots in the sidebar
const PROJECT_COLORS = [
  "#6366f1",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const isAdmin = hasRole("ADMIN");
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    fetchAll("/api/projects")
      .then((allProjects) => setProjects(allProjects))
      .catch(() => {});
  }, []);

  function getNavItemClass(path) {
    const isCurrentPage = location.pathname === path;
    return isCurrentPage ? "sdb-nav-item active" : "sdb-nav-item";
  }
  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  return (
    <aside className="sdb-sidebar">
      {/* Logo — clicking goes to the user's home page */}
      <div
        className="sdb-logo"
        onClick={() => navigate(isAdmin ? "/dashboard" : "/board")}
      >
        <div className="sdb-logo-icon">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="7" fill="url(#sdbgrad)" />
            <path
              d="M7 14L12 19L21 9"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="sdbgrad" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span className="sdb-logo-text">TaskFlow</span>
      </div>

      <nav className="sdb-nav">
        {/* Planning section */}
        <div className="sdb-section">
          <p className="sdb-section-label">Planning</p>

          {/* Dashboard — admin only */}
          {isAdmin && (
            <button
              className={getNavItemClass("/dashboard")}
              onClick={() => navigate("/dashboard")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect
                  x="1"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                />
                <rect
                  x="9"
                  y="1"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                  opacity=".45"
                />
                <rect
                  x="1"
                  y="9"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                  opacity=".45"
                />
                <rect
                  x="9"
                  y="9"
                  width="6"
                  height="6"
                  rx="1.5"
                  fill="currentColor"
                  opacity=".45"
                />
              </svg>
              Dashboard
            </button>
          )}

          <button
            className={getNavItemClass("/board")}
            onClick={() => navigate("/board")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="1"
                width="4"
                height="14"
                rx="1.5"
                fill="currentColor"
              />
              <rect
                x="6"
                y="1"
                width="4"
                height="10"
                rx="1.5"
                fill="currentColor"
                opacity=".5"
              />
              <rect
                x="11"
                y="1"
                width="4"
                height="12"
                rx="1.5"
                fill="currentColor"
                opacity=".3"
              />
            </svg>
            Board
          </button>

          <button
            className={getNavItemClass("/backlog")}
            onClick={() => navigate("/backlog")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect
                x="1"
                y="2"
                width="14"
                height="2.5"
                rx="1"
                fill="currentColor"
              />
              <rect
                x="1"
                y="6.5"
                width="10"
                height="2.5"
                rx="1"
                fill="currentColor"
                opacity=".6"
              />
              <rect
                x="1"
                y="11"
                width="12"
                height="2.5"
                rx="1"
                fill="currentColor"
                opacity=".4"
              />
            </svg>
            Backlog
          </button>

          <button
            className={getNavItemClass("/projects")}
            onClick={() => navigate("/projects")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 5a2 2 0 012-2h2.586a1 1 0 01.707.293L8.414 4.4A1 1 0 009.121 4.7H12a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"
                stroke="currentColor"
                strokeWidth="1.3"
                fill="none"
              />
            </svg>
            Projects
          </button>
        </div>

        {/* Team section */}
        <div className="sdb-section">
          <p className="sdb-section-label">Team</p>

          <button
            className={getNavItemClass("/team")}
            onClick={() => navigate("/team")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle
                cx="5.5"
                cy="5"
                r="2.5"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M1 14c0-2.485 2.015-4.5 4.5-4.5S10 11.515 10 14"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <circle
                cx="12"
                cy="5"
                r="2"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path
                d="M10.5 14c0-1.5.8-2.8 2-3.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
            Team
          </button>

          {/* User Management — admin only */}
          {isAdmin && (
            <button
              className={getNavItemClass("/users")}
              onClick={() => navigate("/users")}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle
                  cx="6"
                  cy="5"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M1 14c0-2.761 2.239-5 5-5h1"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="3"
                  stroke="currentColor"
                  strokeWidth="1.3"
                />
                <path
                  d="M12 8.5V10l1 1"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              User Management
              <span className="sdb-admin-badge">Admin</span>
            </button>
          )}
        </div>

        {/* Quick links to the first 6 projects */}
        {projects.length > 0 && (
          <div className="sdb-section">
            <p className="sdb-section-label">Your Projects</p>

            {projects.slice(0, 6).map((project, index) => {
              const dotColor = PROJECT_COLORS[index % PROJECT_COLORS.length];

              return (
                <button
                  key={project.id}
                  className="sdb-nav-item sdb-project-item"
                  onClick={() => navigate(`/board?project=${project.id}`)}
                >
                  <span
                    className="sdb-project-dot"
                    style={{ background: dotColor }}
                  />
                  <span className="sdb-project-name">{project.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* Footer: user info + logout button */}
      <div className="sdb-footer">
        <div className="sdb-user">
          <div className="sdb-avatar">
            {getInitials(currentUser.name || "")}
          </div>
          <div className="sdb-user-info">
            <span className="sdb-user-name">
              {currentUser.name || "My Account"}
            </span>
            <span className="sdb-user-role">
              {currentUser.role || "DEVELOPER"}
            </span>
          </div>
        </div>

        <button className="sdb-logout" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </aside>
  );
}
