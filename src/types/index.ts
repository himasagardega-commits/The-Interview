export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role?: string;
  totalInterviews: number;
  createdAt: string;
}

export interface ExtractedSkills {
  technical: string[];
  frameworks: string[];
  languages: string[];
  toolsAndCloud: string[];
  softSkills: string[];
}

export interface EducationItem {
  degree: string;
  institution: string;
  year?: string;
  major?: string;
  gpa?: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  duration?: string;
  responsibilities: string[];
}

export interface ProjectItem {
  title: string;
  techStack: string[];
  description: string;
  impact?: string;
}

export interface CertificationItem {
  name: string;
  issuer?: string;
  date?: string;
}

export interface ResumeData {
  rawText: string;
  candidateName: string;
  email?: string;
  phone?: string;
  skills: ExtractedSkills;
  education: EducationItem[];
  experience: ExperienceItem[];
  projects: ProjectItem[];
  certifications: CertificationItem[];
  courses: string[];
  summary?: string;
}

export interface MissingSkill {
  skill: string;
  importance: "critical" | "recommended" | "bonus";
  category: string;
}

export interface AtsScoreDetails {
  overallScore: number; // 0 - 100
  categoryBreakdown: {
    keywordMatch: number;
    experienceAlignment: number;
    skillCoverage: number;
    formattingReadability: number;
  };
  matchedSkills: string[];
  missingSkills: MissingSkill[];
  strengths: string[];
  weaknesses: string[];
  improvementRecommendations: string[];
}

export type QuestionDifficulty = "Fundamental" | "Intermediate" | "Advanced";

export interface QuestionItem {
  id: string;
  questionText: string;
  targetCategory:
    | "icebreaker"
    | "technical"
    | "project_deep_dive"
    | "scenario_architecture"
    | "certification_probe"
    | "resume_consistency"
    | "stakeholder_impact";
  rationale: string;
  difficulty: QuestionDifficulty;
  contextRef?: string;
  expectedKeyPoints: string[];
}

export interface SpeechMetrics {
  durationSeconds: number;
  wordCount: number;
  wpm: number;
  fillerWordsCount: number;
  detectedFillerWords: string[];
  clarityScore: number;
}

export interface AnswerEvaluation {
  questionId: string;
  questionText: string;
  candidateAnswer: string;
  score: number; // 0 - 100
  strengthLevel: "Strong" | "Moderate" | "Weak";
  speechMetrics: SpeechMetrics;
  feedback: string;
  idealModelAnswer: string;
  consistencyWarning?: string;
  nextDifficultyTriggered: QuestionDifficulty;
}

export interface ProctoringEvent {
  timestamp: number;
  type:
    | "face_present"
    | "face_missing"
    | "multiple_faces"
    | "low_lighting"
    | "looking_away"
    | "window_minimized"
    | "tab_switched"
    | "screenshot_attempt"
    | "split_screen"
    | "focus_lost"
    | "unauthorized_action";
  message: string;
}

export interface FinalReport {
  id: string;
  createdAt: string;
  candidateName: string;
  targetRole: string;
  overallScore: number;
  recommendation: "Strong Hire" | "Hire" | "Leaning Hire" | "Needs Improvement";
  atsSummary: AtsScoreDetails;
  dimensionScores: {
    technicalCompetence: number;
    communicationArticulation: number;
    problemSolvingStructure: number;
    resumeConsistency: number;
    roleReadiness: number;
  };
  keyStrengths: string[];
  criticalWeaknesses: string[];
  technicalGaps: string[];
  questionEvaluations: AnswerEvaluation[];
  preparationRoadmap: Array<{
    step: number;
    title: string;
    description: string;
    resources: string[];
  }>;
  averageWpm: number;
  totalFillerWords: number;
}

export interface InterviewSession {
  sessionId: string;
  createdAt: string;
  targetRole: string;
  jobDescription: string;
  resumeData: ResumeData;
  atsScore: AtsScoreDetails;
  status: "setup" | "analyzed" | "in-progress" | "evaluating" | "completed" | "terminated";
  questions: QuestionItem[];
  currentQuestionIndex: number;
  currentDifficulty: QuestionDifficulty;
  answerHistory: AnswerEvaluation[];
  proctoringEvents: ProctoringEvent[];
  finalReport?: FinalReport;
}
