"use client";

import React, { useState, useEffect } from "react";
import { History, X, Trash2, Award, Calendar, ChevronRight, FileText } from "lucide-react";
import { getInterviewHistory, saveInterviewSession } from "@/lib/storage";
import { InterviewSession } from "@/types";

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSession: (session: InterviewSession) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onSelectSession,
}) => {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSessions(getInterviewHistory());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (confirm("Are you sure you want to clear your interview history?")) {
      localStorage.removeItem("talentpulse_sessions");
      setSessions([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 max-h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 border border-purple-100 rounded-2xl text-purple-600">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Interview Progress & History</h2>
              <p className="text-xs text-slate-500">
                Track your mock interview attempts and ATS evaluation scores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-700">No past interview sessions yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Complete an interview to see your detailed historical reports and analytics here.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                onClick={() => {
                  onSelectSession(session);
                  onClose();
                }}
                className="group p-4 bg-slate-50/80 hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 rounded-2xl transition cursor-pointer flex items-center justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition">
                      {session.targetRole}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        session.status === "completed"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {session.status === "completed" ? "Report Ready" : "In Progress"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span>
                      ATS:{" "}
                      <strong className="text-indigo-600">
                        {session.atsScore?.overallScore || "N/A"}%
                      </strong>
                    </span>
                    {session.finalReport && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-emerald-700 font-medium">
                          <Award className="w-3.5 h-3.5 text-emerald-600" />
                          Overall: {session.finalReport.overallScore}%
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-600 group-hover:translate-x-1 transition flex items-center gap-1">
                    Open <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {sessions.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Total sessions: {sessions.length}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
