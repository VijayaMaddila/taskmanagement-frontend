import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { canManageProjects } from "../utils/auth";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
} from "../services/projectService";
import {
  createTeam,
  addTeamMembers,
  sendInvite,
  assignTeamToProject,
} from "../services/teamService";
import { getUsers } from "../services/userService";
import Sidebar from "../components/Sidebar";
import ConfirmModal from "../components/ConfirmModal";
import "./Projects.css";

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = d - now;
  const isPast = diffMs < 0;
  const absDiff = Math.abs(diffMs);

  const mins = Math.floor(absDiff / 60000);
  const hours = Math.floor(absDiff / 3600000);
  const days = Math.floor(absDiff / 86400000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  let relative;
  if (mins < 60) relative = `${mins} min`;
  else if (hours < 24) relative = `${hours} hr`;
  else if (days < 7) relative = `${days} days`;
  else if (weeks < 5) relative = `${weeks} weeks`;
  else relative = `${months} months`;

  return isPast ? `${relative} ago` : `in ${relative}`;
};

// Colors for avatar circles (matches Team page)
const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];

// Read the stored user from localStorage
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function Projects() {
  const [projects, setProjects] = useState([]);
  const [projectMembers, setProjectMembers] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    slackWebhookUrl: "",
    teamName: "",
  });
  const [modalStep, setModalStep] = useState("form");
  const [allUsers, setAllUsers] = useState([]);
  const [pendingMembers, setPendingMembers] = useState([]);
  const [addTab, setAddTab] = useState("direct");
  const [memberForm, setMemberForm] = useState({
    type: "direct",
    userId: "",
    email: "",
    role: "DEVELOPER",
  });
  const [memberFormError, setMemberFormError] = useState("");
  const [creating, setCreating] = useState(false);

  // Assign team to existing project
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProject, setAssignProject] = useState(null);
  const [assignTeamName, setAssignTeamName] = useState("");

  const canManage = canManageProjects();
  const user = getStoredUser();
  const navigate = useNavigate();

  // Load projects when the page mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const list = await getProjects();
      setProjects(list);
      fetchAllTeamMembers(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };
  const fetchAllTeamMembers = async (projectList) => {
    const results = await Promise.all(
      projectList.map(async (p) => {
        try {
          const members = await getProjectMembers(p.id);
          return {
            id: p.id,
            members: members.map((m) => ({
              ...m,
              username:
                m.user?.username || m.user?.name || m.username || m.name || "?",
            })),
          };
        } catch {
          return { id: p.id, members: [] };
        }
      }),
    );

    const map = {};
    results.forEach((r) => {
      map[r.id] = r.members;
    });
    setProjectMembers(map);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      description: formData.description,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      createdById: Number(user.id),
      slackWebhookUrl: formData.slackWebhookUrl || null,
    };

    try {
      if (editingProject) {
        const res = await updateProject(editingProject.id, payload);
        if (res.ok) {
          fetchProjects();
          closeModal();
        } else {
          const err = await res.text();
          alert(`Error ${res.status}: ${err}`);
        }
      } else {
        getUsers()
          .then(setAllUsers)
          .catch(() => {});
        setPendingMembers([]);
        setMemberForm({
          type: "direct",
          userId: "",
          email: "",
          role: "DEVELOPER",
        });
        setMemberFormError("");
        setAddTab("direct");
        setModalStep("add-team");
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleAddMember = (e) => {
    e.preventDefault();
    if (memberForm.type === "direct" && !memberForm.userId) {
      setMemberFormError("Please select a user.");
      return;
    }
    if (memberForm.type === "invite" && !memberForm.email.trim()) {
      setMemberFormError("Email is required.");
      return;
    }

    const member =
      memberForm.type === "direct"
        ? {
            userId: Number(memberForm.userId),
            role: memberForm.role,
            _display:
              allUsers.find((u) => String(u.id) === String(memberForm.userId))
                ?.username || `User #${memberForm.userId}`,
          }
        : {
            email: memberForm.email.trim(),
            role: memberForm.role,
            _display: memberForm.email.trim(),
          };

    setPendingMembers((prev) => [...prev, member]);
    setMemberForm({
      type: memberForm.type,
      userId: "",
      email: "",
      role: "DEVELOPER",
    });
    setMemberFormError("");
  };
  const handleCreateProject = async () => {
    setCreating(true);
    try {
      let finalMembers = pendingMembers.map(({ _display, ...rest }) => rest);
      const formHasUser =
        memberForm.type === "direct"
          ? !!memberForm.userId
          : !!memberForm.email.trim();
      if (formHasUser) {
        const autoEntry =
          memberForm.type === "direct"
            ? { userId: Number(memberForm.userId), role: memberForm.role }
            : { email: memberForm.email.trim(), role: memberForm.role };
        finalMembers = [...finalMembers, autoEntry];
      }

      const directMembers = finalMembers.filter((m) => m.userId);
      const inviteMembers = finalMembers.filter((m) => m.email);
      const teamName = formData.teamName?.trim() || `${formData.name} Team`;
      const teamRes = await createTeam({ name: teamName });
      if (!teamRes.ok) {
        const err = await teamRes.text();
        alert(`Failed to create team (${teamRes.status}): ${err}`);
        setCreating(false);
        return;
      }
      const teamData = await teamRes.json();
      const teamId = teamData.id;
      for (const m of directMembers) {
        await addTeamMembers(teamId, { userId: m.userId, role: m.role });
      }
      const payload = {
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate || null,
        endDate: formData.endDate || null,
        createdById: Number(user.id),
        slackWebhookUrl: formData.slackWebhookUrl || null,
        teamId,
      };
      const res = await createProject(payload);
      if (res.ok) {
        if (inviteMembers.length > 0) {
          const projectData = await res.json();
          for (const m of inviteMembers) {
            await sendInvite({
              projectId: projectData.id,
              email: m.email,
              role: m.role,
            });
          }
        }
        fetchProjects();
        closeModal();
      } else {
        const err = await res.text();
        alert(`Error ${res.status}: ${err}`);
      }
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  };

  const handleDelete = async () => {
    const id = deleteTarget;
    setDeleteTarget(null);

    try {
      const res = await deleteProject(id);

      if (res.ok || res.status === 204) {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        setProjectMembers((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        const body = await res.text();
        alert(`Delete failed (${res.status}): ${body || "Unknown error"}`);
      }
    } catch (e) {
      alert("Delete failed: " + e.message);
    }
  };

  // Open modal in create mode
  const openModal = (project = null) => {
    setEditingProject(project);

    if (project) {
      setFormData({
        name: project.name,
        description: project.description || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        slackWebhookUrl: project.slackWebhookUrl || "",
        teamName: project.team?.name || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        startDate: "",
        endDate: "",
        slackWebhookUrl: "",
        teamName: "",
      });
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
    setModalStep("form");
    setPendingMembers([]);
    setMemberFormError("");
  };

  const openAssignModal = (project) => {
    setAssignProject(project);
    setAssignTeamName(project.team?.name || "");
    setPendingMembers([]);
    setMemberForm({ type: "direct", userId: "", email: "", role: "DEVELOPER" });
    setMemberFormError("");
    setAddTab("direct");
    getUsers()
      .then(setAllUsers)
      .catch(() => {});
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    setShowAssignModal(false);
    setAssignProject(null);
    setPendingMembers([]);
    setMemberFormError("");
  };

  const handleAssignTeam = async () => {
    setCreating(true);
    try {
      let finalMembers = pendingMembers.map(({ _display, ...rest }) => rest);
      const formHasUser =
        memberForm.type === "direct"
          ? !!memberForm.userId
          : !!memberForm.email.trim();
      if (formHasUser) {
        const autoEntry =
          memberForm.type === "direct"
            ? { userId: Number(memberForm.userId), role: memberForm.role }
            : { email: memberForm.email.trim(), role: memberForm.role };
        finalMembers = [...finalMembers, autoEntry];
      }

      const directMembers = finalMembers.filter((m) => m.userId);
      const inviteMembers = finalMembers.filter((m) => m.email);

      let teamId = assignProject.teamId;

      if (!teamId) {
        // Create a new team and link it to the project
        const teamRes = await createTeam({
          name: assignTeamName.trim() || `${assignProject.name} Team`,
        });
        if (!teamRes.ok) {
          alert("Failed to create team");
          setCreating(false);
          return;
        }
        const teamData = await teamRes.json();
        teamId = teamData.id;

        // Link team to project
        await assignTeamToProject(assignProject.id, {
          name: assignProject.name,
          description: assignProject.description || "",
          startDate: assignProject.startDate || null,
          endDate: assignProject.endDate || null,
          createdById: Number(user.id),
          slackWebhookUrl: assignProject.slackWebhookUrl || null,
          teamId,
        });
      }

      for (const m of directMembers) {
        await addTeamMembers(teamId, { userId: m.userId, role: m.role });
      }
      for (const m of inviteMembers) {
        await sendInvite({
          projectId: assignProject.id,
          email: m.email,
          role: m.role,
        });
      }

      fetchProjects();
      closeAssignModal();
    } catch (e) {
      console.error(e);
    }
    setCreating(false);
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(search.toLowerCase()),
  );

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "oldest") return (a.id ?? 0) - (b.id ?? 0);
    if (sortBy === "progress") {
      const aProgress = (() => {
        const t = Array.isArray(a.tasks) ? a.tasks : [];
        return t.length
          ? t.filter((x) => x.status === "DONE").length / t.length
          : 0;
      })();
      const bProgress = (() => {
        const t = Array.isArray(b.tasks) ? b.tasks : [];
        return t.length
          ? t.filter((x) => x.status === "DONE").length / t.length
          : 0;
      })();
      return bProgress - aProgress;
    }
    return (b.id ?? 0) - (a.id ?? 0);
  });

  return (
    <div className="projects-container">
      <Sidebar />

      <div className="projects-body">
        <div className="projects-header">
          {/* Left: title */}
          <div className="pj-header-left">
            <h1>Projects</h1>
            <p>
              {sortedProjects.length}
              {search ? ` of ${projects.length}` : ""} project
              {sortedProjects.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Center: search */}
          <div className="pj-search-wrap">
            <svg
              className="pj-search-icon"
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="6.5"
                cy="6.5"
                r="4.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M10.5 10.5l3 3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <input
              className="pj-search"
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="pj-search-clear" onClick={() => setSearch("")}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1l10 10M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Right: sort + view toggle + new project */}
          <div className="header-actions">
            <select
              className="pj-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A–Z</option>
              <option value="progress">Most Progress</option>
            </select>

            <div className="pj-view-toggle">
              <button
                className={view === "board" ? "active" : ""}
                onClick={() => setView("board")}
                title="Board view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="0"
                    y="0"
                    width="4"
                    height="14"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="5"
                    y="0"
                    width="4"
                    height="14"
                    rx="1"
                    fill="currentColor"
                    opacity=".5"
                  />
                  <rect
                    x="10"
                    y="0"
                    width="4"
                    height="14"
                    rx="1"
                    fill="currentColor"
                    opacity=".3"
                  />
                </svg>
                Board
              </button>
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
                title="List view"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="0"
                    y="1"
                    width="14"
                    height="2.5"
                    rx="1"
                    fill="currentColor"
                  />
                  <rect
                    x="0"
                    y="5.5"
                    width="14"
                    height="2.5"
                    rx="1"
                    fill="currentColor"
                    opacity=".6"
                  />
                  <rect
                    x="0"
                    y="10"
                    width="14"
                    height="2.5"
                    rx="1"
                    fill="currentColor"
                    opacity=".4"
                  />
                </svg>
                List
              </button>
            </div>

            {canManage && (
              <button onClick={() => openModal()} className="btn-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
                    clipRule="evenodd"
                  />
                </svg>
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && <div className="loading">Loading...</div>}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z"
                clipRule="evenodd"
              />
            </svg>
            <h3>No projects yet</h3>
            <p>
              {canManage
                ? "Create your first project to get started"
                : "No projects have been created yet"}
            </p>
          </div>
        )}

        {!loading && projects.length > 0 && sortedProjects.length === 0 && (
          <div className="empty-state">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
                clipRule="evenodd"
              />
            </svg>
            <h3>No results for "{search}"</h3>
            <p>Try a different search term</p>
          </div>
        )}

        {/* Board view */}
        {!loading && sortedProjects.length > 0 && view === "board" && (
          <div className="projects-grid">
            {sortedProjects.map((project) => {
              const members = projectMembers[project.id] ?? [];
              const projectTasks = Array.isArray(project.tasks)
                ? project.tasks
                : [];
              const totalTasks = projectTasks.length;
              const doneTasks = projectTasks.filter(
                (t) => t.status === "DONE",
              ).length;
              const inProgress = projectTasks.filter(
                (t) => t.status === "IN_PROGRESS",
              ).length;
              const inReview = projectTasks.filter(
                (t) => t.status === "IN_REVIEW",
              ).length;
              const pct =
                totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

              const cardAccent =
                AVATAR_COLORS[project.id % AVATAR_COLORS.length] || "#6366f1";

              return (
                <div
                  key={project.id}
                  className="project-card"
                  onClick={() => navigate(`/board?project=${project.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div
                    className="pj-card-accent"
                    style={{
                      background: `linear-gradient(90deg, ${cardAccent}, ${cardAccent}88)`,
                    }}
                  />
                  <div className="pj-card-body">
                    <div className="project-header">
                      <div className="pj-card-title-wrap">
                        <div
                          className="pj-card-avatar"
                          style={{ background: cardAccent }}
                        >
                          {project.name[0].toUpperCase()}
                        </div>
                        <h3>{project.name}</h3>
                      </div>

                      {canManage && (
                        <div className="project-actions">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignModal(project);
                            }}
                            className="btn-icon"
                            title="Assign Team"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M6.25 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM3.25 19.125a7.125 7.125 0 0114.25 0v.003l-.001.119a.75.75 0 01-.363.63 13.067 13.067 0 01-6.761 1.873c-2.472 0-4.786-.684-6.76-1.873a.75.75 0 01-.364-.63l-.001-.122zM19.75 7.5a.75.75 0 00-1.5 0v2.25H16a.75.75 0 000 1.5h2.25v2.25a.75.75 0 001.5 0v-2.25H22a.75.75 0 000-1.5h-2.25V7.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openModal(project);
                            }}
                            className="btn-icon"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(project.id);
                            }}
                            className="btn-icon btn-delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <p className="project-description">
                      {project.description || "No description"}
                    </p>

                    {project.slackWebhookUrl && (
                      <div className="pj-slack-badge">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
                        </svg>
                        Slack connected
                      </div>
                    )}

                    {/* Task stats */}
                    <div className="pj-task-stats">
                      <div className="pj-task-stat">
                        <span className="pj-task-stat-num">{totalTasks}</span>
                        <span className="pj-task-stat-label">Total</span>
                      </div>
                      <div className="pj-task-stat pj-task-stat--progress">
                        <span className="pj-task-stat-num">{inProgress}</span>
                        <span className="pj-task-stat-label">In Progress</span>
                      </div>
                      <div className="pj-task-stat pj-task-stat--review">
                        <span className="pj-task-stat-num">{inReview}</span>
                        <span className="pj-task-stat-label">In Review</span>
                      </div>
                      <div className="pj-task-stat pj-task-stat--done">
                        <span className="pj-task-stat-num">{doneTasks}</span>
                        <span className="pj-task-stat-label">Done</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="pj-progress-row">
                      <div className="pj-progress-bar">
                        <div
                          className="pj-progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="pj-progress-pct">{pct}%</span>
                    </div>

                    <div className="project-dates">
                      {project.startDate && (
                        <span className="date-badge">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <rect
                              x="1"
                              y="2"
                              width="12"
                              height="11"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M1 6h12"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M4 1v2M10 1v2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                          Start: {formatDate(project.startDate)}
                        </span>
                      )}
                      {project.endDate && (
                        <span className="date-badge date-badge-end">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <rect
                              x="1"
                              y="2"
                              width="12"
                              height="11"
                              rx="2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M1 6h12"
                              stroke="currentColor"
                              strokeWidth="1.3"
                            />
                            <path
                              d="M4 1v2M10 1v2"
                              stroke="currentColor"
                              strokeWidth="1.3"
                              strokeLinecap="round"
                            />
                          </svg>
                          End: {formatDate(project.endDate)}
                        </span>
                      )}
                    </div>

                    <div className="project-members">
                      <div className="pj-members-header">
                        <span className="members-label">Team Members</span>
                        <button
                          className="pj-view-team-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/team?project=${project.id}`);
                          }}
                        >
                          View All →
                        </button>
                      </div>
                      {(() => {
                        const nonAdmins = members.filter(
                          (m) => m.role !== "ADMIN",
                        );
                        if (nonAdmins.length === 0)
                          return (
                            <div className="pj-no-members-wrap">
                              <span className="no-members">No members yet</span>
                              {canManage && (
                                <button
                                  className="pj-assign-team-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openAssignModal(project);
                                  }}
                                >
                                  + Assign Team
                                </button>
                              )}
                            </div>
                          );

                        return (
                          <div className="pj-avatar-stack">
                            {nonAdmins.slice(0, 5).map((m, idx) => {
                              const uname =
                                m.user?.username || m.username || "?";
                              return (
                                <div
                                  key={m.id ?? idx}
                                  className="pj-stack-avatar"
                                  style={{
                                    background:
                                      AVATAR_COLORS[idx % AVATAR_COLORS.length],
                                  }}
                                  title={uname}
                                >
                                  {uname[0].toUpperCase()}
                                </div>
                              );
                            })}
                            {nonAdmins.length > 5 && (
                              <div className="pj-stack-avatar pj-stack-more">
                                +{nonAdmins.length - 5}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* end pj-card-body */}
                </div>
              );
            })}
          </div>
        )}

        {/* List view */}
        {!loading && sortedProjects.length > 0 && view === "list" && (
          <div className="pj-list-view">
            <div className="pj-list-header">
              <span>Project</span>
              <span>Description</span>
              <span>Members</span>
              <span>Start Date</span>
              <span>Due Date</span>
              {canManage && <span></span>}
            </div>

            {sortedProjects.map((project) => {
              const members = projectMembers[project.id] ?? [];

              return (
                <div
                  key={project.id}
                  className="pj-list-row"
                  onClick={() => navigate(`/board?project=${project.id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="pj-list-name">
                    <div
                      className="pj-list-avatar"
                      style={{
                        background:
                          AVATAR_COLORS[project.id % AVATAR_COLORS.length] ||
                          "#6366f1",
                      }}
                    >
                      {project.name[0].toUpperCase()}
                    </div>
                    <span className="pj-list-name-text">
                      {project.name}
                      {project.slackWebhookUrl && (
                        <span className="pj-slack-dot" title="Slack connected">
                          <svg
                            width="10"
                            height="10"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                          >
                            <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z" />
                          </svg>
                        </span>
                      )}
                    </span>
                  </div>
                  <span className="pj-list-desc">
                    {project.description || "—"}
                  </span>

                  <span className="pj-list-members">
                    {members.length === 0 ? (
                      <span className="no-members">—</span>
                    ) : (
                      <div className="pj-avatar-stack">
                        {members.slice(0, 4).map((m, idx) => (
                          <div
                            key={m.id ?? idx}
                            className="pj-stack-avatar"
                            title={m.username || m.name}
                            style={{
                              background:
                                AVATAR_COLORS[idx % AVATAR_COLORS.length],
                            }}
                          >
                            {(m.username || m.name || "?")
                              .split(" ")
                              .map((w) => w[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        ))}
                        {members.length > 4 && (
                          <div className="pj-stack-avatar pj-stack-more">
                            +{members.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </span>

                  <span className="pj-list-date">
                    {project.startDate ? (
                      <span className="date-badge">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <rect
                            x="1"
                            y="2"
                            width="12"
                            height="11"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M1 6h12"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M4 1v2M10 1v2"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                        {formatDate(project.startDate)}
                      </span>
                    ) : (
                      <span className="pj-date-empty">—</span>
                    )}
                  </span>

                  <span className="pj-list-date">
                    {project.endDate ? (
                      <span className="date-badge date-badge-end">
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 14 14"
                          fill="none"
                        >
                          <rect
                            x="1"
                            y="2"
                            width="12"
                            height="11"
                            rx="2"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M1 6h12"
                            stroke="currentColor"
                            strokeWidth="1.3"
                          />
                          <path
                            d="M4 1v2M10 1v2"
                            stroke="currentColor"
                            strokeWidth="1.3"
                            strokeLinecap="round"
                          />
                        </svg>
                        {formatDate(project.endDate)}
                      </span>
                    ) : (
                      <span className="pj-date-empty">—</span>
                    )}
                  </span>

                  {canManage && (
                    <span className="pj-list-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(project);
                        }}
                        className="btn-icon"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(project.id);
                        }}
                        className="btn-icon btn-delete"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* ── Step indicator (create only) ── */}
            {!editingProject && (
              <div className="pj-steps">
                <div
                  className={`pj-step ${modalStep === "form" ? "pj-step--active" : "pj-step--done"}`}
                >
                  <span className="pj-step-num">
                    {modalStep === "form" ? "1" : "✓"}
                  </span>
                  <span>Project Details</span>
                </div>
                <div className="pj-step-connector" />
                <div
                  className={`pj-step ${modalStep === "add-team" ? "pj-step--active" : ""}`}
                >
                  <span className="pj-step-num">2</span>
                  <span>Add Team</span>
                </div>
              </div>
            )}

            <div className="modal-header">
              <h2>
                {editingProject
                  ? "Edit Project"
                  : modalStep === "form"
                    ? "New Project"
                    : "Add Team Members"}
              </h2>
              <button onClick={closeModal} className="btn-close">
                ×
              </button>
            </div>
            {modalStep === "form" && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Project Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    placeholder="E-Commerce Platform"
                  />
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Project description..."
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date</label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="slack-webhook">
                    Slack Webhook URL{" "}
                    <span className="form-optional">(optional)</span>
                  </label>
                  <input
                    id="slack-webhook"
                    name="slackWebhookUrl"
                    type="url"
                    value={formData.slackWebhookUrl}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        slackWebhookUrl: e.target.value,
                      })
                    }
                    placeholder="https://hooks.slack.com/services/..."
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    {editingProject ? "Update" : "Create & Continue →"}
                  </button>
                </div>
              </form>
            )}
            {modalStep === "add-team" && (
              <div className="pj-add-team">
                {/* Team name — one team per project */}
                <div className="form-group">
                  <label>Team Name</label>
                  <input
                    type="text"
                    value={formData.teamName}
                    onChange={(e) =>
                      setFormData({ ...formData, teamName: e.target.value })
                    }
                    placeholder={`${formData.name} Team`}
                  />
                </div>

                {/* Tabs */}
                <div className="pj-team-tabs">
                  <button
                    className={`pj-team-tab ${addTab === "direct" ? "pj-team-tab--active" : ""}`}
                    onClick={() => {
                      setAddTab("direct");
                      setMemberForm((f) => ({
                        ...f,
                        type: "direct",
                        userId: "",
                        email: "",
                      }));
                      setMemberFormError("");
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="7"
                        cy="5"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M2 14c0-2.761 2.239-5 5-5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 10v4M10 12h4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    Add Existing User
                  </button>
                  <button
                    className={`pj-team-tab ${addTab === "invite" ? "pj-team-tab--active" : ""}`}
                    onClick={() => {
                      setAddTab("invite");
                      setMemberForm((f) => ({
                        ...f,
                        type: "invite",
                        userId: "",
                        email: "",
                      }));
                      setMemberFormError("");
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                      />
                      <path
                        d="M2 4l6 5 6-5"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Invite by Email
                  </button>
                </div>

                {/* Member entry form */}
                <form onSubmit={handleAddMember}>
                  {memberFormError && (
                    <div className="pj-team-error">{memberFormError}</div>
                  )}

                  <div className="form-row">
                    {addTab === "direct" ? (
                      <div className="form-group">
                        <label>User *</label>
                        <select
                          value={memberForm.userId}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              userId: e.target.value,
                            })
                          }
                        >
                          <option value="">Select a user</option>
                          {allUsers.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.username} — {u.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Email *</label>
                        <input
                          type="email"
                          value={memberForm.email}
                          onChange={(e) =>
                            setMemberForm({
                              ...memberForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="colleague@example.com"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Role</label>
                      <select
                        value={memberForm.role}
                        onChange={(e) =>
                          setMemberForm({ ...memberForm, role: e.target.value })
                        }
                      >
                        <option value="DEVELOPER">Developer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>

                  <button type="submit" className="pj-add-member-btn">
                    + Add to List
                  </button>
                </form>

                {/* Pending members list */}
                {pendingMembers.length > 0 && (
                  <div className="pj-pending-list">
                    <p className="pj-pending-label">
                      Members to add ({pendingMembers.length})
                    </p>
                    {pendingMembers.map((m, i) => (
                      <div key={i} className="pj-pending-row">
                        <div className="pj-pending-info">
                          <span className="pj-pending-avatar">
                            {m._display?.slice(0, 2).toUpperCase() || "?"}
                          </span>
                          <span className="pj-pending-name">{m._display}</span>
                          <span className="pj-pending-role">{m.role}</span>
                          <span className="pj-pending-type">
                            {m.email ? "Invite" : "Direct"}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="pj-remove-member"
                          onClick={() =>
                            setPendingMembers((prev) =>
                              prev.filter((_, idx) => idx !== i),
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer actions */}
                <div className="modal-actions pj-team-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setModalStep("form")}
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={closeModal}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleCreateProject}
                    disabled={creating}
                  >
                    {creating
                      ? "Creating..."
                      : `Create Project${pendingMembers.length > 0 ? ` with ${pendingMembers.length} member${pendingMembers.length > 1 ? "s" : ""}` : ""}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {deleteTarget && (
        <ConfirmModal
          title="Delete Project"
          message="Are you sure you want to delete this project? This action cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Assign Team Modal */}
      {showAssignModal && assignProject && (
        <div className="modal-overlay" onClick={closeAssignModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Assign Team — {assignProject.name}</h2>
              <button onClick={closeAssignModal} className="btn-close">
                ×
              </button>
            </div>

            <div className="pj-add-team">
              <div className="form-group">
                <label>Team Name</label>
                <input
                  type="text"
                  value={assignTeamName}
                  onChange={(e) => setAssignTeamName(e.target.value)}
                  placeholder={`${assignProject.name} Team`}
                />
              </div>

              <div className="pj-team-tabs">
                <button
                  className={`pj-team-tab ${addTab === "direct" ? "pj-team-tab--active" : ""}`}
                  onClick={() => {
                    setAddTab("direct");
                    setMemberForm((f) => ({
                      ...f,
                      type: "direct",
                      userId: "",
                      email: "",
                    }));
                    setMemberFormError("");
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle
                      cx="7"
                      cy="5"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M2 14c0-2.761 2.239-5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12 10v4M10 12h4"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Add Existing User
                </button>
                <button
                  className={`pj-team-tab ${addTab === "invite" ? "pj-team-tab--active" : ""}`}
                  onClick={() => {
                    setAddTab("invite");
                    setMemberForm((f) => ({
                      ...f,
                      type: "invite",
                      userId: "",
                      email: "",
                    }));
                    setMemberFormError("");
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M2 4h12v9a1 1 0 01-1 1H3a1 1 0 01-1-1V4z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                    />
                    <path
                      d="M2 4l6 5 6-5"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Invite by Email
                </button>
              </div>

              <form onSubmit={handleAddMember}>
                {memberFormError && (
                  <div className="pj-team-error">{memberFormError}</div>
                )}
                <div className="form-row">
                  {addTab === "direct" ? (
                    <div className="form-group">
                      <label>User *</label>
                      <select
                        value={memberForm.userId}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            userId: e.target.value,
                          })
                        }
                      >
                        <option value="">Select a user</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.username} — {u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Email *</label>
                      <input
                        type="email"
                        value={memberForm.email}
                        onChange={(e) =>
                          setMemberForm({
                            ...memberForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="colleague@example.com"
                      />
                    </div>
                  )}
                  <div className="form-group">
                    <label>Role</label>
                    <select
                      value={memberForm.role}
                      onChange={(e) =>
                        setMemberForm({ ...memberForm, role: e.target.value })
                      }
                    >
                      <option value="DEVELOPER">Developer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="pj-add-member-btn">
                  + Add to List
                </button>
              </form>

              {pendingMembers.length > 0 && (
                <div className="pj-pending-list">
                  <p className="pj-pending-label">
                    Members to add ({pendingMembers.length})
                  </p>
                  {pendingMembers.map((m, i) => (
                    <div key={i} className="pj-pending-row">
                      <div className="pj-pending-info">
                        <span className="pj-pending-avatar">
                          {m._display?.slice(0, 2).toUpperCase() || "?"}
                        </span>
                        <span className="pj-pending-name">{m._display}</span>
                        <span className="pj-pending-role">{m.role}</span>
                        <span className="pj-pending-type">
                          {m.email ? "Invite" : "Direct"}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="pj-remove-member"
                        onClick={() =>
                          setPendingMembers((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="modal-actions pj-team-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeAssignModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleAssignTeam}
                  disabled={creating}
                >
                  {creating
                    ? "Assigning..."
                    : `Assign${pendingMembers.length > 0 ? ` ${pendingMembers.length} Member${pendingMembers.length > 1 ? "s" : ""}` : " Team"}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
