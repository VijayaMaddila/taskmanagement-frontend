import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiGet, apiPut } from "../utils/api";
import { isAuthenticated } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import "./Profile.css";

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"
  );
}

const AVATAR_COLORS = [
  "#6366f1",
  "#a855f7",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
];
const ROLE_COLORS = { ADMIN: "#6366f1", DEVELOPER: "#22c55e" };

export default function Profile() {
  const navigate = useNavigate();

  if (!isAuthenticated()) {
    navigate("/login");
    return null;
  }

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    apiGet("/api/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setProfile(data);
          setProfileForm({
            username: data.username || "",
            email: data.email || "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim() || !profileForm.email.trim()) {
      setProfileMsg({
        type: "error",
        text: "Username and email are required.",
      });
      return;
    }
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await apiPut("/api/profile", {
        username: profileForm.username.trim(),
        email: profileForm.email.trim(),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        try {
          const stored = JSON.parse(localStorage.getItem("user") || "{}");
          localStorage.setItem(
            "user",
            JSON.stringify({
              ...stored,
              username: updated.username,
              email: updated.email,
            }),
          );
        } catch {
          /* ignore */
        }
        setProfileMsg({
          type: "success",
          text: "Profile updated successfully.",
        });
      } else {
        const err = await res.text().catch(() => "");
        setProfileMsg({
          type: "error",
          text: err || "Failed to update profile.",
        });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error." });
    }
    setProfileSaving(false);
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwMsg({
        type: "error",
        text: "Both current and new password are required.",
      });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    setPwSaving(true);
    setPwMsg(null);
    try {
      const res = await apiPut("/api/profile/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      if (res.ok) {
        setPwMsg({ type: "success", text: "Password changed successfully." });
        setPwForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        const err = await res.text().catch(() => "");
        setPwMsg({ type: "error", text: err || "Failed to change password." });
      }
    } catch {
      setPwMsg({ type: "error", text: "Network error." });
    }
    setPwSaving(false);
  };

  const avatarColor = AVATAR_COLORS[(profile?.id ?? 0) % AVATAR_COLORS.length];
  const roleColor = ROLE_COLORS[profile?.role] || "#6b7280";

  return (
    <div className="pf-layout">
      <Sidebar />

      <div className="pf-main">
        <header className="pf-header">
          <div>
            <h1 className="pf-title">My Profile</h1>
            <p className="pf-sub">Manage your account details and password</p>
          </div>
        </header>

        {loading ? (
          <div className="pf-loading">
            <div className="pf-skeleton pf-skeleton--hero" />
            <div className="pf-skeleton-row">
              <div className="pf-skeleton pf-skeleton--card" />
              <div className="pf-skeleton pf-skeleton--card" />
            </div>
          </div>
        ) : (
          <div className="pf-content">
            {/* ── Hero banner ── */}
            <div className="pf-hero">
              <div className="pf-hero-bg" />
              <div className="pf-hero-content">
                <div
                  className="pf-hero-avatar"
                  style={{ background: avatarColor }}
                >
                  {getInitials(profile?.username || "")}
                </div>
                <div className="pf-hero-info">
                  <h1 className="pf-hero-name">{profile?.username || "—"}</h1>
                  <span className="pf-hero-email">{profile?.email || "—"}</span>
                  {profile?.role && (
                    <span
                      className="pf-hero-role"
                      style={{
                        color: roleColor,
                        background: roleColor + "20",
                        borderColor: roleColor + "50",
                      }}
                    >
                      {profile.role}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Two-column forms ── */}
            <div className="pf-grid">
              {/* Edit Profile */}
              <div className="pf-card">
                <div className="pf-card-header">
                  <div className="pf-card-icon pf-card-icon--indigo">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle
                        cx="8"
                        cy="5"
                        r="3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h2 className="pf-card-title">Edit Profile</h2>
                </div>

                {profileMsg && (
                  <div className={`pf-msg pf-msg--${profileMsg.type}`}>
                    {profileMsg.text}
                  </div>
                )}

                <form className="pf-form" onSubmit={handleProfileSave}>
                  <div className="pf-form-group">
                    <label>Username</label>
                    <div className="pf-input-wrap">
                      <svg
                        className="pf-input-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="5"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M2 14c0-3.314 2.686-6 6-6s6 2.686 6 6"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        value={profileForm.username}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            username: e.target.value,
                          })
                        }
                        placeholder="johndoe"
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>Email Address</label>
                    <div className="pf-input-wrap">
                      <svg
                        className="pf-input-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <rect
                          x="1"
                          y="3"
                          width="14"
                          height="10"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M1 5l7 5 7-5"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) =>
                          setProfileForm({
                            ...profileForm,
                            email: e.target.value,
                          })
                        }
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="pf-btn-primary"
                    disabled={profileSaving}
                  >
                    {profileSaving ? "Saving…" : "Save Changes"}
                  </button>
                </form>
              </div>

              {/* Change Password */}
              <div className="pf-card">
                <div className="pf-card-header">
                  <div className="pf-card-icon pf-card-icon--purple">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect
                        x="3"
                        y="7"
                        width="10"
                        height="8"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M5 7V5a3 3 0 016 0v2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="11" r="1.2" fill="currentColor" />
                    </svg>
                  </div>
                  <h2 className="pf-card-title">Change Password</h2>
                </div>

                {pwMsg && (
                  <div className={`pf-msg pf-msg--${pwMsg.type}`}>
                    {pwMsg.text}
                  </div>
                )}

                <form className="pf-form" onSubmit={handlePasswordSave}>
                  <div className="pf-form-group">
                    <label>Current Password</label>
                    <div className="pf-input-wrap">
                      <svg
                        className="pf-input-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <rect
                          x="3"
                          y="7"
                          width="10"
                          height="8"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M5 7V5a3 3 0 016 0v2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        type="password"
                        value={pwForm.currentPassword}
                        onChange={(e) =>
                          setPwForm({
                            ...pwForm,
                            currentPassword: e.target.value,
                          })
                        }
                        placeholder="Enter current password"
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>New Password</label>
                    <div className="pf-input-wrap">
                      <svg
                        className="pf-input-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <rect
                          x="3"
                          y="7"
                          width="10"
                          height="8"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M5 7V5a3 3 0 016 0v2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        type="password"
                        value={pwForm.newPassword}
                        onChange={(e) =>
                          setPwForm({ ...pwForm, newPassword: e.target.value })
                        }
                        placeholder="Enter new password"
                      />
                    </div>
                  </div>
                  <div className="pf-form-group">
                    <label>Confirm New Password</label>
                    <div className="pf-input-wrap">
                      <svg
                        className="pf-input-icon"
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <rect
                          x="3"
                          y="7"
                          width="10"
                          height="8"
                          rx="2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                        />
                        <path
                          d="M5 7V5a3 3 0 016 0v2"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <input
                        type="password"
                        value={pwForm.confirmPassword}
                        onChange={(e) =>
                          setPwForm({
                            ...pwForm,
                            confirmPassword: e.target.value,
                          })
                        }
                        placeholder="Re-enter new password"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="pf-btn-primary pf-btn-purple"
                    disabled={pwSaving}
                  >
                    {pwSaving ? "Saving…" : "Change Password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
