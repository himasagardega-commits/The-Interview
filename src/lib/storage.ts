import { InterviewSession, UserProfile, QuestionItem } from "@/types";

const STORAGE_KEYS = {
  API_KEY: "the_interview_gemini_key",
  USER_PROFILE: "the_interview_user_profile",
  SESSIONS: "the_interview_sessions",
  ACTIVE_SESSION: "the_interview_active_session",
};

export const getStoredApiKey = (): string => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || localStorage.getItem("talentpulse_gemini_key") || "";
};

export const setStoredApiKey = (key: string): void => {
  if (typeof window === "undefined") return;
  if (key) {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
  }
};

export const getStoredUser = (): UserProfile | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILE) || localStorage.getItem("talentpulse_user_profile");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: UserProfile | null): void => {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    localStorage.removeItem("talentpulse_user_profile");
  }
};

export const getInterviewHistory = (): InterviewSession[] => {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS) || localStorage.getItem("talentpulse_sessions");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s: any): s is InterviewSession => Boolean(s && typeof s === "object"))
      .map((s: any) => ({
        ...s,
        questions: Array.isArray(s.questions)
          ? s.questions.filter((q: any): q is QuestionItem => Boolean(q && typeof q === "object" && q.questionText))
          : [],
        answerHistory: Array.isArray(s.answerHistory)
          ? s.answerHistory.filter((a: any) => Boolean(a && typeof a === "object"))
          : [],
      }));
  } catch {
    return [];
  }
};

export const saveInterviewSession = (session: InterviewSession): void => {
  if (typeof window === "undefined") return;
  const history = getInterviewHistory();
  const existingIdx = history.findIndex((s) => s.sessionId === session.sessionId);
  if (existingIdx >= 0) {
    history[existingIdx] = session;
  } else {
    history.unshift(session);
  }
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(history));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session));
};

export const getActiveSession = (): InterviewSession | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...parsed,
      questions: Array.isArray(parsed.questions)
        ? parsed.questions.filter((q: any): q is QuestionItem => Boolean(q && typeof q === "object" && q.questionText))
        : [],
    };
  } catch {
    return null;
  }
};

export const clearActiveSession = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
};
