import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { hasRole } from "../utils/auth";
import "./Sidebar.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
}

const ICONS = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45" />
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45" />
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".45" />
    </svg>
  ),
  tasks: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="4" height="14" rx="1.5" fill="currentColor" />
      <rect x="6" y="1" width="4" height="10" rx="1.5" fill="currentColor" opacity=".5" />
      <rect x="11" y="1" width="4" height="12" rx="1.5" fill="currentColor" opacity=".3" />
    </svg>
  ),
  projects: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M2 5a2 2 0 012-2h2.586a1 1 0 01.707.293L8.414 4.4A1 1 0 009.121 4.7H12a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V5z"
        stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  ),
  team: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 14c0-2.485 2.015-4.5 4.5-4.5S10 11.515 10 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M10.5 14c0-1.5.8-2.8 2-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  ),
  users: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 14c0-2.761 2.239-5 5-5h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 8.5V10l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();
  const isAdmin = hasRole("ADMIN");
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(path) {
    return location.pathname === path;
  }

  function go(path) {
    navigate(path);
    setMenuOpen(false);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  }

  const navLinks = [
    ...(isAdmin ? [{ path: "/dashboard", label: "Dashboard", icon: ICONS.dashboard }] : []),
    { path: "/board",    label: "Tasks",           icon: ICONS.tasks    },
    { path: "/projects", label: "Projects",         icon: ICONS.projects },
    { path: "/team",     label: "Team",             icon: ICONS.team     },
    ...(isAdmin ? [{ path: "/users", label: "User Management", icon: ICONS.users }] : []),
  ];

  return (
    <header className="navbar">
      {/* Logo */}
      <div className="navbar-logo" onClick={() => go(isAdmin ? "/dashboard" : "/board")}>
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="7" fill="url(#nbgrad)" />
          <path d="M7 14L12 19L21 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <defs>
            <linearGradient id="nbgrad" x1="0" y1="0" x2="28" y2="28">
              <stop stopColor="#6366f1" />
              <stop offset="1" stopColor="#a855f7" />
            </linearGradient>
          </defs>
        </svg>
        <span className="navbar-logo-text">TaskFlow</span>
      </div>

      {/* Desktop nav links — centered */}
      <nav className="navbar-links">
        {navLinks.map((link) => (
          <button
            key={link.path}
            className={`navbar-link${isActive(link.path) ? " active" : ""}`}
            onClick={() => go(link.path)}
          >
            {link.icon}
            {link.label}
          </button>
        ))}
      </nav>

      {/* Right side: user + logout */}
      <div className="navbar-right">
        <div className="navbar-user" onClick={() => go("/profile")} style={{ cursor: "pointer" }} title="My Profile">
          <div className="navbar-avatar">{getInitials(currentUser.username || currentUser.name || "")}</div>
          <span className="navbar-username">{currentUser.username || currentUser.name || "My Account"}</span>
        </div>
        <button className="navbar-logout" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3M10 11l3-3-3-3M13 8H6"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Hamburger — mobile only */}
        <button className="navbar-hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="navbar-mobile-menu">
          {navLinks.map((link) => (
            <button
              key={link.path}
              className={`navbar-mobile-link${isActive(link.path) ? " active" : ""}`}
              onClick={() => go(link.path)}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
          <button className="navbar-mobile-link navbar-mobile-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
