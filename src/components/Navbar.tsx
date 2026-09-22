"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  History,
  LogOut,
  ShieldCheck,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ApiKeyModal } from "./ApiKeyModal";
import { HistoryModal } from "./HistoryModal";
import { getStoredApiKey, getInterviewHistory } from "@/lib/storage";
import { InterviewSession } from "@/types";

interface NavbarProps {
  onSelectHistoricalSession?: (session: InterviewSession) => void;
  onResetToHome?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSelectHistoricalSession,
  onResetToHome,
}) => {
  const { user, logout } = useAuth();
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [historyCount, setHistoryCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    setHasApiKey(Boolean(getStoredApiKey()));
    setHistoryCount(getInterviewHistory().length);
  }, [isApiKeyModalOpen, isHistoryModalOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div
            onClick={onResetToHome}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition overflow-hidden flex-shrink-0">
              <img src="/app-icon.jpg" alt="Logo" className="w-full h-full object-cover rounded-[10px]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  The Interview
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  AI PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                Personalized Mock Interview & ATS Evaluation
              </p>
            </div>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* History Trigger */}
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium transition"
            >
              <History className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden md:inline">History</span>
              {historyCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[10px] flex items-center justify-center font-bold">
                  {historyCount}
                </span>
              )}
            </button>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
                </div>
                <div className="text-left hidden lg:block">
                  <p className="text-xs font-semibold text-slate-900 leading-tight">
                    {user?.name || "Candidate"}
                  </p>
                  <p className="text-[10px] text-slate-500 leading-none">
                    {user?.email || ""}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                        {user?.role || "Candidate"} Account
                      </span>
                    </div>
                    <p className="text-xs text-slate-900 font-bold mt-1">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">{user?.email}</p>
                  </div>
                  
                  {user?.role === "ADMIN" && (
                    <button
                      onClick={() => {
                        window.location.href = "/admin";
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Admin Dashboard
                    </button>
                  )}

                  {user?.role === "MANAGER" && (
                    <button
                      onClick={() => {
                        window.location.href = "/manager";
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 transition"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Manager Dashboard
                    </button>
                  )}

                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition border-t border-slate-100"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectSession={(session) => {
          if (onSelectHistoricalSession) onSelectHistoricalSession(session);
        }}
      />
    </>
  );
};
