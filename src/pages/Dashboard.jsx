import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { canManageProjects } from "../utils/auth";
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

  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem("token");
  const authHeaders = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsResponse, allProjects] = await Promise.all([
          fetch("http://localhost:8080/api/dashboard/stats", { headers: authHeaders }),
          fetchAll("/api/projects"),
        ]);

        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        const myProjects = allProjects;

        // Load tasks for each workspace project
        const taskLists = await Promise.all(
          myProjects.map((p) =>
            fetchAll(`/api/tasks/project/${p.id}`)
              .then((tasks) =>
                tasks.map((t) => ({
                  ...t,
                  projectId: t.projectId ?? p.id,
                  projectName: t.projectName ?? p.name,
                }))
              )
              .catch(() => [])
          )
        );

        const allTasks = taskLists.flat();

        // 5 most recent tasks
        setRecentTasks(allTasks.slice(0, 5));

        // Enrich projects with task counts
        const enrichedProjects = myProjects.map((project, i) => {
          const projectTasks = taskLists[i] ?? [];
          const total = projectTasks.length;
          const done = projectTasks.filter((t) => t.status === "DONE").length;
          return {
            ...project,
            taskCount: total,
            progress: total > 0 ? Math.round((done / total) * 100) : 0,
          };
        });
        setProjects(enrichedProjects);
      } catch (fetchError) {
        console.error(fetchError);
      }

      setLoading(false);
    };

    loadDashboardData();
  }, []);

const statCards = [
    {
      label: "Total Projects",
      value: stats?.totalProjects ?? "—",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6 5V4a2 2 0 012-2h4a2 2 0 012 2v1" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      color: "#6366f1",
      bg: "#eef2ff",
    },
    {
      label: "Open Issues",
      value: stats?.openIssues ?? stats?.totalTasks ?? "—",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 6.5v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <circle cx="10" cy="13" r="0.9" fill="currentColor"/>
        </svg>
      ),
      color: "#ef4444",
      bg: "#fef2f2",
    },
    {
      label: "In Progress",
      value: stats?.inProgress ?? stats?.inProgressTasks ?? "—",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 2"/>
          <path d="M10 6v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "#f97316",
      bg: "#fff7ed",
    },
    {
      label: "Completed",
      value: stats?.completed ?? stats?.completedTasks ?? "—",
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M6.5 10l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      color: "#22c55e",
      bg: "#f0fdf4",
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
                <span
                  className="db-stat-icon"
                  style={{ background: statCard.bg, color: statCard.color }}
                >
                  {statCard.icon}
                </span>
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
