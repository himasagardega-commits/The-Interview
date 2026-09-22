"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/storage";
import { CheckCircle, XCircle, Shield, Trash2, LogOut, Users } from "lucide-react";

interface Manager {
  id: string;
  name: string;
  email: string;
  isApproved: boolean;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || user.role !== "ADMIN") {
      router.push("/auth/login");
      return;
    }

    fetchManagers();
  }, [router]);

  const fetchManagers = async () => {
    try {
      const res = await fetch("/api/admin/managers");
      const data = await res.json();
      if (data.managers) {
        setManagers(data.managers);
      }
    } catch (error) {
      console.error("Failed to fetch managers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/managers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApproved: !currentStatus }),
      });
      if (res.ok) {
        setManagers(managers.map(m => (m.id === id ? { ...m, isApproved: !currentStatus } : m)));
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this manager?")) return;
    try {
      const res = await fetch(`/api/admin/managers/${id}`, { method: "DELETE" });
      if (res.ok) {
        setManagers(managers.filter(m => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete manager:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("the_interview_user_profile");
    router.push("/auth/login");
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">System Admin</h1>
              <p className="text-sm text-slate-500">Manage recruiter and manager access</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/manager")}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <Users className="w-4 h-4" />
              View Candidate Interviews
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-lg font-bold text-slate-900">Manager Registrations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Email</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-sm">
                      No managers registered yet.
                    </td>
                  </tr>
                ) : (
                  managers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-900">{m.name}</td>
                      <td className="py-4 px-6 text-sm text-slate-600">{m.email}</td>
                      <td className="py-4 px-6">
                        {m.isApproved ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <CheckCircle className="w-3.5 h-3.5" /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                            <XCircle className="w-3.5 h-3.5" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 flex items-center gap-3">
                        <button
                          onClick={() => handleToggleApproval(m.id, m.isApproved)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                            m.isApproved
                              ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                              : "bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-sm"
                          }`}
                        >
                          {m.isApproved ? "Revoke Access" : "Approve Manager"}
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
