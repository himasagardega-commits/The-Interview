"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { ResumeSetupStep } from "@/components/ResumeSetupStep";
import { InterviewRoom } from "@/components/InterviewRoom";
import { ReportDashboard } from "@/components/ReportDashboard";
import { generateFirstQuestion } from "@/lib/interviewEngine";
import { generateInterviewReport } from "@/lib/evaluationEngine";
import {
  saveInterviewSession,
  getActiveSession,
  clearActiveSession,
  getStoredApiKey,
  getInterviewHistory,
} from "@/lib/storage";
import {
  AtsScoreDetails,
  FinalReport,
  InterviewSession,
  ResumeData,
} from "@/types";
import { RefreshCw } from "lucide-react";
import { LoginPage } from "@/components/LoginPage";
import { useAuth } from "@/context/AuthContext";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<"setup" | "interview" | "report">("setup");

  const [activeSession, setActiveSession] = useState<InterviewSession | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // Restore saved session on mount if available
  useEffect(() => {
    const saved = getActiveSession();
    if (saved) {
      setActiveSession(saved);
      if (saved.finalReport) {
        setCurrentStep("report");
      } else if (saved.status === "in-progress" && saved.questions?.length > 0) {
        setCurrentStep("interview");
      }
    }
  }, []);

  // Direct start interview from setup with dynamic non-repeating question generation
  // Direct start interview from setup with dynamic non-repeating question generation
  const handleStartInterviewDirectly = (
    resumeData: ResumeData,
    atsScore: AtsScoreDetails,
    jobRole: string,
    jobDescription: string
  ) => {
    const sessionId = `sess-${Date.now().toString().slice(-6)}`;

    // Gather all questions asked in prior sessions to guarantee fresh questions
    const history = getInterviewHistory();
    const pastQuestionTexts = (history || []).flatMap(
      (s) => (s?.questions || []).filter((q) => Boolean(q && q.questionText)).map((q) => q.questionText)
    );

    // Synchronous, instantaneous generation of the 12-point self-introduction question
    const initialQuestion = generateFirstQuestion(resumeData, jobRole, pastQuestionTexts);

    const newSession: InterviewSession = {
      sessionId,
      createdAt: new Date().toISOString(),
      targetRole: jobRole,
      jobDescription,
      resumeData,
      atsScore,
      status: "in-progress",
      questions: [initialQuestion],
      currentQuestionIndex: 0,
      currentDifficulty: "Fundamental",
      answerHistory: [],
      proctoringEvents: [],
    };

    setActiveSession(newSession);
    saveInterviewSession(newSession);
    setCurrentStep("interview");
  };

  // Handler when interview finishes
  const handleCompleteInterview = async (completedSession: InterviewSession) => {
    setIsGeneratingReport(true);
    try {
      const activeKey = getStoredApiKey();
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: completedSession, apiKey: activeKey }),
      });

      let finalReport: FinalReport;
      if (res.ok) {
        const data = await res.json();
        finalReport = data.report;
      } else {
        finalReport = await generateInterviewReport(completedSession);
      }

      const finalSession: InterviewSession = {
        ...completedSession,
        status: "completed",
        finalReport,
      };

      setActiveSession(finalSession);
      saveInterviewSession(finalSession);
      setCurrentStep("report");
    } catch (err) {
      console.error("Failed to generate final report:", err);
      const fallbackReport = await generateInterviewReport(completedSession);
      const finalSession: InterviewSession = {
        ...completedSession,
        status: "completed",
        finalReport: fallbackReport,
      };
      setActiveSession(finalSession);
      saveInterviewSession(finalSession);
      setCurrentStep("report");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSelectHistoricalSession = (session: InterviewSession) => {
    setActiveSession(session);
    if (session.finalReport) {
      setCurrentStep("report");
    } else {
      setCurrentStep("interview");
    }
  };

  const handleResetToHome = () => {
    clearActiveSession();
    setActiveSession(null);
    setCurrentStep("setup");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <Navbar
        onSelectHistoricalSession={handleSelectHistoricalSession}
        onResetToHome={handleResetToHome}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading overlay for report generation */}
        {isGeneratingReport && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl max-w-md w-full flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-900">
                  Evaluating Resume & Generating Report
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Analyzing missing fields for your role, interview answers, speech pacing, and generating model answers...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* View Step 1: Target Role & Resume Ingestion */}
        {currentStep === "setup" && (
          <ResumeSetupStep onStartInterviewDirectly={handleStartInterviewDirectly} />
        )}

        {/* View Step 2: Interactive Video/Voice Mock Interview Room */}
        {currentStep === "interview" && activeSession && (
          <InterviewRoom
            session={activeSession}
            onCompleteInterview={handleCompleteInterview}
            onExit={handleResetToHome}
          />
        )}

        {/* View Step 3: Final Diagnostic Report with Resume Gap Analysis & Missing Fields */}
        {currentStep === "report" && activeSession && activeSession.finalReport && (
          <ReportDashboard
            report={activeSession.finalReport}
            session={activeSession}
            onRetakeInterview={handleResetToHome}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white/60 backdrop-blur-sm py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center">
          <span className="font-medium text-slate-700">The Interview — Personalized AI Mock Interview & ATS Evaluation System</span>
        </div>
      </footer>
    </div>
  );
}
