import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getProjects, getProjectMembers } from "../services/projectService";
import { getTasks } from "../services/taskService";
import { getUsers } from "../services/userService";
import { canManageProjects, hasRole } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import "./Backlog.css";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return "";

  const millisecondsDiff = Date.now() - new Date(dateStr).getTime();
  const daysDiff = Math.floor(millisecondsDiff / 86400000);

  if (daysDiff === 0) return "Today";
  if (daysDiff === 1) return "Yesterday";
  if (daysDiff < 7) return `${daysDiff}d ago`;
  if (daysDiff < 30) return `${Math.floor(daysDiff / 7)}w ago`;
  return `${Math.floor(daysDiff / 30)}mo ago`;
}

const STATUS_LABELS = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const STATUS_COLORS = {
  TODO: "#94a3b8",
  IN_PROGRESS: "#6366f1",
  IN_REVIEW: "#f97316",
  DONE: "#22c55e",
};

// Colors for priority badges
const PRIORITY_COLORS = {
  LOW: "#22c55e",
  MEDIUM: "#f97316",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
};

// Arrow icons for each priority
const PRIORITY_ICONS = {
  LOW: "↓",
  MEDIUM: "→",
  HIGH: "↑",
  CRITICAL: "⬆",
};

export default function Backlog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentUser = getStoredUser();
  const canManage = canManageProjects();
  const isAdmin = hasRole("ADMIN");

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState(
    searchParams.get("project") || "",
  );
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [collapsed, setCollapsed] = useState({});

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [allProjects, userList] = await Promise.all([
          getProjects(),
          getUsers(),
        ]);

        // Filter to workspace projects only
        let myProjects;
        if (isAdmin) {
          myProjects = allProjects.filter(
            (p) => String(p.createdById) === String(currentUser.id),
          );
        } else {
          const memberLists = await Promise.all(
            allProjects.map((p) =>
              getProjectMembers(p.id).catch(() => []),
            ),
          );
          myProjects = allProjects.filter((_, i) =>
            memberLists[i].some(
              (m) => String(m.userId ?? m.user?.id) === String(currentUser.id),
            ),
          );
        }

        // Load tasks only from workspace projects
        const taskLists = await Promise.all(
          myProjects.map((p) =>
            getTasks(p.id)
              .then((tasks) =>
                tasks.map((t) => ({
                  ...t,
                  projectId: t.projectId ?? p.id,
                  projectName: t.projectName ?? p.name,
                })),
              )
              .catch(() => []),
          ),
        );

        setTasks(taskLists.flat());
        setProjects(myProjects);
        setUsers(userList);
      } catch (error) {
        console.error("Failed to load backlog data:", error);
      }
      setLoading(false);
    };

    loadAllData();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (search) {
      const titleMatches = task.title
        ?.toLowerCase()
        .includes(search.toLowerCase());
      const idMatches = String(task.id).includes(search);
      if (!titleMatches && !idMatches) return false;
    }

    if (filterProject) {
      const taskProjectId = task.projectId ?? task.project?.id;
      if (String(taskProjectId) !== String(filterProject)) return false;
    }

    if (filterStatus && task.status !== filterStatus) return false;
    if (filterPriority && task.priority !== filterPriority) return false;

    if (filterAssignee) {
      const taskAssigneeId = task.assignedToId ?? task.assignedTo?.id;
      if (String(taskAssigneeId) !== String(filterAssignee)) return false;
    }

    return true;
  });

  const statusGroups = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

  const getTasksForStatus = (statusCode) => {
    return filteredTasks.filter((task) => task.status === statusCode);
  };

  // Toggle a status group open/closed
  const toggleGroup = (statusCode) => {
    setCollapsed((current) => ({
      ...current,
      [statusCode]: !current[statusCode],
    }));
  };

  // Get the project name for a task
  const getProjectName = (task) => {
    const taskProjectId = task.projectId ?? task.project?.id;
    const matchedProject = projects.find(
      (p) => String(p.id) === String(taskProjectId),
    );
    return matchedProject?.name || task.projectName || "—";
  };

  // Get the assignee name for a task
  const getAssigneeName = (task) => {
    const taskAssigneeId = task.assignedToId ?? task.assignedTo?.id;
    const matchedUser = users.find(
      (u) => String(u.id) === String(taskAssigneeId),
    );
    return (
      matchedUser?.name || matchedUser?.username || task.assigneeName || "—"
    );
  };

  const getAssigneeInitials = (task) => {
    const fullName = getAssigneeName(task);
    if (fullName === "—") return "?";
    return fullName
      .split(" ")
      .map((namePart) => namePart[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const clearFilters = () => {
    setSearch("");
    setFilterProject("");
    setFilterStatus("");
    setFilterPriority("");
    setFilterAssignee("");
  };

  const hasActiveFilters =
    search || filterProject || filterStatus || filterPriority || filterAssignee;

  return (
    <div className="bl-layout">
      <Sidebar />

      <div className="bl-main">
        <header className="bl-header">
          <div className="bl-header-left">
            <h1 className="bl-title">Backlog</h1>
            <span className="bl-count">{filteredTasks.length} issues</span>
          </div>

          {canManage && (
            <button
              className="bl-create-btn"
              onClick={() => navigate("/board")}
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path
                  d="M7 1v12M1 7h12"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
              Create Issue
            </button>
          )}
        </header>

        {/* Filter bar */}
        <div className="bl-filters">
          <div className="bl-search-wrap">
            <svg
              className="bl-search-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M11 11l3 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="bl-search"
              placeholder="Search issues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bl-select"
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>

          <select
            className="bl-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            {statusGroups.map((statusCode) => (
              <option key={statusCode} value={statusCode}>
                {STATUS_LABELS[statusCode]}
              </option>
            ))}
          </select>

          <select
            className="bl-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">All Priorities</option>
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((priorityLevel) => (
              <option key={priorityLevel} value={priorityLevel}>
                {priorityLevel}
              </option>
            ))}
          </select>

          <select
            className="bl-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
          >
            <option value="">All Assignees</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.username}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button className="bl-clear-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* Backlog issue groups */}
        <div className="bl-body">
          {loading ? (
            <div className="bl-loading">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="bl-skeleton-row" />
              ))}
            </div>
          ) : (
            statusGroups.map((statusCode) => {
              const groupTasks = getTasksForStatus(statusCode);
              const isCollapsed = collapsed[statusCode];

              return (
                <div key={statusCode} className="bl-group">
                  {/* Group header — click to collapse/expand */}
                  <div
                    className="bl-group-header"
                    onClick={() => toggleGroup(statusCode)}
                  >
                    <span
                      className={`bl-group-arrow ${isCollapsed ? "" : "open"}`}
                    >
                      ›
                    </span>
                    <span
                      className="bl-group-dot"
                      style={{ background: STATUS_COLORS[statusCode] }}
                    />
                    <span className="bl-group-label">
                      {STATUS_LABELS[statusCode]}
                    </span>
                    <span className="bl-group-count">{groupTasks.length}</span>
                  </div>

                  {!isCollapsed && (
                    <div className="bl-issue-list">
                      {groupTasks.length === 0 ? (
                        <div className="bl-empty-group">No issues</div>
                      ) : (
                        <>
                          <div className="bl-row bl-row-head">
                            <span className="bl-col-type" />
                            <span className="bl-col-key">Key</span>
                            <span className="bl-col-title">Summary</span>
                            <span className="bl-col-project">Project</span>
                            <span className="bl-col-priority">Priority</span>
                            <span className="bl-col-assignee">Assignee</span>
                            <span className="bl-col-due">Due</span>
                          </div>

                          {groupTasks.map((task) => (
                            <div
                              key={task.id}
                              className="bl-row bl-row-item"
                              onClick={() => navigate(`/board?open=${task.id}`)}
                            >
                              <span className="bl-col-type">
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <rect
                                    x="1"
                                    y="1"
                                    width="14"
                                    height="14"
                                    rx="3"
                                    fill="#6366f1"
                                    opacity=".15"
                                  />
                                  <path
                                    d="M5 8h6M8 5v6"
                                    stroke="#6366f1"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                              </span>

                              <span className="bl-col-key bl-issue-key">
                                #{task.id}
                              </span>

                              <span className="bl-col-title bl-issue-title">
                                {task.title}
                              </span>

                              <span className="bl-col-project bl-issue-project">
                                {getProjectName(task)}
                              </span>

                              <span className="bl-col-priority">
                                <span
                                  className="bl-priority-badge"
                                  style={{
                                    color:
                                      PRIORITY_COLORS[task.priority] ||
                                      "#94a3b8",
                                    background:
                                      (PRIORITY_COLORS[task.priority] ||
                                        "#94a3b8") + "18",
                                  }}
                                >
                                  {PRIORITY_ICONS[task.priority] || "—"}{" "}
                                  {task.priority || "—"}
                                </span>
                              </span>

                              <span className="bl-col-assignee">
                                <span
                                  className="bl-assignee-chip"
                                  title={getAssigneeName(task)}
                                >
                                  {getAssigneeInitials(task)}
                                </span>
                              </span>

                              <span className="bl-col-due bl-due-date">
                                {task.dueDate ? timeAgo(task.dueDate) : "—"}
                              </span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
