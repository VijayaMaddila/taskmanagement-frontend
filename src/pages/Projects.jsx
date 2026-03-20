import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { canManageProjects } from "../utils/auth";
import { fetchAll, apiPost, apiPut, apiDelete } from "../utils/api";
import Sidebar from "../components/Sidebar";
import "./Projects.css";

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
  const [projectAssignees, setProjectAssignees] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board"); // 'board' or 'list'
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    slackWebhookUrl: "",
    slackBotToken: "",
  });

  const navigate = useNavigate();
  const canManage = canManageProjects();
  const user = getStoredUser();

  // Load projects when the page mounts
  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const list = await fetchAll('/api/projects');
      setProjects(list);
      fetchAllAssignees(list);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  // For each project, find the unique members assigned to its tasks
  const fetchAllAssignees = async (projectList) => {
    const results = await Promise.all(
      projectList.map(async (p) => {
        try {
          const tasks = await fetchAll(`/api/tasks/project/${p.id}`);
          const seen = new Set();
          const assignees = [];

          for (const t of tasks) {
            const aid = t.assignedToId ?? t.assignedTo?.id;
            const aname = t.assigneeName ?? t.assignedTo?.name ?? t.assignedTo?.username;

            if (aid && aname && !seen.has(aid)) {
              seen.add(aid);
              assignees.push({ id: aid, name: aname });
            }
          }

          return { id: p.id, assignees };
        } catch {
          return { id: p.id, assignees: [] };
        }
      })
    );

    // Convert the array to a map: { projectId: [assignees] }
    const map = {};
    results.forEach(r => {
      map[r.id] = r.assignees;
    });
    setProjectAssignees(map);
  };

  // Handle create or edit form submission
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
      let res;
      if (editingProject) {
        res = await apiPut(`/api/projects/${editingProject.id}`, payload);
      } else {
        res = await apiPost('/api/projects', payload);
      }

      if (res.ok) {
        fetchProjects();
        closeModal();
      } else {
        const err = await res.text();
        alert(`Error ${res.status}: ${err}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this project?")) return;

    try {
      const res = await apiDelete(`/api/projects/${id}`);

      if (res.ok || res.status === 204) {
        setProjects(prev => prev.filter(p => p.id !== id));
        setProjectAssignees(prev => {
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

  // Open modal in create mode (no project) or edit mode (with project data)
  const openModal = (project = null) => {
    setEditingProject(project);

    if (project) {
      setFormData({
        name: project.name,
        description: project.description || "",
        startDate: project.startDate || "",
        endDate: project.endDate || "",
        slackWebhookUrl: project.slackWebhookUrl || "",
      });
    } else {
      setFormData({ name: "", description: "", startDate: "", endDate: "", slackWebhookUrl: "" });
    }

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProject(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="projects-container">
      <Sidebar />

      <div className="projects-body">
        <div className="projects-header">
          <div>
            <h1>Projects</h1>
            <p>{projects.length} project{projects.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="header-actions">
            {/* Board / List view toggle */}
            <div className="pj-view-toggle">
              <button
                className={view === "board" ? "active" : ""}
                onClick={() => setView("board")}
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

            {canManage && (
              <button onClick={() => openModal()} className="btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                </svg>
                New Project
              </button>
            )}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="loading">Loading...</div>
        )}

        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 018.25-8.25.75.75 0 01.75.75v6.75H18a.75.75 0 01.75.75 8.25 8.25 0 01-16.5 0z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M12.75 3a.75.75 0 01.75-.75 8.25 8.25 0 018.25 8.25.75.75 0 01-.75.75h-7.5a.75.75 0 01-.75-.75V3z" clipRule="evenodd" />
            </svg>
            <h3>No projects yet</h3>
            <p>
              {canManage
                ? "Create your first project to get started"
                : "No projects have been created yet"}
            </p>
          </div>
        )}

        {/* Board view */}
        {!loading && projects.length > 0 && view === "board" && (
          <div className="projects-grid">
            {projects.map((project) => {
              const assignees = projectAssignees[project.id] ?? [];

              return (
                <div key={project.id} className="project-card">
                  <div className="project-header">
                    <h3>{project.name}</h3>

                    {canManage && (
                      <div className="project-actions">
                        <button onClick={() => openModal(project)} className="btn-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(project.id)} className="btn-icon btn-delete">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
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
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
                      </svg>
                      Slack connected
                    </div>
                  )}

                  <div className="project-dates">
                    {project.startDate && (
                      <span className="date-badge">Start: {project.startDate}</span>
                    )}
                    {project.endDate && (
                      <span className="date-badge">End: {project.endDate}</span>
                    )}
                  </div>

                  <div className="project-members">
                    <span className="members-label">Assigned Members</span>
                    {assignees.length === 0 ? (
                      <span className="no-members">No members assigned</span>
                    ) : (
                      <div className="members-avatars">
                        {assignees.map(a => (
                          <div key={a.id} className="member-chip" title={a.name}>
                            <div className="chip-avatar">
                              {a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </div>
                            <span className="chip-name">{a.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List view */}
        {!loading && projects.length > 0 && view === "list" && (
          <div className="pj-list-view">
            <div className="pj-list-header">
              <span>Project</span>
              <span>Description</span>
              <span>Members</span>
              <span>Start Date</span>
              <span>Due Date</span>
              {canManage && <span></span>}
            </div>

            {projects.map((project) => {
              const assignees = projectAssignees[project.id] ?? [];

              return (
                <div key={project.id} className="pj-list-row">
                  <span className="pj-list-name">
                    {project.name}
                    {project.slackWebhookUrl && (
                      <span className="pj-slack-dot" title="Slack connected">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.527 2.527 0 012.521 2.522v2.52H8.834zM8.834 6.313a2.527 2.527 0 012.521 2.521 2.527 2.527 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.527 2.527 0 01-2.522 2.521h-2.522V8.834zM17.688 8.834a2.527 2.527 0 01-2.523 2.521 2.526 2.526 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.165 0a2.528 2.528 0 012.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.165 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 01-2.52-2.523 2.526 2.526 0 012.52-2.52h6.313A2.527 2.527 0 0124 15.165a2.528 2.528 0 01-2.522 2.523h-6.313z"/>
                        </svg>
                      </span>
                    )}
                  </span>
                  <span className="pj-list-desc">{project.description || "—"}</span>

                  <span className="pj-list-members">
                    {assignees.length === 0 ? (
                      <span className="no-members">—</span>
                    ) : (
                      <div className="pj-avatar-stack">
                        {assignees.slice(0, 4).map(a => (
                          <div key={a.id} className="pj-stack-avatar" title={a.name}>
                            {a.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                        ))}
                        {assignees.length > 4 && (
                          <div className="pj-stack-avatar pj-stack-more">
                            +{assignees.length - 4}
                          </div>
                        )}
                      </div>
                    )}
                  </span>

                  <span className="pj-list-date">
                    {project.startDate
                      ? <span className="date-badge">{project.startDate}</span>
                      : <span className="pj-date-empty">—</span>
                    }
                  </span>

                  <span className="pj-list-date">
                    {project.endDate
                      ? <span className="date-badge date-badge-end">{project.endDate}</span>
                      : <span className="pj-date-empty">—</span>
                    }
                  </span>

                  {canManage && (
                    <span className="pj-list-actions">
                      <button onClick={() => openModal(project)} className="btn-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 00-1.32 2.214l-.8 2.685a.75.75 0 00.933.933l2.685-.8a5.25 5.25 0 002.214-1.32l8.4-8.4z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="btn-icon btn-delete">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                          <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
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
            <div className="modal-header">
              <h2>{editingProject ? "Edit Project" : "New Project"}</h2>
              <button onClick={closeModal} className="btn-close">×</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Project Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="E-Commerce Platform"
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="slack-webhook">Slack Webhook URL <span className="form-optional">(optional)</span></label>
                <input
                  id="slack-webhook"
                  name="slackWebhookUrl"
                  type="url"
                  value={formData.slackWebhookUrl}
                  onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                  placeholder="https://hooks.slack.com/services/..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingProject ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
