import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { canManageProjects } from "../utils/auth";
import { getTasks, createTask, updateTask, deleteTask } from "../services/taskService";
import { getComments, createComment, updateComment, deleteComment } from "../services/commentService";
import { getActivity, logActivity as logActivityApi } from "../services/activityService";
import { getProjects, getProjectMembers } from "../services/projectService";
import { getUsers } from "../services/userService";
import Sidebar from "../components/Sidebar";
import ConfirmModal from "../components/ConfirmModal";
import "./Tasks.css";

// Read the stored user from localStorage
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch (error) {
    return {};
  }
}

// Convert a date string to a human-readable "time ago" string
function timeAgo(dateStr) {
  if (!dateStr) return "";

  const millisecondsDiff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(Math.abs(millisecondsDiff) / 60000);
  const daysDiff = Math.floor(millisecondsDiff / 86400000);

  if (millisecondsDiff >= 0) {
    // Past dates
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (daysDiff === 0) return `${Math.floor(mins / 60)}h ago`;
    if (daysDiff === 1) return "Yesterday";
    if (daysDiff < 30) return `${daysDiff}d ago`;
    return `${Math.floor(daysDiff / 30)}mo ago`;
  } else {
    // Future dates
    const futureDays = Math.abs(daysDiff);
    if (futureDays === 0) return `${Math.floor(mins / 60)}h left`;
    if (futureDays === 1) return "1d left";
    if (futureDays < 30) return `${futureDays}d left`;
    return `${Math.floor(futureDays / 30)}mo left`;
  }
}

// The four Kanban columns
const COLUMNS = [
  { id: "TODO", label: "To Do", color: "#94a3b8" },
  { id: "IN_PROGRESS", label: "In Progress", color: "#6366f1" },
  { id: "IN_REVIEW", label: "In Review", color: "#f97316" },
  { id: "DONE", label: "Done", color: "#22c55e" },
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const PRIORITY_COLOR = {
  LOW: "#94a3b8",
  MEDIUM: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#7c3aed",
};

const PRIORITY_ICON = {
  LOW: "↓",
  MEDIUM: "→",
  HIGH: "↑",
  CRITICAL: "⬆",
};

// Default values for the create/edit task form
const emptyForm = {
  title: "",
  description: "",
  priority: "MEDIUM",
  status: "TODO",
  projectId: "",
  assignedToId: "",
  dueDate: "",
};

// Allowed status transitions for regular (non-manager) users
const USER_STATUS_FLOW = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["IN_REVIEW", "DONE"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: [],
};

// A single task card shown on the Kanban board
function TaskCard({ task, onEdit, onDelete, canManage, isOwner }) {
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const isOverdue = dueDate && dueDate < new Date() && task.status !== "DONE";
  const dueDateStr = task.dueDate ? timeAgo(task.dueDate) : null;

  const assigneeName =
    task.assigneeName ||
    task.assignedTo?.username ||
    task.assignedTo?.name ||
    null;

  const assigneeInitials = assigneeName
    ? assigneeName
        .split(" ")
        .map((namePart) => namePart[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : null;

  const isClickable = canManage || isOwner;

  return (
    <div
      className={`tk-card${isClickable ? " tk-card-clickable" : ""}${isOverdue ? " tk-card-overdue" : ""}`}
      onClick={() => isClickable && onEdit(task)}
    >
      <div className="tk-card-top">
        <span className="tk-card-type-icon" title="Task">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="12" rx="2.5" fill="#6366f1" opacity=".15" />
            <path d="M4 7h6M7 4v6" stroke="#6366f1" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        <span className="tk-card-id">TASK-{task.id}</span>

        <div className="tk-card-actions">
          {canManage && (
            <button
              className="tk-card-del"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              title="Delete task"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 2l8 8M10 2L2 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      <p className="tk-card-title">{task.title}</p>

      <div className="tk-card-footer">
        <span
          className="tk-priority-flag"
          style={{ color: PRIORITY_COLOR[task.priority] || "#94a3b8" }}
          title={task.priority}
        >
          <span className="tk-priority-icon">{PRIORITY_ICON[task.priority] || "—"}</span>
          <span className="tk-priority-txt">{task.priority || "—"}</span>
        </span>

        {dueDateStr && (
          <span className={`tk-due${isOverdue ? " tk-due-overdue" : ""}`} title="Due date">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {dueDateStr}
          </span>
        )}

        {assigneeInitials ? (
          <span className="tk-assignee" title={assigneeName}>
            {assigneeInitials}
          </span>
        ) : (
          <span className="tk-assignee tk-assignee-empty" title="Unassigned">
            ?
          </span>
        )}
      </div>
    </div>
  );
}

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectMembersCache, setProjectMembersCache] = useState({}); // projectId -> [{id,name}]

  const [showModal, setShowModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // taskId
  const [drawerTask, setDrawerTask] = useState(null);

  const [comments, setComments] = useState([]);
  const [comment, setComment] = useState("");
  const [editingComment, setEditingComment] = useState(null);

  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [searchParams] = useSearchParams();
  const [filterProject, setFilterProject] = useState(searchParams.get("project") || "");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
const [filterSearch, setFilterSearch] = useState("");
  const [dragOverCol, setDragOverCol] = useState(null);
  const [view, setView] = useState("kanban");

  const [activityLogs, setActivityLogs] = useState([]);
  const [activeTab, setActiveTab] = useState("all");

  const canManage = canManageProjects();
  const user = getStoredUser();

  useEffect(() => {
    loadAllData();
  }, []);

  // Load project members when the selected project changes
  useEffect(() => {
    if (filterProject) {
      loadProjectMembers(filterProject);
    }
  }, [filterProject]);

  const normalizeTasks = (taskList) =>
    taskList.map((task) => ({
      ...task,
      projectId:   task.projectId   ?? task.project?.id       ?? null,
      assignedToId:task.assignedToId?? task.assignedTo?.id    ?? null,
      assigneeName:task.assigneeName?? task.assignedTo?.username ?? task.assignedTo?.name ?? null,
      projectName: task.projectName ?? task.project?.name     ?? null,
      status:   task.status   ?? "TODO",
      priority: task.priority ?? "MEDIUM",
    }));

  const injectProjectInfo = (normalizedTasks, projectList) =>
    normalizedTasks.map((t) => {
      if (t.projectId && t.projectName) return t;
      const proj = projectList.find((p) => String(p.id) === String(t.projectId));
      return {
        ...t,
        projectName: t.projectName || proj?.name || null,
      };
    });


  const loadAllData = async () => {
    setLoading(true);
    try {
      const [allProjects, userList] = await Promise.all([
        getProjects(),
        getUsers(),
      ]);

      // Admins see all projects; members see only projects they belong to
      let myProjects = allProjects;
      if (!canManage && user.id) {
        const memberLists = await Promise.all(
          allProjects.map((p) =>
            getProjectMembers(p.id).catch(() => [])
          )
        );
        myProjects = allProjects.filter((_, i) =>
          memberLists[i].some(
            (m) => String(m.userId ?? m.user?.id ?? m.id) === String(user.id)
          )
        );
      }

      // Load tasks only from the user's projects
      const taskLists = await Promise.all(
        myProjects.map((p) =>
          getTasks(p.id)
            .then((tasks) => tasks.map((t) => ({ ...t, projectId: t.projectId ?? p.id, projectName: t.projectName ?? p.name })))
            .catch(() => [])
        )
      );

      const allTasks = taskLists.flat();
      const normalized = normalizeTasks(allTasks);
      setTasks(injectProjectInfo(normalized, myProjects));
      setProjects(myProjects);
      setUsers(userList.map((u) => ({
        id: u.id,
        name: u.name || u.username || u.email || `User #${u.id}`,
      })));
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  // Load activity logs for a specific task
  const fetchActivityLogs = (taskId) => {
    getActivity("TASK", taskId)
      .then((logs) => setActivityLogs(logs))
      .catch(() => {});
  };

  // Post an activity log entry to the backend
  const logActivity = (taskId, action, extra = {}) => {
    logActivityApi({
      userId: Number(user.id),
      action,
      entityType: "TASK",
      entityId: taskId,
      taskId,
      ...extra,
    }).catch(() => {});
  };

  const openCreate = (overrides = {}) => {
    setEditingTask(null);
    setFormData({ ...emptyForm, ...overrides });
    if (overrides.projectId) loadProjectMembers(overrides.projectId);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTask(null);
    setFormData(emptyForm);
  };

  // Open the task detail drawer and load its comments and activity
  const openEdit = (task) => {
    const pid = task.projectId ?? task.project?.id;
    setDrawerTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "MEDIUM",
      status: task.status || "TODO",
      projectId: pid ?? "",
      assignedToId: task.assignedToId ?? task.assignedTo?.id ?? "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setEditingTask(task);
    setComments([]);
    setComment("");
    setEditingComment(null);
    setActivityLogs([]);
    setShowDrawer(true);

    getComments(task.id)
      .then((commentList) => setComments(commentList))
      .catch(() => {});

    fetchActivityLogs(task.id);

    // Load team members for this task's project (for the assignee dropdown)
    if (pid) loadProjectMembers(pid);
  };

  const closeDrawer = () => {
    setShowDrawer(false);
    setDrawerTask(null);
    setEditingTask(null);
    setFormData(emptyForm);
    setComment("");
    setComments([]);
    setEditingComment(null);
    setActivityLogs([]);
  };

  const fetchComments = (taskId) => {
    getComments(taskId)
      .then((commentList) => setComments(commentList))
      .catch(() => {});
  };

  const handleCommentSave = async () => {
    if (!comment.trim() || !drawerTask) return;

    try {
      const response = await createComment({
        content: comment.trim(),
        taskId: drawerTask.id,
        userId: user.id,
      });

      if (response.ok) {
        logActivity(drawerTask.id, "COMMENT_ADDED");
        setComment("");
        fetchComments(drawerTask.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentEdit = async (commentId) => {
    if (!editingComment?.content?.trim()) return;

    try {
      const response = await updateComment(commentId, {
        content: editingComment.content,
      });

      if (response.ok) {
        logActivity(drawerTask.id, "COMMENT_UPDATED");
        setEditingComment(null);
        fetchComments(drawerTask.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      const response = await deleteComment(commentId);

      if (response.ok || response.status === 204) {
        logActivity(drawerTask.id, "COMMENT_DELETED");
        fetchComments(drawerTask.id);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Handle form submission for creating or editing a task
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build the payload — managers can set all fields; others can only change status
    let payload;
    if (canManage) {
      payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        projectId: formData.projectId ? Number(formData.projectId) : null,
        createdById: user.id ? Number(user.id) : null,
        assignedToId: formData.assignedToId ? Number(formData.assignedToId) : null,
        parentTaskId: null,
        dueDate: formData.dueDate ? `${formData.dueDate}T18:00:00` : null,
      };
    } else {
      payload = { ...editingTask, status: formData.status };
    }

    try {
      let response;
      if (editingTask) {
        response = await updateTask(editingTask.id, payload);
      } else {
        response = await createTask(payload);
      }

      if (response.ok) {
        const savedTask = await response.json().catch(() => null);
        const taskId = savedTask?.id ?? editingTask?.id;

        if (taskId) {
          logActivity(taskId, editingTask ? "TASK_UPDATED" : "TASK_CREATED");
        }

        loadAllData();
        closeModal();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Save changes from inside the task detail drawer
  const handleDrawerSave = async () => {
    if (!editingTask) return;

    let payload;
    if (canManage) {
      payload = {
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        projectId: formData.projectId ? Number(formData.projectId) : null,
        createdById: editingTask.createdById ?? (user.id ? Number(user.id) : null),
        assignedToId: formData.assignedToId ? Number(formData.assignedToId) : null,
        parentTaskId: null,
        dueDate: formData.dueDate ? `${formData.dueDate}T18:00:00` : null,
      };
    } else {
      payload = { ...editingTask, status: formData.status };
    }

    try {
      const response = await updateTask(editingTask.id, payload);

      if (response.ok) {
        logActivity(editingTask.id, "TASK_UPDATED");
        loadAllData();
        closeDrawer();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async () => {
    const taskId = deleteTarget;
    setDeleteTarget(null);
    try {
      const response = await deleteTask(taskId);

      if (response.ok || response.status === 204) {
        logActivity(taskId, "TASK_DELETED");
        loadAllData();
      }
    } catch (error) {
      console.error(error);
    }
  };

  // Handle dropping a task card onto a different column (status change)
  const handleStatusDrop = async (taskId, newStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Regular users can only move tasks to allowed next statuses
    if (!canManage) {
      const allowedNextStatuses = USER_STATUS_FLOW[task.status] ?? [];
      if (!allowedNextStatuses.includes(newStatus)) return;
    }

    try {
      await updateTask(taskId, {
        ...task,
        status: newStatus,
        assignedToId: task.assignedToId ?? null,
      });

      logActivity(taskId, "STATUS_CHANGED", {
        oldStatus: task.status,
        newStatus: newStatus,
      });

      // Update the task status in local state immediately (no need to reload all data)
      setTasks((previousTasks) =>
        previousTasks.map((t) =>
          t.id === taskId ? { ...t, status: newStatus } : t
        )
      );
    } catch (error) {
      console.error(error);
    }
  };

  // Apply non-project filters (priority, assignee, search) to a task list
  const applySecondaryFilters = (taskList) =>
    taskList.filter((task) => {
      if (filterPriority && task.priority !== filterPriority) return false;
      if (filterAssignee && String(task.assignedToId) !== String(filterAssignee)) return false;
      if (filterSearch) {
        const q = filterSearch.toLowerCase();
        if (!task.title?.toLowerCase().includes(q) && !String(task.id).includes(filterSearch)) return false;
      }
      return true;
    });

  // Filter tasks based on the active filter dropdowns and search text
  const filtered = applySecondaryFilters(tasks).filter((task) => {
    if (filterProject && String(task.projectId) !== String(filterProject)) return false;
    return true;
  });

  // Count for each project tab (respects search/priority/assignee but not project filter)
  const getProjectCount = (projectId) =>
    applySecondaryFilters(tasks).filter((t) => String(t.projectId) === String(projectId)).length;

  // Fetch team members for a project and cache them (keyed by projectId)
  const loadProjectMembers = async (projectId) => {
    if (!projectId || projectMembersCache[projectId]) return;
    try {
      const members = await getProjectMembers(projectId);
      const mapped = members.map(m => ({
        id:   m.user?.id   ?? m.userId,
        name: m.user?.username || m.user?.name || m.user?.email || `User #${m.user?.id ?? m.userId}`,
      }));
      setProjectMembersCache(prev => ({ ...prev, [projectId]: mapped }));
    } catch {
      setProjectMembersCache(prev => ({ ...prev, [projectId]: [] }));
    }
  };

  // Return the team members for the selected project.
  // Falls back to all users when no project is selected or members not yet loaded.
  const getUsersForProject = (projectId) => {
    if (!projectId) return users;
    const members = projectMembersCache[projectId];
    if (members && members.length > 0) return members;
    return users;
  };

  const hasActiveFilters = filterProject || filterPriority || filterAssignee || filterSearch;

  const clearFilters = () => {
    setFilterProject("");
    setFilterPriority("");
    setFilterAssignee("");
    setFilterSearch("");
  };

  // Get all tasks for a specific Kanban column
  const getTasksByStatus = (status) =>
    filtered.filter((task) => task.status === status);

  if (loading) {
    return <div className="tk-loading">Loading tasks...</div>;
  }

  return (
    <div className="tk-layout">
      <Sidebar />

      <main className="tk-main">
        {/* Top bar: page title + create button */}
        <header className="tk-topbar">
          <div className="tk-topbar-left">
            <h1 className="tk-page-title">Board</h1>
            <span className="tk-task-count">{filtered.length} issues</span>
          </div>

          <div className="tk-topbar-right">
            {canManage && (
              <button
                className="tk-create-btn"
                onClick={() => openCreate(filterProject ? { projectId: filterProject } : {})}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Create
              </button>
            )}
          </div>
        </header>

        {/* Project tabs */}
        {projects.length > 0 && (
          <div className="tk-project-tabs">
            <button
              className={`tk-project-tab${!filterProject ? " active" : ""}`}
              onClick={() => setFilterProject("")}
            >
              All Projects
              <span className="tk-tab-count">{applySecondaryFilters(tasks).length}</span>
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                className={`tk-project-tab${filterProject === String(p.id) ? " active" : ""}`}
                onClick={() => setFilterProject(String(p.id))}
              >
                {p.name}
                <span className="tk-tab-count">{getProjectCount(p.id)}</span>
              </button>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div className="tk-filterbar">
          <div className="tk-search-wrap">
            <svg className="tk-search-icon" width="13" height="13" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              className="tk-search-input"
              placeholder="Search issues..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
            />
          </div>

          <div className="tk-filter-divider" />

          <select
            className="tk-filter"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
          >
            <option value="">Priority</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>

          {/* Assignee filter — only shown to managers */}
          {canManage && (
            <select
              className="tk-filter"
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
            >
              <option value="">Assignee</option>
              {getUsersForProject(filterProject).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username || u.name}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button className="tk-clear-btn" onClick={clearFilters}>
              Clear filters
            </button>
          )}

          <div className="tk-filter-divider" style={{ marginLeft: "auto" }} />

          {/* View toggle: Kanban or List */}
          <div className="tk-view-toggle">
            <button
              className={view === "kanban" ? "active" : ""}
              onClick={() => setView("kanban")}
              title="Board view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="0" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="5" y="0" width="4" height="14" rx="1" fill="currentColor" opacity=".5" />
                <rect x="10" y="0" width="4" height="14" rx="1" fill="currentColor" opacity=".3" />
              </svg>
              Board
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
              title="List view"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="0" y="1" width="14" height="2.5" rx="1" fill="currentColor" />
                <rect x="0" y="5.5" width="14" height="2.5" rx="1" fill="currentColor" opacity=".6" />
                <rect x="0" y="10" width="14" height="2.5" rx="1" fill="currentColor" opacity=".4" />
              </svg>
              List
            </button>
          </div>
        </div>

        {/* Kanban board view */}
        {view === "kanban" && (
          <div className="tk-board">
            {COLUMNS.map((column) => (
              <div
                key={column.id}
                className={`tk-column${dragOverCol === column.id ? " tk-column-dragover" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault(); // required to allow dropping
                  setDragOverCol(column.id);
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => {
                  setDragOverCol(null);
                  const droppedTaskId = parseInt(e.dataTransfer.getData("taskId"));
                  handleStatusDrop(droppedTaskId, column.id);
                }}
              >
                {/* Column header */}
                <div className="tk-col-header">
                  <span className="tk-col-dot" style={{ background: column.color }} />
                  <span className="tk-col-label">{column.label}</span>
                  <span className="tk-col-count">{getTasksByStatus(column.id).length}</span>
                </div>

                {/* Task cards */}
                <div className="tk-col-body">
                  {getTasksByStatus(column.id).map((task) => {
                    const isOwner = String(task.assignedToId) === String(user.id);
                    const isDraggable = canManage || isOwner;

                    return (
                      <div
                        key={task.id}
                        draggable={isDraggable}
                        onDragStart={(e) => {
                          if (isDraggable) {
                            e.dataTransfer.setData("taskId", task.id);
                          }
                        }}
                      >
                        <TaskCard
                          task={task}
                          onEdit={openEdit}
                          onDelete={handleDelete}
                          canManage={canManage}
                          isOwner={isOwner}
                        />
                      </div>
                    );
                  })}

                  {/* Empty column placeholder */}
                  {getTasksByStatus(column.id).length === 0 && (
                    <div className="tk-empty-col">
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <rect
                          x="4" y="4" width="24" height="24" rx="6"
                          stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3"
                        />
                      </svg>
                      <span>Drop issues here</span>
                    </div>
                  )}
                </div>

                {/* Create button at the bottom of each column — managers only */}
                {canManage && (
                  <button
                    className="tk-col-create"
                    onClick={() => openCreate({ status: column.id })}
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    Create
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* List view */}
        {view === "list" && (
          <div className="tk-list-view">
            <div className="tk-list-header">
              <span>Title</span>
              <span>Status</span>
              <span>Priority</span>
              <span>Assignee</span>
              <span>Project</span>
              <span>Due</span>
              {canManage && <span></span>}
            </div>

            {filtered.length === 0 && (
              <div className="tk-empty-list">No tasks found</div>
            )}

            {filtered.map((task) => {
              const assigneeName = task.assigneeName || task.assignedTo?.username || task.assignedTo?.name || null;
              const assigneeInitials = assigneeName
                ? assigneeName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
                : null;
              const dueDate = task.dueDate ? new Date(task.dueDate) : null;
              const isOverdue = dueDate && dueDate < new Date() && task.status !== "DONE";
              return (
                <div key={task.id} className="tk-list-row" onClick={() => openEdit(task)}>
                  <span className="tk-list-title">
                    <span
                      className="tk-priority-dot"
                      style={{ background: PRIORITY_COLOR[task.priority] || "#94a3b8" }}
                    />
                    <span className="tk-list-title-text">{task.title}</span>
                  </span>

                  <span>
                    <span className={`tk-status-badge s-${task.status?.toLowerCase().replace(/_/g, "-")}`}>
                      {task.status?.replace(/_/g, " ")}
                    </span>
                  </span>

                  <span>
                    <span className={`tk-priority-badge p-${task.priority?.toLowerCase()}`}>
                      {task.priority}
                    </span>
                  </span>

                  <span className="tk-list-assignee">
                    {assigneeInitials ? (
                      <>
                        <span className="tk-list-assignee-avatar">{assigneeInitials}</span>
                        <span className="tk-list-assignee-name">{assigneeName}</span>
                      </>
                    ) : (
                      <span className="tk-list-unassigned">—</span>
                    )}
                  </span>

                  <span className="tk-list-project">
                    {task.projectName ||
                      projects.find((p) => String(p.id) === String(task.projectId))?.name ||
                      "—"}
                  </span>

                  <span className={`tk-list-due${isOverdue ? " tk-list-due--overdue" : ""}`}>
                    {task.dueDate ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                        </svg>
                        {timeAgo(task.dueDate)}
                      </>
                    ) : "—"}
                  </span>

                  {canManage && (
                    <span className="tk-list-action" onClick={(e) => e.stopPropagation()}>
                      <button className="tk-del-btn" onClick={() => setDeleteTarget(task.id)}>
                        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                          <path d="M2 4h10M5 4V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5V4M6 7v3M8 7v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                          <path d="M3 4l.7 7.3A1 1 0 004.7 12h4.6a1 1 0 001-.93L11 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      </button>
                    </span>
                  )}

                  {/* Mobile-only card layout */}
                  <div className="tk-list-mobile-meta">
                    <div className="tk-mobile-top">
                      <div className="tk-mobile-title">
                        <span
                          className="tk-priority-dot"
                          style={{ background: PRIORITY_COLOR[task.priority] || "#94a3b8" }}
                        />
                        <span className="tk-mobile-title-text">{task.title}</span>
                      </div>
                      <span className={`tk-status-badge s-${task.status?.toLowerCase().replace(/_/g, "-")}`}>
                        {task.status?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="tk-mobile-bottom">
                      <span className={`tk-priority-badge p-${task.priority?.toLowerCase()}`}>
                        {PRIORITY_ICON[task.priority]} {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className={`tk-list-due${isOverdue ? " tk-list-due--overdue" : ""}`}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                            <path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                          </svg>
                          {timeAgo(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Task Detail Drawer (slides in from the right) */}
      {showDrawer && drawerTask && (
        <div className="tk-drawer-overlay" onClick={closeDrawer}>
          <div className="tk-drawer" onClick={(e) => e.stopPropagation()}>

            {/* Drawer header: project name / task ID + close and delete buttons */}
            <div className="tk-drawer-header">
              <div className="tk-drawer-breadcrumb">
                <span className="tk-drawer-project">
                  {projects.find((p) => String(p.id) === String(drawerTask.projectId))?.name || "No Project"}
                </span>
                <span className="tk-drawer-sep">/</span>
                <span className="tk-drawer-taskid">TASK-{drawerTask.id}</span>
              </div>

              <div className="tk-drawer-header-actions">
                {canManage && (
                  <button
                    className="tk-drawer-icon-btn tk-drawer-delete"
                    title="Delete task"
                    onClick={() => {
                      closeDrawer();
                      setDeleteTarget(drawerTask.id);
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  </button>
                )}

                <button className="tk-drawer-icon-btn" onClick={closeDrawer} title="Close">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Drawer body: left (content) and right (details) */}
            <div className="tk-drawer-body">

              {/* Left column: title, description, activity/comments */}
              <div className="tk-drawer-left">

                {/* Task title — editable for managers */}
                {canManage ? (
                  <input
                    className="tk-drawer-title-input"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                ) : (
                  <h2 className="tk-drawer-title">{drawerTask.title}</h2>
                )}

                {/* Description */}
                <div className="tk-drawer-section">
                  <p className="tk-drawer-section-label">Description</p>
                  {canManage ? (
                    <textarea
                      className="tk-drawer-desc-input"
                      rows="4"
                      placeholder="Add a description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  ) : (
                    <p className="tk-drawer-desc-text">
                      {drawerTask.description || "No description provided."}
                    </p>
                  )}
                </div>

                {/* Save / Cancel buttons — below description, managers only */}
                {canManage && (
                  <div className="tk-drawer-save-row">
                    <button className="btn-primary" style={{ padding: "5px 12px", fontSize: "12px", width: "auto" }} onClick={handleDrawerSave}>
                      Save changes
                    </button>
                    <button className="btn-secondary" style={{ padding: "5px 12px", fontSize: "12px", width: "auto" }} onClick={closeDrawer}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Activity section with tab bar */}
                <div className="tk-drawer-section">
                  <p className="tk-drawer-section-label">Activity</p>

                  <div className="tk-tab-bar">
                    {[
                      { id: "all", label: "All" },
                      { id: "comments", label: "Comments" },
                      { id: "history", label: "History" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        className={`tk-tab-btn${activeTab === tab.id ? " tk-tab-btn--active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Comments tab */}
                  {(activeTab === "comments" || activeTab === "all") && (
                    <>
                      {comments.length > 0 && (
                        <div className="tk-comments-list">
                          {comments.map((commentItem) => {
                            const commenterName =
                              commentItem.user?.username ||
                              commentItem.user?.name ||
                              "User";

                            const commenterInitials = commenterName
                              .split(" ")
                              .map((namePart) => namePart[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);

                            const isOwnComment =
                              String(commentItem.user?.id) === String(user.id);

                            return (
                              <div key={commentItem.id} className="tk-comment-item">
                                <div className="tk-drawer-comment-avatar">
                                  {commenterInitials}
                                </div>

                                <div className="tk-comment-body">
                                  <div className="tk-comment-meta">
                                    <span className="tk-comment-author">{commenterName}</span>
                                    <span className="tk-comment-time">
                                      {commentItem.createdAt ? timeAgo(commentItem.createdAt) : ""}
                                    </span>
                                  </div>

                                  {/* Show edit textarea or comment text */}
                                  {editingComment?.id === commentItem.id ? (
                                    <>
                                      <textarea
                                        className="tk-drawer-comment-input"
                                        rows="2"
                                        value={editingComment.content}
                                        onChange={(e) =>
                                          setEditingComment({ ...editingComment, content: e.target.value })
                                        }
                                      />
                                      <div className="tk-drawer-comment-actions" style={{ paddingLeft: 0 }}>
                                        <button
                                          className="btn-primary"
                                          style={{ padding: "5px 12px", fontSize: "12px" }}
                                          onClick={() => handleCommentEdit(commentItem.id)}
                                        >
                                          Save
                                        </button>
                                        <button
                                          className="btn-secondary"
                                          style={{ padding: "5px 12px", fontSize: "12px" }}
                                          onClick={() => setEditingComment(null)}
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <p className="tk-comment-text">{commentItem.content}</p>

                                      {isOwnComment && (
                                        <div className="tk-comment-actions">
                                          <button
                                            onClick={() =>
                                              setEditingComment({
                                                id: commentItem.id,
                                                content: commentItem.content,
                                              })
                                            }
                                          >
                                            Edit
                                          </button>
                                          <button onClick={() => handleCommentDelete(commentItem.id)}>
                                            Delete
                                          </button>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* New comment input */}
                      <div className="tk-drawer-comment-box">
                        <div className="tk-drawer-comment-avatar">
                          {(user.name || "U")
                            .split(" ")
                            .map((namePart) => namePart[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <textarea
                          className="tk-drawer-comment-input"
                          rows="2"
                          placeholder="Add a comment..."
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                      </div>

                      <div className="tk-drawer-comment-actions">
                        <button
                          className="btn-primary"
                          style={{ padding: "4px 10px", fontSize: "11px", width: "auto" }}
                          onClick={handleCommentSave}
                        >
                          Add
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: "4px 10px", fontSize: "11px", width: "auto" }}
                          onClick={() => setComment("")}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}

                  {/* History/Activity logs tab */}
                  {(activeTab === "history" || activeTab === "all") && (
                    <>
                      {activityLogs.length === 0 ? (
                        activeTab === "history" && (
                          <p className="tk-activity-empty">No activity recorded yet.</p>
                        )
                      ) : (
                        <div className="tk-activity-list">
                          {activityLogs.map((log, index) => {
                            const actorName =
                              log.user?.username || log.user?.email || "System";

                            const actorInitials = actorName
                              .split(" ")
                              .map((namePart) => namePart[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2);

                            // Convert action code to a human-readable label
                            let actionLabel;
                            switch (log.action) {
                              case "TASK_CREATED":    actionLabel = "created the task";    break;
                              case "TASK_UPDATED":    actionLabel = "updated the task";    break;
                              case "TASK_DELETED":    actionLabel = "deleted the task";    break;
                              case "STATUS_CHANGED":  actionLabel = "updated the Status";  break;
                              case "COMMENT_ADDED":   actionLabel = "added a comment";     break;
                              case "COMMENT_UPDATED": actionLabel = "edited a comment";    break;
                              case "COMMENT_DELETED": actionLabel = "deleted a comment";   break;
                              default:
                                actionLabel = log.description || log.action || "made a change";
                            }

                            const hasStatusChange = log.oldStatus || log.newStatus;
                            const oldStatusValue = log.oldStatus || "None";
                            const newStatusValue = log.newStatus || "—";

                            return (
                              <div key={log.id ?? index} className="tk-activity-item">
                                <div className="tk-activity-avatar">{actorInitials}</div>

                                <div className="tk-activity-content">
                                  <div className="tk-activity-text">
                                    <strong>{actorName}</strong> {actionLabel}
                                  </div>
                                  <div className="tk-activity-meta">{timeAgo(log.createdAt)}</div>

                                  {hasStatusChange && (
                                    <div className="tk-activity-change">
                                      <span className="tk-change-old">{oldStatusValue}</span>
                                      <span className="tk-change-arrow">→</span>
                                      <span className="tk-change-new">{newStatusValue}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>

              {/* Right column: status, assignee, priority, project, due date */}
              <div className="tk-drawer-right">

                {/* Status */}
                <div className="tk-drawer-detail-row">
                  <span className="tk-drawer-detail-label">Status</span>
                  <select
                    className="tk-drawer-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={!canManage && !USER_STATUS_FLOW[drawerTask.status]?.length}
                  >
                    {COLUMNS.map((col) => {
                      if (!canManage) {
                        const allowedStatuses = USER_STATUS_FLOW[drawerTask.status] ?? [];
                        const isCurrentStatus = col.id === drawerTask.status;
                        return (
                          <option
                            key={col.id}
                            value={col.id}
                            disabled={!isCurrentStatus && !allowedStatuses.includes(col.id)}
                          >
                            {col.label}
                          </option>
                        );
                      }
                      return (
                        <option key={col.id} value={col.id}>
                          {col.label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Assignee */}
                <div className="tk-drawer-detail-row">
                  <span className="tk-drawer-detail-label">Assignee</span>
                  {canManage ? (
                    <select
                      className="tk-drawer-select"
                      value={formData.assignedToId}
                      onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                    >
                      <option value="">Unassigned</option>
                      {getUsersForProject(formData.projectId).map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="tk-drawer-detail-value">
                      {drawerTask.assigneeName || "Unassigned"}
                    </span>
                  )}
                  {(() => {
                    const pid = drawerTask.projectId ?? drawerTask.project?.id;
                    const proj = projects.find(p => String(p.id) === String(pid));
                    return proj?.team?.name ? (
                      <span className="tk-assignee-team">{proj.team.name}</span>
                    ) : null;
                  })()}
                </div>

                {/* Priority */}
                <div className="tk-drawer-detail-row">
                  <span className="tk-drawer-detail-label">Priority</span>
                  {canManage ? (
                    <select
                      className="tk-drawer-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      {PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  ) : (
                    <span className={`tk-priority-badge p-${drawerTask.priority?.toLowerCase()}`}>
                      {drawerTask.priority}
                    </span>
                  )}
                </div>

                {/* Project */}
                <div className="tk-drawer-detail-row">
                  <span className="tk-drawer-detail-label">Project</span>
                  {canManage ? (
                    <select
                      className="tk-drawer-select"
                      value={formData.projectId}
                      onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                    >
                      <option value="">None</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>{project.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="tk-drawer-detail-value">
                      {projects.find((p) => String(p.id) === String(drawerTask.projectId))?.name || "—"}
                    </span>
                  )}
                </div>

                {/* Due Date */}
                <div className="tk-drawer-detail-row">
                  <span className="tk-drawer-detail-label">Due date</span>
                  {canManage ? (
                    <input
                      type="date"
                      className="tk-drawer-select"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  ) : (
                    <span className={`tk-drawer-detail-value${drawerTask.dueDate ? " tk-due-value" : ""}`}>
                      {drawerTask.dueDate ? timeAgo(drawerTask.dueDate) : "None"}
                    </span>
                  )}
                </div>

                {/* "Update Status" button for regular users */}
                {!canManage && (
                  <button
                    className="btn-primary"
                    style={{ padding: "5px 12px", fontSize: "12px", marginTop: "16px" }}
                    onClick={handleDrawerSave}
                  >
                    Update Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content tk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTask ? "Edit Issue" : "Create Issue"}</h2>
              <button onClick={closeModal} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="task-title">Title</label>
                <input
                  id="task-title"
                  name="title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Task title"
                />
              </div>

              <div className="form-group">
                <label htmlFor="task-desc">Description</label>
                <textarea
                  id="task-desc"
                  name="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the task..."
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="task-status">Status</label>
                  <select
                    id="task-status"
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-priority">Priority</label>
                  <select
                    id="task-priority"
                    name="priority"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    {PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="task-project">Project</label>
                  <select
                    id="task-project"
                    name="projectId"
                    value={formData.projectId}
                    onChange={(e) => {
                      const pid = e.target.value;
                      setFormData({ ...formData, projectId: pid, assignedToId: "" });
                      if (pid) loadProjectMembers(pid);
                    }}
                  >
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="task-assignee">Assign To</label>
                  <select
                    id="task-assignee"
                    name="assignedToId"
                    value={formData.assignedToId}
                    onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                  >
                    <option value="">— Unassigned —</option>
                    {getUsersForProject(formData.projectId).map((u) => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="task-due">Due Date</label>
                <input
                  id="task-due"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

export default Tasks;
