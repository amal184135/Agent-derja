import React, { useEffect, useState } from "react";
import { getProfile, updateProfile, changePassword } from "../services/api";
import type { UserProfile } from "../services/api";
import "./Profile.css";

function EyeIcon({ visible }: { visible: boolean }) {
  return visible ? (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 3l18 18M10.6 10.6a3 3 0 0 0 4.24 4.24M9.9 4.24A10.6 10.6 0 0 1 12 4c6.5 0 10 8 10 8a17.5 17.5 0 0 1-3.06 3.94M6.1 6.1C3.8 7.7 2 12 2 12s3.5 8 10 8a10.7 10.7 0 0 0 3.9-.74"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Profile() {
  const token = localStorage.getItem("token") || "";

  const [form, setForm] = useState({
    phone_number: "",
    date_naissance: "",
    sexe: "",
    statut_marital: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const data: UserProfile = await getProfile(token);
        setUsername(data.username);
        setForm({
          phone_number: data.phone_number || "",
          date_naissance: data.date_naissance || "",
          sexe: data.sexe || "",
          statut_marital: data.statut_marital || "",
        });
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [token]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await updateProfile(token, form);
      setMessage("Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword(
        token,
        passwordForm.current_password,
        passwordForm.new_password,
      );
      setPasswordMessage("Password updated successfully");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password",
      );
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return <div className="profile-page">Loading...</div>;

  return (
    <div className="profile-page">
      <h2>My Profile</h2>
      <p className="profile-subtitle">
        Manage your account details and password
      </p>

      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Account details</h3>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="profile-row">
            <div className="profile-field">
              <label>Username</label>
              <input type="text" value={username} disabled />
            </div>

            <div className="profile-field">
              <label>Phone</label>
              <input
                type="tel"
                name="phone_number"
                value={form.phone_number}
                onChange={handleChange}
              />
            </div>

            <div className="profile-field">
              <label>Date of birth</label>
              <input
                type="date"
                name="date_naissance"
                value={form.date_naissance}
                onChange={handleChange}
              />
            </div>

            <div className="profile-field">
              <label>Gender</label>
              <select name="sexe" value={form.sexe} onChange={handleChange}>
                <option value="">--</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="profile-field">
              <label>Marital status</label>
              <select
                name="statut_marital"
                value={form.statut_marital}
                onChange={handleChange}
              >
                <option value="">--</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="profile-save-btn"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>

          {message && <p className="profile-message success">{message}</p>}
          {error && <p className="profile-message error">{error}</p>}
        </form>
      </div>

      <div className="profile-section">
        <div className="profile-section-header">
          <h3>Change password</h3>
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <div className="profile-row">
            <div className="profile-field">
              <label>Current password</label>
              <div className="profile-password-wrapper">
                <input
                  type={showCurrent ? "text" : "password"}
                  name="current_password"
                  value={passwordForm.current_password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={showCurrent ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showCurrent} />
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label>New password</label>
              <div className="profile-password-wrapper">
                <input
                  type={showNew ? "text" : "password"}
                  name="new_password"
                  value={passwordForm.new_password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={showNew ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showNew} />
                </button>
              </div>
            </div>

            <div className="profile-field">
              <label>Confirm new password</label>
              <div className="profile-password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirm_password"
                  value={passwordForm.confirm_password}
                  onChange={handlePasswordChange}
                />
                <button
                  type="button"
                  className="profile-eye-btn"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  <EyeIcon visible={showConfirm} />
                </button>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="profile-save-btn"
              disabled={passwordSaving}
            >
              {passwordSaving ? "Updating..." : "Update password"}
            </button>
          </div>

          {passwordMessage && (
            <p className="profile-message success">{passwordMessage}</p>
          )}
          {passwordError && (
            <p className="profile-message error">{passwordError}</p>
          )}
        </form>
      </div>
    </div>
  );
}

export default Profile;
