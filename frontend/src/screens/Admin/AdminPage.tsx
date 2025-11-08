import React, { useEffect, useMemo, useState } from "react";
import {
  apiLogin,
  apiListSnapshots,
  apiRefreshGeoJSON,
  apiRestoreSnapshot,
  apiLogout,
  type LoginResponse,
  apiAdminListUsers,
  apiAdminCreateAdmin,
  apiAdminDeleteUser,
  type AdminUser,
} from "../../services/api";
import {
  heroBackgroundStyle,
  heroOverlayClass,
} from "../../theme/heroStyles";

export default function AdminPage() {
  const [token, setToken] = useState<string>(
    () => localStorage.getItem("accessToken") || ""
  );
  const [email, setEmail] = useState("admin@example.com");
  const [password, setPassword] = useState("pass123");
  const [note, setNote] = useState("");
  const [geojsonText, setGeojsonText] = useState("");
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const currentUserEmail =
    typeof window !== "undefined"
      ? localStorage.getItem("userEmail") || ""
      : "";
  const [activeTab, setActiveTab] = useState<"data" | "users">("data");
  const authed = !!token;

  useEffect(() => {
    if (!authed) return;
    refreshSnapshots().catch((e: any) =>
      setError(e?.message || "Failed to load snapshots")
    );
    refreshUsers().catch((e: any) =>
      setError(e?.message || "Failed to load users")
    );
  }, [authed]);

  async function refreshSnapshots() {
    const res = await apiListSnapshots(token);
    setSnapshots(res.snapshots || []);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r: LoginResponse = await apiLogin(email, password);
      setToken(r.access_token);
      localStorage.setItem("accessToken", r.access_token);
      localStorage.setItem("refreshToken", r.refresh_token);
      localStorage.setItem("userEmail", r.user?.email || "");
      localStorage.setItem("userRole", r.user?.role || "");
      setError(null);
      await refreshUsers();
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefresh() {
    setBusy(true);
    try {
      let data: any;
      try {
        data = JSON.parse(geojsonText);
      } catch {
        alert("Invalid GeoJSON JSON");
        return;
      }
      await apiRefreshGeoJSON(token, data, note || undefined);
      await refreshSnapshots();
      // warm file endpoint
      fetch("/data/opportunity.geojson?t=" + Date.now()).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore(id: string) {
    setBusy(true);
    try {
      await apiRestoreSnapshot(token, id);
      await refreshSnapshots();
      fetch("/data/opportunity.geojson?t=" + Date.now()).catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function refreshUsers() {
    const res = await apiAdminListUsers(token);
    setUsers(res.users || []);
  }

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!createEmail || !createPassword) {
      setError("Email and password required");
      return;
    }
    setBusy(true);
    try {
      await apiAdminCreateAdmin(token, createEmail, createPassword);
      setCreateEmail("");
      setCreatePassword("");
      await refreshUsers();
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Failed to create admin");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteUser(id: string) {
    if (!confirm("Delete this user? This action cannot be undone.")) return;
    setBusy(true);
    try {
      await apiAdminDeleteUser(token, id);
      await refreshUsers();
    } catch (err: any) {
      alert(err?.message || "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    const rt = localStorage.getItem("refreshToken") || "";
    await apiLogout(rt);
    setToken("");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userRole");
    window.location.hash = "#/login";
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center py-16 relative px-4"
      style={heroBackgroundStyle}
    >
      <div className={heroOverlayClass} aria-hidden="true" />
      <div className="relative w-full max-w-7xl bg-white/90 backdrop-blur-2xl border border-white/40 rounded-3xl shadow-[0_35px_90px_-25px_rgba(15,15,45,0.6)] p-12 md:p-24 flex flex-col gap-14">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-[2.6rem] font-bold mt-4 mb-0 text-center text-black">
            Admin Console
          </h1>
          <a
            href="#/map"
            className="px-5 py-2.5 rounded-full border border-gray-300 text-black font-bold bg-white hover:bg-gray-100 transition-all text-base shadow-sm"
            style={{ minWidth: 100, textAlign: "center", color: "#000" }}
          >
            View Map
          </a>
        </div>
        {/* Auth/Login */}
        {!authed ? (
          <form
            onSubmit={handleLogin}
            className="max-w-md mx-auto w-full bg-violet-50 rounded-xl p-6 flex flex-col gap-4 shadow"
          >
            <h2 className="text-xl font-bold text-violet-700 mb-2">
              Admin Login
            </h2>
            <input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
              required
            />
            {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
            <button
              disabled={busy}
              className="w-full py-3 rounded bg-violet-600 text-white font-semibold text-lg shadow hover:bg-violet-700 transition"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-8">
            <div className="flex gap-4 flex-wrap">
              <button
                className={`px-4 py-2 rounded-lg font-semibold border ${
                  activeTab === "data"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"
                }`}
                onClick={() => setActiveTab("data")}
              >
                Data Management
              </button>
              <button
                className={`px-4 py-2 rounded-lg font-semibold border ${
                  activeTab === "users"
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"
                }`}
                onClick={() => setActiveTab("users")}
              >
                User Management
              </button>
              <button
                className="ml-auto px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold"
                onClick={logout}
              >
                Logout
              </button>
            </div>
            {/* Data Management tab */}
            {activeTab === "data" && (
              <div className="bg-violet-50 rounded-2xl p-6 shadow flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-violet-700 mb-2">
                    Data Management
                  </h3>
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Note (optional)"
                    className="border border-gray-300 rounded px-4 py-2 w-full mb-3"
                  />
                  <textarea
                    value={geojsonText}
                    onChange={(e) => setGeojsonText(e.target.value)}
                    placeholder="Paste FeatureCollection JSON here"
                    className="border border-gray-300 rounded px-4 py-2 w-full h-32 font-mono text-xs mb-3"
                  />
                  <button
                    disabled={busy}
                    onClick={handleRefresh}
                    className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 font-semibold shadow"
                  >
                    {busy ? "Uploading…" : "Refresh Dataset"}
                  </button>
                </div>
                <div>
                  <h3 className="text-md font-bold text-violet-700 mb-2">
                    Snapshots
                  </h3>
                  <div className="flex flex-col gap-2">
                    {snapshots.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between py-2 border-b border-violet-100"
                      >
                        <div className="text-sm">
                          <span className="font-mono">{s.id.slice(0, 8)}</span>
                          <span className="text-gray-500 ml-2">
                            {s.created_at}
                          </span>
                          {s.is_current && (
                            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-violet-100 text-violet-700">
                              current
                            </span>
                          )}
                        </div>
                        <div>
                          {!s.is_current && (
                            <button
                              disabled={busy}
                              onClick={() => handleRestore(s.id)}
                              className="px-2 py-1 border rounded-lg text-sm hover:bg-violet-100"
                            >
                              Restore
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {snapshots.length === 0 && (
                      <div className="text-sm text-gray-500">No snapshots</div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* User Management tab */}
            {activeTab === "users" && (
              <div className="bg-violet-50 rounded-2xl p-6 shadow flex flex-col gap-6">
                <div>
                  <h3 className="text-lg font-bold text-violet-700 mb-2">
                    User Management
                  </h3>
                  <button
                    disabled={busy}
                    onClick={() =>
                      refreshUsers().catch((e: any) =>
                        setError(e?.message || "Failed to load users")
                      )
                    }
                    className="px-3 py-1 border rounded-lg text-sm bg-violet-100 text-violet-700 hover:bg-violet-200 mb-3"
                  >
                    Reload users
                  </button>
                  <form
                    onSubmit={handleCreateAdmin}
                    className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"
                  >
                    <input
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      placeholder="Admin email"
                      className="border border-gray-300 rounded px-4 py-2"
                    />
                    <input
                      type="password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      placeholder="Admin password"
                      className="border border-gray-300 rounded px-4 py-2"
                    />
                    <button
                      disabled={busy}
                      className="px-4 py-2 rounded-lg text-white bg-violet-600 hover:bg-violet-700 font-semibold shadow"
                    >
                      {busy ? "Creating…" : "Create Admin"}
                    </button>
                  </form>
                  {error && (
                    <div className="text-sm text-red-600 mb-2">{error}</div>
                  )}
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600">
                          <th className="py-1 pr-4">Email</th>
                          <th className="py-1 pr-4">Role</th>
                          <th className="py-1 pr-4">Created</th>
                          <th className="py-1 pr-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => {
                          const isSelf =
                            currentUserEmail &&
                            u.email.toLowerCase() ===
                              currentUserEmail.toLowerCase();
                          return (
                            <tr
                              key={u.id}
                              className="border-t border-violet-100"
                            >
                              <td className="py-1 pr-4 font-mono">{u.email}</td>
                              <td className="py-1 pr-4">
                                <span className="px-2 py-0.5 rounded bg-gray-100">
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-1 pr-4">
                                {u.created_at || "—"}
                              </td>
                              <td className="py-1 pr-4">
                                {!isSelf && (
                                  <button
                                    disabled={busy}
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="px-2 py-1 border rounded-lg hover:bg-violet-100"
                                  >
                                    Delete
                                  </button>
                                )}
                                {isSelf && (
                                  <span className="text-xs text-gray-400">
                                    (you)
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {users.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-2 text-gray-500">
                              No users
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
