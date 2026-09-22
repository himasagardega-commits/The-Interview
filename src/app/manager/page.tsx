"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/storage";
import { Briefcase, PlayCircle, FileText, ChevronDown, ChevronUp, Users, LogOut, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

interface Evaluation {
  id: string;
  questionText: string;
  candidateAnswer: string;
  score: number;
  feedback: string;
  idealModelAnswer: string;
}

interface Session {
  id: string;
  user: { name: string; email: string };
  targetRole: string;
  resumeText: string | null;
  videoUrl: string | null;
  overallScore: number | null;
  recommendation: string | null;
  createdAt: string;
  evaluations: Evaluation[];
}

export default function ManagerDashboard() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const user = getStoredUser();
    if (!user || (user.role !== "MANAGER" && user.role !== "ADMIN")) {
      router.push("/auth/login");
      return;
    }
    if (user.role === "MANAGER" && !user.isApproved) {
      router.push("/");
      return;
    }

    fetchSessions();
  }, [router]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/manager/sessions");
      const data = await res.json();
      if (data.sessions) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("the_interview_user_profile");
    router.push("/auth/login");
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-slate-50">Loading Candidates...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Hiring Manager Dashboard</h1>
              <p className="text-sm text-slate-500">Review candidate interviews, videos, and AI evaluations</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Candidate List */}
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
              No interviews have been recorded yet.
            </div>
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
                {/* Session Header (Clickable to expand) */}
                <div 
                  onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
                  className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-400 shrink-0">
                      {session.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{session.user.name}</h3>
                      <p className="text-sm text-slate-500 flex items-center gap-2">
                        {session.user.email} &bull; {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                          <Briefcase className="w-3.5 h-3.5" />
                          {session.targetRole}
                        </span>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${
                          session.overallScore && session.overallScore >= 70 
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                            : "bg-amber-50 border-amber-200 text-amber-700"
                        }`}>
                          Score: {session.overallScore || 0}/100
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-400">
                    {session.videoUrl && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                        <PlayCircle className="w-4 h-4" /> Video Recorded
                      </span>
                    )}
                    {expandedId === session.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedId === session.id && (
                  <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    
                    {/* Video Player */}
                    {session.videoUrl && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <PlayCircle className="w-4 h-4 text-indigo-600" />
                          Interview Video Recording
                        </h4>
                        <div className="w-full max-w-3xl aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
                          <video 
                            src={session.videoUrl} 
                            controls 
                            controlsList="nodownload"
                            className="w-full h-full object-contain"
                          >
                            Your browser does not support the video tag.
                          </video>
                        </div>
                      </div>
                    )}

                    {/* Resume / Details */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-600" />
                        Candidate Resume (Raw Text)
                      </h4>
                      <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {session.resumeText || "No resume data available."}
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className={`p-4 rounded-xl border ${
                      session.overallScore && session.overallScore >= 75 ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                      : session.overallScore && session.overallScore >= 60 ? "bg-amber-50 border-amber-200 text-amber-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}>
                      <h4 className="text-sm font-bold flex items-center gap-2 mb-1">
                        {session.overallScore && session.overallScore >= 75 ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        AI Hiring Recommendation
                      </h4>
                      <p className="text-sm font-medium">{session.recommendation || "Needs Review"}</p>
                    </div>

                    {/* Q&A Evaluations */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        Detailed Q&A Evaluation
                      </h4>
                      <div className="space-y-4">
                        {session.evaluations.map((evalItem, idx) => (
                          <div key={evalItem.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question {idx + 1}</span>
                              <p className="text-sm font-bold text-slate-800 mt-1">{evalItem.questionText}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-slate-500">Candidate's Spoken Answer:</span>
                                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 italic">
                                  "{evalItem.candidateAnswer}"
                                </div>
                              </div>
                              <div className="space-y-2">
                                <span className="text-xs font-semibold text-emerald-600 flex items-center justify-between">
                                  <span>AI Feedback & Ideal Answer:</span>
                                  <span className="font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-800">Score: {evalItem.score}/10</span>
                                </span>
                                <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg text-xs text-slate-700 space-y-2">
                                  <p>{evalItem.feedback}</p>
                                  <p className="font-mono text-[10px] text-slate-500 pt-2 border-t border-emerald-100">
                                    <strong>Ideal:</strong> {evalItem.idealModelAnswer}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {session.evaluations.length === 0 && (
                          <p className="text-sm text-slate-500">No evaluations recorded for this session.</p>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
