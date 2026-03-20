import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { canManageProjects, hasRole } from "../utils/auth";
import { fetchAll } from "../utils/api";
import Sidebar from "../components/Sidebar";
import "./Dashboard.css";

// Read the stored user from localStorage
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch (error) {
    return {};
  }
}

// Get initials from a name
function getInitials(name = "") {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return initials || "U";
}

const PROJECT_COLORS = [
  "#6366f1",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

function Dashboard() {
  const navigate = useNavigate();

  const user = getStoredUser();
  const userName = user.name || "My Account";
  const canManage = canManageProjects();
  const isAdmin = hasRole("ADMIN");

  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsResponse, taskList, projectList] = await Promise.all([
          fetch("http://localhost:8080/api/dashboard/stats", {
            headers: authHeaders,
          }),
          fetchAll("/api/tasks"),
          fetchAll("/api/projects"),
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        let visibleTasks;
        if (isAdmin) {
          visibleTasks = taskList;
        } else {
          visibleTasks = taskList.filter((task) => {
            const assignedId = task.assignedToId ?? task.assignedTo?.id;
            return String(assignedId) === String(user.id);
          });
        }

        const fiveMostRecentTasks = visibleTasks.slice(0, 5);
        setRecentTasks(fiveMostRecentTasks);
        setProjects(projectList);
      } catch (fetchError) {
        console.error(fetchError);
      }

      setLoading(false);
    };

    loadDashboardData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const statCards = [
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? "—",
      icon: "📁",
      color: "#6366f1",
    },
    {
      label: "Open Issues",
      value: stats?.openIssues ?? stats?.totalTasks ?? "—",
      icon: "🔴",
      color: "#ef4444",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? stats?.inProgressTasks ?? "—",
      icon: "🔄",
      color: "#f97316",
    },
    {
      label: "Completed",
      value: stats?.completed ?? stats?.completedTasks ?? "—",
      icon: "✅",
      color: "#22c55e",
    },
  ];
  const getStatusCssClass = (statusString = "") => {
    return statusString.toLowerCase().replace(/_/g, "-");
  };
  const getPriorityArrow = (priorityString = "") => {
    const priority = priorityString.toUpperCase();
    if (priority === "HIGH" || priority === "CRITICAL") return "↑";
    if (priority === "MEDIUM") return "→";
    return "↓";
  };

  return (
    <div className="db-layout">
      <Sidebar />

      <main className="db-main">
        <header className="db-topbar">
          <div>
            <h1 className="db-page-title">Dashboard</h1>
            <p className="db-page-sub">
              Welcome back, {userName.split(" ")[0]} — here's what's happening
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => navigate("/projects")}
              className="db-new-btn"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v12M1 7h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              New Project
            </button>
          )}
        </header>

        {/* Stat cards row */}
        <div className="db-stats">
          {statCards.map((statCard, index) => (
            <div key={index} className="db-stat-card">
              <div className="db-stat-top">
                <span className="db-stat-label">{statCard.label}</span>
                <span className="db-stat-icon">{statCard.icon}</span>
              </div>
              <div className="db-stat-value" style={{ color: statCard.color }}>
                {loading ? <span className="db-skeleton" /> : statCard.value}
              </div>
            </div>
          ))}
        </div>
        <div className="db-grid">
          <div className="db-card">
            <div className="db-card-header">
              <h2>Recent Tasks</h2>
              <button
                className="db-view-all"
                onClick={() => navigate("/tasks")}
              >
                View all →
              </button>
            </div>

            <div className="db-issues-list">
              {loading && <div className="db-loading-row">Loading...</div>}
              {!loading && recentTasks.length === 0 && (
                <div className="db-loading-row">No tasks yet</div>
              )}
              {recentTasks.map((task, index) => (
                <div key={task.id ?? index} className="db-issue-row">
                  <span
                    className={`db-status-dot s-${getStatusCssClass(task.status)}`}
                  />
                  <span className="db-issue-id">#{task.id}</span>
                  <span className="db-issue-title">{task.title}</span>
                  <span
                    className={`db-priority p-${(task.priority || "").toLowerCase()}`}
                  >
                    {getPriorityArrow(task.priority)}
                  </span>
                  <span className="db-issue-project">
                    {task.projectName || task.project || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Projects card */}
          <div className="db-card">
            <div className="db-card-header">
              <h2>Projects</h2>
              <button
                className="db-view-all"
                onClick={() => navigate("/projects")}
              >
                Manage →
              </button>
            </div>

            <div className="db-projects-list">
              {loading && <div className="db-loading-row">Loading...</div>}
              {!loading && projects.length === 0 && (
                <div className="db-loading-row">No projects yet</div>
              )}
              {projects.map((project, index) => {
                const projectColor =
                  PROJECT_COLORS[index % PROJECT_COLORS.length];
                const taskCount = project.taskCount ?? project.issues ?? 0;
                const progressPercent = project.progress ?? 0;

                return (
                  <div key={project.id} className="db-project-row">
                    <div className="db-project-info">
                      <span
                        className="db-project-color"
                        style={{ background: projectColor }}
                      />
                      <span className="db-project-name">{project.name}</span>
                      <span className="db-project-issues">
                        {taskCount} tasks
                      </span>
                    </div>
                    <div className="db-progress-bar">
                      <div
                        className="db-progress-fill"
                        style={{
                          width: `${progressPercent}%`,
                          background: projectColor,
                        }}
                      />
                    </div>
                    <span className="db-progress-pct">{progressPercent}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
