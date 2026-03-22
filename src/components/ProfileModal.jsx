import { useState, useEffect } from "react";
import { apiGet, apiPut } from "../utils/api";
import "./ProfileModal.css";

function getInitials(name = "") {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
}

const AVATAR_COLORS = ["#6366f1", "#a855f7", "#22c55e", "#f97316", "#06b6d4", "#ec4899"];
const ROLE_COLORS   = { ADMIN: "#6366f1", DEVELOPER: "#22c55e", MANAGER: "#f97316" };

export default function ProfileModal({ onClose }) {
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState("edit"); // 'edit' | 'password'

  const [profileForm, setProfileForm] = useState({ username: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg]   = useState(null);

  const [pwForm, setPwForm]           = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwMsg, setPwMsg]             = useState(null);

  useEffect(() => {
    apiGet("/api/profile")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) {
          setProfile(data);
          setProfileForm({ username: data.username || "", email: data.email || "" });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim() || !profileForm.email.trim()) {
      setProfileMsg({ type: "error", text: "Username and email are required." });
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
          localStorage.setItem("user", JSON.stringify({ ...stored, username: updated.username, email: updated.email }));
        } catch { /* ignore */ }
        setProfileMsg({ type: "success", text: "Profile updated successfully." });
      } else {
        const err = await res.text().catch(() => "");
        setProfileMsg({ type: "error", text: err || "Failed to update profile." });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Network error." });
    }
    setProfileSaving(false);
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwMsg({ type: "error", text: "Both current and new password are required." });
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
        setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
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

  return (
    <div className="pm-overlay" onClick={onClose}>
      <div className="pm-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-header">
          <h2 className="pm-title">My Profile</h2>
          <button className="pm-close" onClick={onClose}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="pm-loading">
            <div className="pm-skeleton" />
            <div className="pm-skeleton pm-skeleton--short" />
            <div className="pm-skeleton" />
          </div>
        ) : (
          <>
            {/* Avatar strip */}
            <div className="pm-avatar-strip">
              <div className="pm-avatar" style={{ background: avatarColor }}>
                {getInitials(profile?.username || "")}
              </div>
              <div className="pm-avatar-info">
                <span className="pm-avatar-name">{profile?.username || "—"}</span>
                <span className="pm-avatar-email">{profile?.email || "—"}</span>
              </div>
              {profile?.role && (
                <span
                  className="pm-role-badge"
                  style={{
                    color:       ROLE_COLORS[profile.role] || "#6b7280",
                    background:  (ROLE_COLORS[profile.role] || "#6b7280") + "18",
                    borderColor: (ROLE_COLORS[profile.role] || "#6b7280") + "40",
                  }}
                >
                  {profile.role}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="pm-tabs">
              <button
                className={`pm-tab${tab === "edit" ? " pm-tab--active" : ""}`}
                onClick={() => { setTab("edit"); setProfileMsg(null); }}
              >
                Edit Profile
              </button>
              <button
                className={`pm-tab${tab === "password" ? " pm-tab--active" : ""}`}
                onClick={() => { setTab("password"); setPwMsg(null); }}
              >
                Change Password
              </button>
            </div>

            {/* Edit Profile */}
            {tab === "edit" && (
              <form className="pm-form" onSubmit={handleProfileSave}>
                {profileMsg && (
                  <div className={`pm-msg pm-msg--${profileMsg.type}`}>{profileMsg.text}</div>
                )}
                <div className="pm-form-group">
                  <label>Username</label>
                  <input
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    placeholder="johndoe"
                  />
                </div>
                <div className="pm-form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="pm-form-actions">
                  <button type="button" className="pm-btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="pm-btn-primary" disabled={profileSaving}>
                    {profileSaving ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Change Password */}
            {tab === "password" && (
              <form className="pm-form" onSubmit={handlePasswordSave}>
                {pwMsg && (
                  <div className={`pm-msg pm-msg--${pwMsg.type}`}>{pwMsg.text}</div>
                )}
                <div className="pm-form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    value={pwForm.currentPassword}
                    onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                  />
                </div>
                <div className="pm-form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    placeholder="Enter new password"
                  />
                </div>
                <div className="pm-form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                  />
                </div>
                <div className="pm-form-actions">
                  <button type="button" className="pm-btn-secondary" onClick={onClose}>Cancel</button>
                  <button type="submit" className="pm-btn-primary" disabled={pwSaving}>
                    {pwSaving ? "Saving…" : "Change Password"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
