"use client";

import React, { useState, useEffect } from "react";
import { Key, CheckCircle, AlertCircle, Sparkles, X } from "lucide-react";
import { getStoredApiKey, setStoredApiKey } from "@/lib/storage";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "testing">("idle");
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setStatus("idle");
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey);
    setStatus("saved");
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      setTestResult("Please enter an API key first.");
      return;
    }
    setStatus("testing");
    const cleanKey = apiKey.trim();

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`
      );
      if (res.ok) {
        setTestResult("Success! Key connected and verified with Google Gemini.");
      } else {
        setTestResult("Google API Key error or quota exceeded. Please check Google AI Studio.");
      }
    } catch {
      setTestResult("Network error testing key. Key saved for direct server requests.");
    }
    setStatus("idle");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-7 text-slate-900 animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition p-1.5 rounded-lg hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-600">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Google Gemini API Key</h2>
            <p className="text-xs text-slate-500">
              Powered by Google Gemini AI
            </p>
          </div>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 mb-5 text-xs text-indigo-900 space-y-2">
          <div className="flex items-start gap-2 text-indigo-700">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-indigo-600" />
            <span>
              <strong>Google Gemini AI Engine:</strong> Powers real-time adaptive question generation, strict answer evaluation, and final diagnostic reporting.
            </span>
          </div>
          <p className="text-indigo-600/80">
            Enter your Google Gemini API key below. If left empty, the system automatically uses the configured server environment key or the deterministic bar-raiser engine.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Google Gemini API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AQ... or AIzaSy..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm font-mono transition"
            />
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                testResult.startsWith("Success")
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border border-amber-200 text-amber-800"
              }`}
            >
              {testResult.startsWith("Success") ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              )}
              <span>{testResult}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={status === "testing" || !apiKey}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {status === "testing" ? "Verifying..." : "Test Connection"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-500 hover:text-slate-800 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5"
              >
                {status === "saved" ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-white" />
                    <span>Saved!</span>
                  </>
                ) : (
                  "Save & Apply"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
