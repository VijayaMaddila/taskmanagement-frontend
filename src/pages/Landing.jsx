import { useNavigate } from "react-router-dom";
import { isAuthenticated, hasRole } from "../utils/auth";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const dashboardPath = hasRole("ADMIN") ? "/dashboard" : "/board";

  return (
    <div className="landing">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#grad)" />
            <path
              d="M7 14L12 19L21 9"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="28" y2="28">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          <span>TaskFlow</span>
        </div>
        <ul className="nav-links">
          <li>
            <a href="#features">Features</a>
          </li>
          <li>
            <a href="#workflow">Workflow</a>
          </li>
        </ul>
        <div className="nav-actions">
          {loggedIn ? (
            <button onClick={() => navigate(dashboardPath)} className="btn-nav-cta">
              Go to Dashboard
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/login")} className="btn-ghost">
                Log in
              </button>
              <button onClick={() => navigate("/register")} className="btn-nav-cta">
                Get started
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M2 7h10M8 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />

        <h1>
          Built for teams
          <br />
          that move <span className="hero-underline">fast</span>
        </h1>

        <p className="hero-desc">
          TaskFlow is the issue tracking tool teams actually enjoy using.
          Keyboard-first, blazing fast, and designed to keep you in flow.
        </p>

        <div className="hero-ctas">
          {loggedIn ? (
            <button onClick={() => navigate(dashboardPath)} className="cta-primary">
              Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => navigate("/register")} className="cta-primary">
                Start for free
              </button>
              <button onClick={() => navigate("/login")} className="cta-secondary">
                Sign in
              </button>
            </>
          )}
        </div>
        {/* App mockup */}
        <div className="mockup-wrapper">
          <div className="mockup-bar">
            <span />
            <span />
            <span />
          </div>
          <div className="mockup-body">
            <div className="mockup-sidebar">
              <div className="ms-section">
                <p className="ms-label">Workspace</p>
                <div className="ms-item active">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect
                      x="1"
                      y="1"
                      width="5"
                      height="5"
                      rx="1.5"
                      fill="currentColor"
                    />
                    <rect
                      x="8"
                      y="1"
                      width="5"
                      height="5"
                      rx="1.5"
                      fill="currentColor"
                      opacity=".4"
                    />
                    <rect
                      x="1"
                      y="8"
                      width="5"
                      height="5"
                      rx="1.5"
                      fill="currentColor"
                      opacity=".4"
                    />
                    <rect
                      x="8"
                      y="8"
                      width="5"
                      height="5"
                      rx="1.5"
                      fill="currentColor"
                      opacity=".4"
                    />
                  </svg>
                  All Issues
                </div>
                <div className="ms-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle
                      cx="7"
                      cy="7"
                      r="5.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M7 4v3.5l2 1.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  My Issues
                </div>
                <div className="ms-item">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M2 4h10M2 7h7M2 10h5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Backlog
                </div>
              </div>
              <div className="ms-section">
                <p className="ms-label">Projects</p>
                {["Frontend", "Backend", "Mobile"].map((p, i) => (
                  <div key={i} className="ms-item">
                    <span className={`ms-dot c${i}`} />
                    {p}
                  </div>
                ))}
              </div>
            </div>

            <div className="mockup-main">
              <div className="mm-topbar">
                <span className="mm-title">All Issues</span>
                <div className="mm-actions">
                  <span>Filter</span>
                  <span>Display</span>
                  <button className="mm-add">+ Add issue</button>
                </div>
              </div>

              <div className="mm-group-label">In Progress · 3</div>
              {[
                {
                  id: "TF-42",
                  title: "Fix JWT token expiry on mobile clients",
                  assignee: "AK",
                  priority: "urgent",
                  label: "Bug",
                  labelColor: "red",
                },
                {
                  id: "TF-43",
                  title: "Implement real-time notifications",
                  assignee: "SR",
                  priority: "high",
                  label: "Feature",
                  labelColor: "purple",
                },
                {
                  id: "TF-44",
                  title: "Optimize project list query performance",
                  assignee: "MJ",
                  priority: "medium",
                  label: "Improvement",
                  labelColor: "blue",
                },
              ].map((issue) => (
                <div key={issue.id} className="mm-issue">
                  <span
                    className={`mm-priority ${issue.priority}`}
                    title={issue.priority}
                  >
                    {issue.priority === "urgent"
                      ? "▲"
                      : issue.priority === "high"
                        ? "↑"
                        : "→"}
                  </span>
                  <span className="mm-status-ring in-progress" />
                  <span className="mm-id">{issue.id}</span>
                  <span className="mm-issue-title">{issue.title}</span>
                  <span className={`mm-label lc-${issue.labelColor}`}>
                    {issue.label}
                  </span>
                  <span className="mm-avatar">{issue.assignee}</span>
                </div>
              ))}

              <div className="mm-group-label" style={{ marginTop: "16px" }}>
                Todo · 2
              </div>
              {[
                {
                  id: "TF-45",
                  title: "Add role-based dashboard widgets",
                  assignee: "AK",
                  priority: "medium",
                  label: "Feature",
                  labelColor: "purple",
                },
                {
                  id: "TF-46",
                  title: "Write API documentation for v2",
                  assignee: "SR",
                  priority: "low",
                  label: "Docs",
                  labelColor: "yellow",
                },
              ].map((issue) => (
                <div key={issue.id} className="mm-issue">
                  <span className={`mm-priority ${issue.priority}`}>
                    {issue.priority === "medium" ? "→" : "↓"}
                  </span>
                  <span className="mm-status-ring todo" />
                  <span className="mm-id">{issue.id}</span>
                  <span className="mm-issue-title">{issue.title}</span>
                  <span className={`mm-label lc-${issue.labelColor}`}>
                    {issue.label}
                  </span>
                  <span className="mm-avatar">{issue.assignee}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features" id="features">
        <div className="section-eyebrow">Features</div>

        <h2>
          The tool your team
          <br />
          will actually use
        </h2>

        <p className="section-desc">
          Manage tasks, collaborate with your team, and track progress — all in
          one place.
        </p>

        <div className="feat-grid">
          {/* Main Feature */}
          <div className="feat-card feat-large">
            <div className="feat-icon-wrap purple">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 11l5 5L19 6"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Task Management</h3>
            <p>
              Create, assign, and manage tasks, Add descriptions, labels, and
              track work from start to finish.
            </p>

            <div className="kbd-demo">
              <kbd>+</kbd>
              <span>Create task</span>
              <kbd>@</kbd>
              <span>Assign user</span>
              <kbd>#</kbd>
              <span>Add labels</span>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="feat-card">
            <div className="feat-icon-wrap blue">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle
                  cx="11"
                  cy="11"
                  r="8"
                  stroke="white"
                  strokeWidth="1.8"
                />
                <path
                  d="M11 7v4.5l3 2"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h3>Workflow Tracking</h3>
            <p>
              Track tasks with statuses like To Do, In Progress, and Done using
              visual Kanban boards.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="feat-card">
            <div className="feat-icon-wrap green">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M4 17l4-4 3 3 7-8"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3>Deadlines & Priorities</h3>
            <p>
              Set due dates, assign priorities, and never miss important
              deadlines with reminders.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="feat-card">
            <div className="feat-icon-wrap orange">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <rect
                  x="3"
                  y="3"
                  width="7"
                  height="7"
                  rx="2"
                  stroke="white"
                  strokeWidth="1.8"
                />
                <rect
                  x="12"
                  y="3"
                  width="7"
                  height="7"
                  rx="2"
                  stroke="white"
                  strokeWidth="1.8"
                />
                <rect
                  x="3"
                  y="12"
                  width="7"
                  height="7"
                  rx="2"
                  stroke="white"
                  strokeWidth="1.8"
                />
                <rect
                  x="12"
                  y="12"
                  width="7"
                  height="7"
                  rx="2"
                  stroke="white"
                  strokeWidth="1.8"
                />
              </svg>
            </div>

            <h3>Team Collaboration</h3>
            <p>
              Work together with comments, mentions, and real-time updates to
              keep everyone aligned.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="workflow" id="workflow">
        <div className="section-eyebrow">How it works</div>
        <h2>
          From signup to shipping
          <br />
          in under 10 minutes
        </h2>
        <div className="workflow-steps">
          {[
            {
              n: "01",
              title: "Create your workspace",
              body: "Sign up, invite your team, and set up your first project. No lengthy onboarding — you're ready in minutes.",
            },
            {
              n: "02",
              title: "Add issues & assign",
              body: "Create tasks, bugs, and features. Set priorities, due dates, and assign to the right people instantly.",
            },
            {
              n: "03",
              title: "Track progress",
              body: "Move issues through your custom pipeline. Get notified on blockers and keep everyone aligned.",
            },
            {
              n: "04",
              title: "Ship & celebrate",
              body: "Close cycles, review velocity, and ship features faster than ever before.",
            },
          ].map((s, i) => (
            <div key={i} className="wf-step">
              <div className="wf-num">{s.n}</div>
              <div className="wf-body">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
              {i < 3 && <div className="wf-connector" />}
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="roles-section">
        <div className="section-eyebrow">Role-based access</div>
        <h2>
          The right access
          <br />
          for every team member
        </h2>
        <div className="roles-grid">
          {[
            {
              role: "Admin",
              color: "#ef4444",
              desc: "Full control over workspace settings, billing, and member management.",
            },
            {
              role: "Developer",
              color: "#6366f1",
              desc: "Work on assigned issues, update statuses, and collaborate on code.",
            },
          ].map((r, i) => (
            <div key={i} className="role-card">
              <div
                className="role-badge"
                style={{
                  background: r.color + "22",
                  color: r.color,
                  borderColor: r.color + "44",
                }}
              >
                {r.role}
              </div>
              <p>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="final-cta">
        <div className="final-glow" />
        <h2>Start shipping faster today</h2>
        <p>
          Join 10,000+ teams already using TaskFlow to build better products.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="cta-primary cta-xl"
        >
          Create free account
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <span>© 2026 TaskFlow. All rights reserved.</span>
      </footer>
    </div>
  );
}

export default Landing;
