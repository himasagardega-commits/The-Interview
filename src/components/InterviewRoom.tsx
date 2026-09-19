"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Award,
  ChevronRight,
  HelpCircle,
  Clock,
  Layers,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Bot,
  Flame,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  CameraOff,
  RotateCcw,
} from "lucide-react";
import {
  AnswerEvaluation,
  InterviewSession,
  QuestionDifficulty,
  QuestionItem,
  ProctoringEvent,
} from "@/types";
import { getStoredApiKey, saveInterviewSession, getInterviewHistory } from "@/lib/storage";
import { generateNextAdaptiveQuestion, evaluateCandidateAnswer } from "@/lib/interviewEngine";
import { CameraMonitor } from "./CameraMonitor";
import { SpeechInterface } from "./SpeechInterface";

interface InterviewRoomProps {
  session: InterviewSession;
  onCompleteInterview: (completedSession: InterviewSession) => void;
  onExit: () => void;
}

interface ViolationRecord {
  code: "WINDOW_MINIMIZED" | "SCREENSHOT_ATTEMPT" | "SPLIT_SCREEN" | "FOCUS_LOST";
  title: string;
  description: string;
  timestamp: string;
  details?: string;
}

const TOTAL_QUESTIONS_TARGET = 10;

export const InterviewRoom: React.FC<InterviewRoomProps> = ({
  session,
  onCompleteInterview,
  onExit,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    session.currentQuestionIndex || 0
  );
  const [questions, setQuestions] = useState<QuestionItem[]>(session.questions);
  const [answers, setAnswers] = useState<AnswerEvaluation[]>(session.answerHistory || []);
  const [currentDifficulty, setCurrentDifficulty] = useState<QuestionDifficulty>(
    session.currentDifficulty || "Fundamental"
  );
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isEvaluated, setIsEvaluated] = useState<boolean>(false);
  const [pendingNextQuestion, setPendingNextQuestion] = useState<QuestionItem | null>(null);

  // Proctoring Security Violation State
  const [terminationViolation, setTerminationViolation] = useState<ViolationRecord | null>(() => {
    if (session.status === "terminated") {
      const lastViolation = [...(session.proctoringEvents || [])]
        .reverse()
        .find(
          (e) =>
            e.type === "window_minimized" ||
            e.type === "screenshot_attempt" ||
            e.type === "tab_switched" ||
            e.type === "split_screen" ||
            e.type === "focus_lost"
        );

      let code: ViolationRecord["code"] = "WINDOW_MINIMIZED";
      let title = "Window Minimized or Tab Switched";

      if (lastViolation?.type === "screenshot_attempt") {
        code = "SCREENSHOT_ATTEMPT";
        title = "Screenshot or Screen Capture Detected";
      } else if (lastViolation?.type === "split_screen") {
        code = "SPLIT_SCREEN";
        title = "Split-Screen or Resized Window Detected";
      } else if (lastViolation?.type === "focus_lost") {
        code = "FOCUS_LOST";
        title = "Window Focus Lost / Multitasking Detected";
      }

      return {
        code,
        title,
        description:
          lastViolation?.message ||
          "This session was terminated due to a proctoring security violation.",
        timestamp: lastViolation
          ? new Date(lastViolation.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })
          : "Prior Session",
      };
    }
    return null;
  });
  const isTerminatedRef = useRef<boolean>(session.status === "terminated");

  const safeQuestions = (questions || []).filter(
    (q): q is QuestionItem => Boolean(q && typeof q === "object" && q.questionText)
  );
  const currentQuestion: QuestionItem =
    safeQuestions[currentQuestionIndex] ||
    safeQuestions[0] || {
      id: "q-1-icebreaker",
      targetCategory: "icebreaker",
      difficulty: "Fundamental",
      questionText:
        "Welcome! Please provide your comprehensive self-introduction covering your full name, location, graduation credentials with full college name, technical and soft skills, strengths and weakness, hobbies, and realistic career goals.",
      rationale:
        "Comprehensive self-introduction evaluated against the standardized 12-point professional structure.",
      expectedKeyPoints: [],
    };

  // Helper: check if window is snapped or resized into split-screen mode
  const checkIsSplitScreenOrShrunk = useCallback(() => {
    if (typeof window === "undefined" || !window.screen) return false;
    const availW = window.screen.availWidth || window.screen.width;
    const availH = window.screen.availHeight || window.screen.height;
    // Less than 85% width or 80% height indicates a split-screen or restored floating window
    return window.outerWidth < availW * 0.85 || window.outerHeight < availH * 0.80;
  }, []);

  // Stop interview and record proctoring security violation
  const triggerTermination = useCallback(
    (
      code: "WINDOW_MINIMIZED" | "SCREENSHOT_ATTEMPT" | "SPLIT_SCREEN" | "FOCUS_LOST",
      title: string,
      description: string,
      details?: string
    ) => {
      if (isTerminatedRef.current) return;
      isTerminatedRef.current = true;

      const timeStr = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const violation: ViolationRecord = {
        code,
        title,
        description,
        timestamp: timeStr,
        details,
      };

      setTerminationViolation(violation);

      // Invalidate clipboard if screenshot key was attempted
      if (code === "SCREENSHOT_ATTEMPT") {
        try {
          if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
            navigator.clipboard.writeText("").catch(() => {});
          }
        } catch {}
      }

      const typeMapping: Record<ViolationRecord["code"], ProctoringEvent["type"]> = {
        WINDOW_MINIMIZED: "window_minimized",
        SCREENSHOT_ATTEMPT: "screenshot_attempt",
        SPLIT_SCREEN: "split_screen",
        FOCUS_LOST: "focus_lost",
      };

      // Persist termination to session history
      const newEvent: ProctoringEvent = {
        timestamp: Date.now(),
        type: typeMapping[code] || "unauthorized_action",
        message: `${title}: ${description}`,
      };

      const terminatedSession: InterviewSession = {
        ...session,
        status: "terminated",
        questions,
        answerHistory: answers,
        currentQuestionIndex,
        currentDifficulty,
        proctoringEvents: [...(session.proctoringEvents || []), newEvent],
      };

      saveInterviewSession(terminatedSession);
    },
    [session, questions, answers, currentQuestionIndex, currentDifficulty]
  );

  // 1. Detection: Window Minimized or Tab Switched (Page Visibility API)
  useEffect(() => {
    if (terminationViolation) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" || document.hidden) {
        triggerTermination(
          "WINDOW_MINIMIZED",
          "Window Minimized or Tab Switched",
          "The interview window was minimized or you switched to another tab/application. Live proctoring requires the interview window to remain focused and visible at all times."
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [terminationViolation, triggerTermination]);

  // 2. Detection: Screenshot, Screen Snip, Print Attempt
  useEffect(() => {
    if (terminationViolation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen =
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        e.key === "Snapshot" ||
        e.keyCode === 44;

      const isWinSnipping =
        (e.metaKey || e.ctrlKey || e.altKey) &&
        e.shiftKey &&
        (e.key?.toLowerCase() === "s" || e.code === "KeyS");

      const isMacScreenshot =
        e.metaKey &&
        e.shiftKey &&
        (e.key === "3" ||
          e.key === "4" ||
          e.key === "5" ||
          e.code === "Digit3" ||
          e.code === "Digit4" ||
          e.code === "Digit5");

      const isPrintCommand =
        (e.ctrlKey || e.metaKey) &&
        (e.key?.toLowerCase() === "p" || e.code === "KeyP");

      if (isPrintScreen || isWinSnipping || isMacScreenshot || isPrintCommand) {
        e.preventDefault();
        e.stopPropagation();
        triggerTermination(
          "SCREENSHOT_ATTEMPT",
          "Screenshot or Screen Capture Detected",
          "A screenshot key or screen snip shortcut was detected. Question capture and screen recording are strictly prohibited during the interview.",
          `Intercepted key: ${e.key || e.code || "PrintScreen"}`
        );
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const isPrintScreen =
        e.key === "PrintScreen" ||
        e.code === "PrintScreen" ||
        e.key === "Snapshot" ||
        e.keyCode === 44;

      if (isPrintScreen) {
        e.preventDefault();
        e.stopPropagation();
        triggerTermination(
          "SCREENSHOT_ATTEMPT",
          "Screenshot or Screen Capture Detected",
          "A screenshot key or screen snip shortcut was detected. Question capture and screen recording are strictly prohibited during the interview.",
          "Intercepted keyup: PrintScreen"
        );
      }
    };

    const handleBeforePrint = (e: Event) => {
      e.preventDefault();
      triggerTermination(
        "SCREENSHOT_ATTEMPT",
        "Print Attempt Detected",
        "An attempt to print or export the interview room was detected. Exporting questions is strictly prohibited."
      );
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("beforeprint", handleBeforePrint);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("beforeprint", handleBeforePrint);
    };
  }, [terminationViolation, triggerTermination]);

  // 3. Detection: Split-Screen Snapping or Window Resize
  useEffect(() => {
    if (terminationViolation) return;

    const handleResize = () => {
      if (checkIsSplitScreenOrShrunk()) {
        triggerTermination(
          "SPLIT_SCREEN",
          "Split-Screen or Resized Window Detected",
          "The interview window was resized or snapped into split-screen mode. Proctored interviews require a full-width, maximized window to prevent side-by-side multitasking."
        );
      }
    };

    // Check immediately on mount in case the candidate began in split-screen mode
    const checkTimer = setTimeout(() => {
      if (checkIsSplitScreenOrShrunk()) {
        triggerTermination(
          "SPLIT_SCREEN",
          "Split-Screen or Unmaximized Window Detected",
          "The interview was opened in a split-screen or unmaximized window. Proctored interviews require a full-width, maximized window to prevent side-by-side multitasking."
        );
      }
    }, 400);

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(checkTimer);
      window.removeEventListener("resize", handleResize);
    };
  }, [terminationViolation, triggerTermination, checkIsSplitScreenOrShrunk]);

  // 4. Detection: Window Focus Loss / Multitasking into Side App
  useEffect(() => {
    if (terminationViolation) return;

    let blurTimer: NodeJS.Timeout | null = null;

    const handleBlur = () => {
      // Confirm focus loss after 250ms to eliminate instantaneous micro-glitches
      blurTimer = setTimeout(() => {
        if (!document.hasFocus()) {
          triggerTermination(
            "FOCUS_LOST",
            "Window Focus Lost / Multitasking Detected",
            "The interview window lost focus because another application, side-by-side window, or desktop was clicked. Proctored interviews require continuous active focus."
          );
        }
      }, 250);
    };

    const handleFocus = () => {
      if (blurTimer) {
        clearTimeout(blurTimer);
        blurTimer = null;
      }
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (blurTimer) clearTimeout(blurTimer);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [terminationViolation, triggerTermination]);

  const handleAnswerSubmit = async (answerText: string, durationSeconds: number) => {
    setIsEvaluating(true);

    try {
      const activeKey = getStoredApiKey();

      // 1. Evaluate answer via API (computed silently for final diagnostic report)
      let evaluation: AnswerEvaluation | null = null;
      const evalController = new AbortController();
      const evalTimeout = setTimeout(() => evalController.abort(), 12000);

      try {
        const evalRes = await fetch("/api/evaluate-answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion,
            answer: answerText,
            resumeData: session.resumeData,
            jobRole: session.targetRole,
            durationSeconds,
            apiKey: activeKey,
          }),
          signal: evalController.signal,
        });
        clearTimeout(evalTimeout);

        if (evalRes.ok) {
          const evalData = await evalRes.json();
          if (evalData?.evaluation) {
            evaluation = evalData.evaluation;
          }
        }
      } catch (e) {
        clearTimeout(evalTimeout);
        console.warn("API /api/evaluate-answer timed out or errored, evaluating locally:", e);
      }

      if (!evaluation) {
        evaluation = await evaluateCandidateAnswer(
          currentQuestion,
          answerText,
          session.resumeData,
          session.targetRole,
          durationSeconds || 30,
          activeKey
        );
      }

      // Prevent duplicate evaluations for the same question
      const existingIdx = answers.findIndex((a) => a.questionId === evaluation!.questionId);
      let updatedAnswers: AnswerEvaluation[];
      if (existingIdx >= 0) {
        updatedAnswers = [...answers];
        updatedAnswers[existingIdx] = evaluation;
      } else {
        updatedAnswers = [...answers, evaluation];
      }
      setAnswers(updatedAnswers);

      const nextDiff = evaluation.nextDifficultyTriggered;
      setCurrentDifficulty(nextDiff);

      // DELAYED EVALUATION: Scores and feedback are withheld during the live interview
      // and will be comprehensively presented in the Final Diagnostic Report at the end.

      // 2. Check if all 10 questions have been answered
      const nextQuestionNum = currentQuestionIndex + 2;

      if (nextQuestionNum > TOTAL_QUESTIONS_TARGET) {
        // All 10 questions answered! Allow candidate to click 'Complete Interview'
        setPendingNextQuestion(null);
        setIsEvaluating(false);
        setIsEvaluated(true);
        return;
      }

      // 3. Generate next question dynamically with cross-session deduplication
      const history = getInterviewHistory();
      const pastSessionQuestions = (history || [])
        .filter((s) => Boolean(s && s.sessionId !== session.sessionId))
        .flatMap((s) =>
          (s?.questions || [])
            .filter((q): q is QuestionItem => Boolean(q && q.questionText))
            .map((q) => q.questionText)
        );

      let nextQ: QuestionItem | null = null;
      const qController = new AbortController();
      const qTimeout = setTimeout(() => qController.abort(), 12000);

      try {
        const qRes = await fetch("/api/question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            resumeData: session.resumeData,
            jobRole: session.targetRole,
            jobDescription:
              session.jobDescription ||
              `Standard technical competencies, responsibilities, and architecture for ${session.targetRole}`,
            askedQuestions: questions,
            pastAskedQuestions: pastSessionQuestions,
            lastEvaluation: evaluation,
            questionNumber: nextQuestionNum,
            apiKey: activeKey,
          }),
          signal: qController.signal,
        });
        clearTimeout(qTimeout);

        if (qRes.ok) {
          const qData = await qRes.json();
          if (qData && qData.question && qData.question.questionText) {
            nextQ = qData.question;
          }
        }
      } catch (err) {
        clearTimeout(qTimeout);
        console.warn("API /api/question call error or timeout, using local engine:", err);
      }

      // Reliable local engine fallback if API is unreachable or fails
      if (!nextQ || !nextQ.questionText) {
        nextQ = await generateNextAdaptiveQuestion(
          session.resumeData,
          session.targetRole,
          session.jobDescription ||
            `Standard technical competencies, responsibilities, and architecture for ${session.targetRole}`,
          questions,
          evaluation,
          nextQuestionNum,
          activeKey,
          pastSessionQuestions
        );
      }

      // Hard prevention against duplicates
      if (nextQ.questionText === currentQuestion.questionText) {
        nextQ = {
          ...nextQ,
          id: `q-${nextQuestionNum}-${Date.now()}`,
          questionText: `Let's dive deeper into technical competencies for ${session.targetRole}: Can you explain how you design resilient services, handle high-throughput concurrency, and prevent single points of failure in production?`,
        };
      }

      // Evaluation complete: store next question and enable Next Question button
      setPendingNextQuestion(nextQ);
      setIsEvaluating(false);
      setIsEvaluated(true);
    } catch (err) {
      console.error("Evaluation or question generation failed:", err);
      alert("Error evaluating answer. Please try again.");
      setIsEvaluating(false);
    }
  };

  const handleProceedToNextQuestion = () => {
    const nextQuestionNum = currentQuestionIndex + 2;

    if (nextQuestionNum > TOTAL_QUESTIONS_TARGET) {
      // All 10 questions completed! Transition to final diagnostic report
      const updatedSession: InterviewSession = {
        ...session,
        status: "evaluating",
        questions,
        answerHistory: answers,
        currentQuestionIndex: TOTAL_QUESTIONS_TARGET,
        currentDifficulty,
      };
      onCompleteInterview(updatedSession);
      return;
    }

    if (pendingNextQuestion) {
      setQuestions((prev) => [...prev, pendingNextQuestion]);
    }
    setCurrentQuestionIndex((prev) => prev + 1);
    setIsEvaluated(false);
    setPendingNextQuestion(null);
  };

  const handleFinishEarly = () => {
    if (answers.length === 0) {
      alert("Please answer at least one question before ending the interview.");
      return;
    }
    const updatedSession: InterviewSession = {
      ...session,
      status: "evaluating",
      questions,
      answerHistory: answers,
      currentQuestionIndex,
      currentDifficulty,
    };
    onCompleteInterview(updatedSession);
  };

  const difficultyColor =
    currentDifficulty === "Advanced"
      ? "bg-purple-50 text-purple-700 border-purple-200 shadow-2xs"
      : currentDifficulty === "Intermediate"
      ? "bg-amber-50 text-amber-700 border-amber-200 shadow-2xs"
      : "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs";

  // If interview was stopped due to security/proctoring violation
  if (terminationViolation) {
    return (
      <div className="w-full max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-300">
        <div className="bg-white border-2 border-rose-300 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Subtle red ambient glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-rose-100/60 rounded-full blur-3xl -z-10" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0 shadow-sm">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider">
                <StopCircle className="w-3.5 h-3.5 text-rose-600" />
                Interview Terminated
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Proctoring Violation Detected
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                This interview session was halted immediately in accordance with strict proctoring and anti-cheat policies.
              </p>
            </div>
          </div>

          {/* Violation Details Card */}
          <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-slate-800 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-950">
                  {terminationViolation.title}
                </p>
                <p className="text-xs text-rose-900 leading-relaxed">
                  {terminationViolation.description}
                </p>
                {terminationViolation.details && (
                  <p className="text-[11px] font-mono text-rose-700 pt-1">
                    {terminationViolation.details}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Incident Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Candidate</span>
              <span className="font-semibold text-slate-800 truncate block">
                {session.resumeData.candidateName}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Target Role</span>
              <span className="font-semibold text-slate-800 truncate block">
                {session.targetRole}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Violation Time</span>
              <span className="font-semibold text-slate-800 font-mono block">
                {terminationViolation.timestamp}
              </span>
            </div>
          </div>

          {/* Hardware & Stream Status */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <CameraOff className="w-4 h-4 text-slate-500" />
              <span>Hardware & Audio Status: Disconnected</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your camera stream, microphone listeners, and question generator have been safely stopped and released. The incident is permanently recorded in this session&apos;s audit trail.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Start New Interview</span>
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 font-semibold text-sm transition"
            >
              Exit to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Interview Portal Top Bar */}
      <div className="bg-white/95 border border-slate-200/90 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">{session.targetRole}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                Live Simulation
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Candidate: {session.resumeData.candidateName}
            </p>
          </div>
        </div>

        {/* Progress & Difficulty Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anti-Cheat Active</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-500">Question</span>
            <span className="font-bold text-slate-900 font-mono">
              {currentQuestionIndex + 1} / {TOTAL_QUESTIONS_TARGET}
            </span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${difficultyColor}`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Difficulty: {currentDifficulty}</span>
          </div>

          <button
            type="button"
            onClick={handleFinishEarly}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Finish & View Report
          </button>
        </div>
      </div>

      {/* Loading overlay indicator during silent background evaluation & question progression */}
      {isEvaluating && (
        <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-900 flex items-center justify-between gap-3 animate-pulse shadow-xs">
          <div className="flex items-center gap-2.5">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            <span className="text-xs font-semibold">
              Recording your answer & loading Question #{Math.min(currentQuestionIndex + 2, TOTAL_QUESTIONS_TARGET)} of {TOTAL_QUESTIONS_TARGET}...
            </span>
          </div>
          <span className="text-[11px] text-indigo-600 font-mono font-medium hidden sm:inline">
            Saving response
          </span>
        </div>
      )}

      {/* Split-Screen Main Interview Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Unified AI Question & Topic Focus Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-3xl p-6 space-y-5 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-2xl -z-10" />

            {/* Header: AI Badge & Topic Focus */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">The Interview AI</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <span className="text-[10px] text-slate-500">Adaptive AI Evaluator</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-mono block">Question</span>
                <span className="text-xs font-bold text-slate-800 font-mono">
                  #{currentQuestionIndex + 1} of {TOTAL_QUESTIONS_TARGET}
                </span>
              </div>
            </div>

            {/* Stage / Section Roadmap Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>
                {currentQuestionIndex === 0
                  ? "Section 1: Full Self-Introduction"
                  : currentQuestionIndex <= 3
                  ? `Section 2: Resume Projects (${currentQuestionIndex} of 3)`
                  : `Section 3: Target Role Focus (${currentQuestionIndex - 3} of 6)`}
              </span>
            </div>

            {/* Topic Focus & Context Tag */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 uppercase tracking-wider font-bold text-[10px]">
                  Topic Focus
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium capitalize">
                  {currentQuestion.targetCategory.replace(/_/g, " ")}
                </span>
              </div>

              {currentQuestion.contextRef && (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700">
                  <span className="text-indigo-600 font-semibold">Context: </span>
                  {currentQuestion.contextRef}
                </div>
              )}
            </div>

            {/* Active Question Text */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Current Question
              </span>
              <p className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                &quot;{currentQuestion.questionText}&quot;
              </p>
            </div>

            {/* Evaluation Rationale */}
            {currentQuestion.rationale && (
              <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/60">
                <HelpCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold text-slate-800 block text-[11px]">Evaluation Focus</span>
                  <span className="leading-relaxed text-slate-600">{currentQuestion.rationale}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Candidate Webcam & Interactive Stage (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Candidate Live Webcam Monitor with Proctoring HUD */}
          <CameraMonitor />

          {/* Speech-to-Text & Audio Interaction with Finish and Evaluate + Next Question flow */}
          <SpeechInterface
            currentQuestion={currentQuestion}
            onSubmitAnswer={handleAnswerSubmit}
            onNextQuestion={handleProceedToNextQuestion}
            isEvaluating={isEvaluating}
            isEvaluated={isEvaluated}
            nextQuestionNumber={currentQuestionIndex + 2}
            totalQuestions={TOTAL_QUESTIONS_TARGET}
          />
        </div>
      </div>
    </div>
  );
};
