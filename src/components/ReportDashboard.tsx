"use client";

import React, { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import {
  Award,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Printer,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Clock,
  Activity,
  FileCheck,
  ShieldCheck,
  TrendingUp,
  Youtube,
  ExternalLink,
} from "lucide-react";
import { FinalReport, InterviewSession } from "@/types";

interface ReportDashboardProps {
  report: FinalReport;
  session: InterviewSession;
  onRetakeInterview: () => void;
}

export const ReportDashboard: React.FC<ReportDashboardProps> = ({
  report,
  session,
  onRetakeInterview,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    report.questionEvaluations[0]?.questionId || null
  );

  useEffect(() => {
    // Shoot confetti for celebratory feedback
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  }, []);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const recColor =
    report.recommendation === "Strong Hire"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : report.recommendation === "Hire"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : report.recommendation === "Leaning Hire"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Report Header Banner */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl shadow-slate-200/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/60 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="space-y-3 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              Interview Evaluation Completed
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Candidate Diagnostic Report
            </h1>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-slate-600">
              <span>
                Candidate: <strong className="text-slate-900">{report.candidateName}</strong>
              </span>
              <span>•</span>
              <span>
                Role: <strong className="text-indigo-600">{report.targetRole}</strong>
              </span>
              <span>•</span>
              <span className="text-slate-400">
                {new Date(report.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Right: Score Card */}
          <div className="flex items-center gap-6 shrink-0 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full border-4 border-indigo-200 bg-indigo-50 flex flex-col items-center justify-center shadow-xs">
                <span className="text-3xl font-black text-slate-900">{report.overallScore}</span>
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                  / 100 Score
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Final Recommendation
              </span>
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold text-center ${recColor}`}
              >
                {report.recommendation}
              </div>
              <p className="text-[11px] text-slate-500">
                ATS Compatibility: <strong className="text-slate-800">{report.atsSummary.overallScore}%</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onRetakeInterview}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake / Practice Again</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition hover:scale-[1.02]"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* AI Resume Evaluation for Target Role: Missing Fields & Gap Analysis */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl shadow-slate-200/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold uppercase tracking-wider">
              <FileCheck className="w-4 h-4" />
              <span>AI Resume Analysis for {report.targetRole}</span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Resume Field Completeness & Gap Analysis
            </h2>
            <p className="text-xs text-slate-500">
              Evaluated against industry benchmarks and hiring criteria for{" "}
              <strong className="text-slate-800">{report.targetRole}</strong>
            </p>
          </div>

          <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-center shrink-0">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Resume Role Fit
            </span>
            <span className="text-lg font-black text-indigo-600">
              {report.atsSummary.overallScore}%
            </span>
          </div>
        </div>

        {/* Missing Fields vs Matched Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Missing Fields for this Role */}
          <div className="p-5 bg-rose-50/50 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>
                Fields & Skills Missing in Resume ({report.atsSummary.missingSkills.length})
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Recruiters and screening algorithms for{" "}
              <strong className="text-slate-800">{report.targetRole}</strong>{" "}
              specifically look for these missing items:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {report.atsSummary.missingSkills.length > 0 ? (
                report.atsSummary.missingSkills.map((item, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 shadow-2xs"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    <span>{item.skill}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-900 uppercase font-bold">
                      {item.importance}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-xs text-emerald-700 font-semibold">
                  ✓ Excellent coverage! No critical skill fields are missing from your resume for this role.
                </span>
              )}
            </div>
          </div>

          {/* Matched Skills Found in Resume */}
          <div className="p-5 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                Matching Qualifications Found in Resume ({report.atsSummary.matchedSkills.length})
              </span>
            </div>
            <p className="text-xs text-slate-600">
              Strengths currently highlighted in your resume that directly align with{" "}
              <strong className="text-slate-800">{report.targetRole}</strong>:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {report.atsSummary.matchedSkills.length > 0 ? (
                report.atsSummary.matchedSkills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-1.5 shadow-2xs"
                  >
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{skill}</span>
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500">
                  Basic role alignment detected.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* YouTube Learning Resources for Missing Skills */}
        {report.atsSummary.missingSkills.length > 0 && (
          <div className="p-5 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3 mt-5">
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
              <Youtube className="w-4 h-4 text-indigo-600" />
              <span>📚 You Can Learn (Top YouTube Resources)</span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              Watch the top tutorials to quickly learn the skills missing from your resume:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {report.atsSummary.missingSkills.map((item, idx) => (
                <a
                  key={idx}
                  href={`https://www.youtube.com/results?search_query=best+tutorial+to+learn+${encodeURIComponent(item.skill)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-2 p-3 bg-white border border-indigo-100 hover:border-indigo-300 rounded-xl shadow-sm hover:shadow-md transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-700">{item.skill}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase">
                    <Youtube className="w-3.5 h-3.5" />
                    <span>Watch Videos</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actionable Resume Optimization for this Role */}
        <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5 mt-5">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            Resume Improvement Checklist to Qualify for {report.targetRole}
          </span>
          <ul className="space-y-3 text-xs text-slate-700 mt-2">
            {report.atsSummary.improvementRecommendations.map((rec, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2.5 p-3 bg-white border border-slate-100 shadow-sm rounded-xl">
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed text-sm text-slate-700">{rec}</span>
                </div>
                <a
                  href={`https://www.youtube.com/results?search_query=how+to+${encodeURIComponent(rec)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors shrink-0 sm:mt-0 mt-2 sm:ml-0 ml-7"
                >
                  <Youtube className="w-3.5 h-3.5" />
                  Find Videos
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Competency Dimensions Grid */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Interview Performance Dimensions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            {
              title: "Technical Mastery",
              val: report.dimensionScores.technicalCompetence,
              color: "bg-indigo-600",
            },
            {
              title: "Communication",
              val: report.dimensionScores.communicationArticulation,
              color: "bg-purple-600",
            },
            {
              title: "Problem Solving",
              val: report.dimensionScores.problemSolvingStructure,
              color: "bg-pink-600",
            },
            {
              title: "Resume Honesty",
              val: report.dimensionScores.resumeConsistency,
              color: "bg-emerald-600",
            },
            {
              title: "Role Readiness",
              val: report.dimensionScores.roleReadiness,
              color: "bg-amber-600",
            },
          ].map((dim, idx) => (
            <div
              key={idx}
              className="p-4 bg-white border border-slate-200/80 rounded-2xl space-y-2 shadow-xs"
            >
              <span className="text-xs font-semibold text-slate-600 block">
                {dim.title}
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900">{dim.val}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`${dim.color} h-full rounded-full`}
                  style={{ width: `${dim.val}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths, Weaknesses, and Technical Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Strengths */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Key Strengths</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {report.keyStrengths.map((s, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses & Speech Metrics */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Areas for Improvement</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {report.criticalWeaknesses.map((w, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span className="leading-relaxed">{w}</span>
              </li>
            ))}
          </ul>
          <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Avg Pacing: ~{report.averageWpm} WPM</span>
            <span>Total Fillers: {report.totalFillerWords}</span>
          </div>
        </div>

        {/* Technical Gaps */}
        <div className="p-5 bg-white border border-slate-200/80 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Identified Technical Gaps</span>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            {report.technicalGaps.map((g, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-600 font-bold">→</span>
                <span className="leading-relaxed">{g}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Question-Wise Detailed Analysis & Model Answers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Question-by-Question Deep Dive & Exemplary Answers
          </h2>
          <span className="text-xs text-slate-400">
            {report.questionEvaluations.length} Questions Evaluated
          </span>
        </div>

        <div className="space-y-3">
          {report.questionEvaluations.map((evalItem, idx) => {
            const isExpanded = expandedQuestionId === evalItem.questionId;
            return (
              <div
                key={`${evalItem.questionId || "eval"}-${idx}`}
                className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:border-indigo-300 transition"
              >
                {/* Header row */}
                <div
                  onClick={() =>
                    setExpandedQuestionId(isExpanded ? null : evalItem.questionId)
                  }
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/80 transition"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-600">
                        Q{idx + 1}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          evalItem.strengthLevel === "Strong"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : evalItem.strengthLevel === "Moderate"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {evalItem.strengthLevel} ({evalItem.score}/100)
                      </span>
                      {evalItem.consistencyWarning && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-medium">
                          Resume Notice
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                      {evalItem.questionText}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 space-y-4 border-t border-slate-100 bg-slate-50/50">
                    {/* Candidate Transcript */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Candidate Answer Transcript:
                      </span>
                      <p className="text-xs text-slate-800 bg-white p-3.5 rounded-xl border border-slate-200 leading-relaxed font-sans">
                        &quot;{evalItem.candidateAnswer}&quot;
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 pt-0.5">
                        <span>Duration: {evalItem.speechMetrics.durationSeconds}s</span>
                        <span>•</span>
                        <span>Words: {evalItem.speechMetrics.wordCount}</span>
                        <span>•</span>
                        <span>Pacing: {evalItem.speechMetrics.wpm} WPM</span>
                      </div>
                    </div>

                    {/* AI Feedback */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">
                        AI Interviewer Critique:
                      </span>
                      <p className="text-xs text-indigo-950 bg-indigo-50/60 border border-indigo-200/80 p-3.5 rounded-xl leading-relaxed">
                        {evalItem.feedback}
                      </p>
                    </div>

                    {/* Consistency Warning if present */}
                    {evalItem.consistencyWarning && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                        <span>
                          <strong>Resume-Consistency Flag:</strong>{" "}
                          {evalItem.consistencyWarning}
                        </span>
                      </div>
                    )}

                    {/* Model Answer */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                        Ideal / Model Answer (Staff/Senior Benchmark):
                      </span>
                      <div className="text-xs text-emerald-950 bg-emerald-50/60 border border-emerald-200/80 p-3.5 rounded-xl leading-relaxed whitespace-pre-line font-mono">
                        {evalItem.idealModelAnswer}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actionable Preparation Roadmap */}
      <div className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl space-y-5 shadow-xl shadow-slate-200/40">
        <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold uppercase tracking-wider">
          <TrendingUp className="w-4 h-4 text-indigo-600" />
          <span>Personalized Preparation Roadmap</span>
        </div>

        <div className="space-y-4">
          {report.preparationRoadmap.map((item) => (
            <div
              key={item.step}
              className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start gap-4"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                {item.step}
              </div>
              <div className="space-y-1.5 flex-1">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">{item.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
                {item.resources && item.resources.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.resources.map((res, rIdx) => (
                      <span
                        key={rIdx}
                        className="px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200 text-[11px] shadow-2xs font-medium"
                      >
                        📖 {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
