import React, { useEffect, useState } from "react";
import { apiMe, apiUpdateProfile, type Me } from "../../services/api";

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const email =
    me?.email ||
    (typeof window !== "undefined"
      ? localStorage.getItem("userEmail") || ""
      : "");
  const role =
    me?.role ||
    (typeof window !== "undefined"
      ? localStorage.getItem("userRole") || ""
      : "");
  const name =
    me?.display_name && me.display_name.trim()
      ? me.display_name
      : email
      ? email.split("@")[0]
      : "User";
  const initial = name ? name[0]?.toUpperCase() : "U";
  const industryLabel =
    me?.industry === "student"
      ? "Student"
      : me?.industry === "businessmen"
      ? "Businessmen"
      : me?.industry || "—";

  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || ""
        : "";
    if (!token) return;
    apiMe(token)
      .then(setMe)
      .catch(() => {});
  }, []);

  const [formName, setFormName] = useState("");
  const [formIndustry, setFormIndustry] = useState("student");
  const [formPhone, setFormPhone] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [formPictureUrl, setFormPictureUrl] = useState("");

  useEffect(() => {
    if (edit && me) {
      setFormName(name || "");
      setFormIndustry(me.industry || "student");
      setFormPhone(me.phone || "");
      setFormPictureUrl(me.picture_url || "");
      setCurrentPw("");
      setNewPw("");
    }
  }, [edit, me]);

  async function handleSave() {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken") || ""
        : "";
    if (!token || !me) return;
    setSaving(true);
    setErr(null);
    setOk(null);
    try {
      const body: any = {
        display_name: formName.trim() || null,
        industry: formIndustry || null,
        phone: formPhone.trim() || null,
      };
      if (formPictureUrl !== (me.picture_url || "")) {
        body.picture_url = formPictureUrl.trim() || null;
      }
      if (newPw) {
        body.new_password = newPw;
        if (currentPw) body.current_password = currentPw;
      }
      const updated = await apiUpdateProfile(token, body);
      setMe(updated);
      setOk("Profile updated");
      setEdit(false);
    } catch (e: any) {
      setErr(e?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col items-center py-16">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-10 px-12 md:px-32 flex flex-col gap-8">
        <div className="flex flex-col items-center gap-3 mb-6">
          {me?.picture_url ? (
            <img
              src={me.picture_url}
              alt={name}
              className="w-20 h-20 rounded-full object-cover border-4 border-violet-200 shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-violet-600 text-white flex items-center justify-center text-3xl font-bold border-4 border-violet-200 shadow">
              {initial}
            </div>
          )}
          <div className="text-3xl font-bold text-black mt-2">{name}</div>
          <div className="text-base text-gray-500">
            {(role || "user").charAt(0).toUpperCase() +
              (role || "user").slice(1)}
          </div>
        </div>
        {err && (
          <div className="text-sm text-red-600 mb-2 text-center">{err}</div>
        )}
        {ok && (
          <div className="text-sm text-green-700 mb-2 text-center">{ok}</div>
        )}
        <div className="space-y-6 text-lg">
          <div className="flex items-center justify-between">
            <div className="text-gray-700 text-lg">Email</div>
            <div className="font-mono text-right text-lg">{email || "—"}</div>
          </div>
          {!edit && (
            <>
              <div className="flex items-center justify-between">
                <div className="text-gray-700 text-lg">Industry</div>
                <div className="text-lg">{industryLabel}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-gray-700 text-lg">Phone</div>
                <div className="text-lg">{me?.phone || "—"}</div>
              </div>
            </>
          )}
          {edit && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Name</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={name}
                  className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Profile picture URL
                </label>
                <input
                  value={formPictureUrl}
                  onChange={(e) => setFormPictureUrl(e.target.value)}
                  placeholder={
                    me?.picture_url || "https://example.com/photo.jpg"
                  }
                  className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Industry
                </label>
                <select
                  value={formIndustry}
                  onChange={(e) => setFormIndustry(e.target.value)}
                  className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="student">Student</option>
                  <option value="businessmen">Businessmen</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder={me?.phone || ""}
                  className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>
              {!me?.google_sub && (
                <div className="pt-2">
                  <div className="text-sm text-gray-500 mb-1">
                    Change password (optional)
                  </div>
                  <input
                    type="password"
                    placeholder="Current password"
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    className="w-full border border-gray-300 rounded px-4 py-3 text-base mb-3 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full border border-gray-300 rounded px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              )}
            </div>
          )}
          {!edit && (
            <div className="flex items-center justify-between">
              <div className="text-gray-700 text-lg">Password</div>
              <div className="font-mono text-lg">********</div>
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-between gap-4 text-lg">
          <a
            href="#/map"
            className="px-5 py-2 rounded-lg border border-violet-600 text-violet-700 font-semibold hover:bg-violet-50 transition text-lg"
          >
            Back to Map
          </a>
          {!edit && (
            <button
              onClick={() => setEdit(true)}
              className="px-5 py-2 rounded-lg text-white bg-violet-600 font-semibold shadow hover:bg-violet-700 transition text-lg"
            >
              Update profile
            </button>
          )}
          {edit && (
            <div className="flex gap-2">
              <button
                onClick={() => setEdit(false)}
                disabled={saving}
                className="px-5 py-2 rounded-lg border border-violet-600 text-violet-700 font-semibold hover:bg-violet-50 transition text-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-white bg-violet-600 font-semibold shadow hover:bg-violet-700 transition text-lg"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
