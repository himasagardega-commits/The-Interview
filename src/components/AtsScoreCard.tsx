"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Briefcase,
  Code2,
  Cpu,
  ArrowRight,
  Sparkles,
  Layers,
  GraduationCap,
  TrendingUp,
  FileEdit,
} from "lucide-react";
import { AtsScoreDetails, ResumeData } from "@/types";

interface AtsScoreCardProps {
  resumeData: ResumeData;
  atsScore: AtsScoreDetails;
  jobRole: string;
  onStartInterview: () => void;
  onBackToSetup: () => void;
}

export const AtsScoreCard: React.FC<AtsScoreCardProps> = ({
  resumeData,
  atsScore,
  jobRole,
  onStartInterview,
  onBackToSetup,
}) => {
  const [activeTab, setActiveTab] = useState<
    "skills" | "experience" | "projects" | "education" | "recommendations"
  >("skills");

  const score = atsScore.overallScore;
  const scoreColor =
    score >= 80
      ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
      : score >= 65
      ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
      : "text-rose-400 border-rose-500/40 bg-rose-500/10";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Banner with ATS Score Overview */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-6 sm:p-8 backdrop-blur-md relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10" />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Candidate & Target Role info */}
          <div className="space-y-3 text-center lg:text-left flex-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Candidate Profile & ATS Match Engine
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {resumeData.candidateName}
            </h1>

            <p className="text-sm text-neutral-300">
              Target Position:{" "}
              <strong className="text-indigo-400 font-semibold">{jobRole}</strong>
            </p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-xs text-neutral-400 pt-1">
              {resumeData.email && <span>📧 {resumeData.email}</span>}
              {resumeData.phone && <span>📞 {resumeData.phone}</span>}
              <span>🎓 {resumeData.education[0]?.degree || "Degree Listed"}</span>
            </div>
          </div>

          {/* Center/Right: Overall ATS Score Radial & Breakdown */}
          <div className="flex items-center gap-6 sm:gap-8 shrink-0 bg-neutral-950/60 p-5 rounded-2xl border border-neutral-800">
            {/* Score Ring */}
            <div className="text-center">
              <div
                className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center ${scoreColor} shadow-lg`}
              >
                <span className="text-3xl font-black tracking-tighter">{score}</span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                  / 100 ATS
                </span>
              </div>
              <p className="text-xs font-semibold mt-2 text-neutral-300">
                {score >= 80
                  ? "High Match"
                  : score >= 65
                  ? "Moderate Fit"
                  : "Needs Optimization"}
              </p>
            </div>

            {/* Dimensional Bars */}
            <div className="space-y-2.5 w-44 sm:w-52 text-xs">
              <div>
                <div className="flex justify-between text-neutral-300 mb-1 font-medium text-[11px]">
                  <span>Keywords & Skills</span>
                  <span className="font-bold">{atsScore.categoryBreakdown.keywordMatch}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full"
                    style={{ width: `${atsScore.categoryBreakdown.keywordMatch}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1 font-medium text-[11px]">
                  <span>Experience Fit</span>
                  <span className="font-bold">{atsScore.categoryBreakdown.experienceAlignment}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full rounded-full"
                    style={{ width: `${atsScore.categoryBreakdown.experienceAlignment}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1 font-medium text-[11px]">
                  <span>Technical Coverage</span>
                  <span className="font-bold">{atsScore.categoryBreakdown.skillCoverage}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-pink-500 h-full rounded-full"
                    style={{ width: `${atsScore.categoryBreakdown.skillCoverage}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-neutral-300 mb-1 font-medium text-[11px]">
                  <span>Readability & Structure</span>
                  <span className="font-bold">{atsScore.categoryBreakdown.formattingReadability}%</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${atsScore.categoryBreakdown.formattingReadability}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="mt-6 pt-5 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBackToSetup}
            className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition"
          >
            <FileEdit className="w-3.5 h-3.5" />
            Edit Target Role or Upload Different Resume
          </button>

          <button
            type="button"
            onClick={onStartInterview}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition hover:scale-105"
          >
            <span>Proceed to AI Voice & Video Mock Interview</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-neutral-800 space-x-2 overflow-x-auto pb-1">
        {[
          { id: "skills", label: "Skills & Gap Analysis", icon: Code2 },
          { id: "experience", label: "Experience & Responsibilities", icon: Briefcase },
          { id: "projects", label: "Extracted Projects", icon: Cpu },
          { id: "education", label: "Education & Certifications", icon: GraduationCap },
          { id: "recommendations", label: "ATS Optimization Checklist", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-xl transition shrink-0 ${
                activeTab === tab.id
                  ? "bg-neutral-900 border-t border-x border-neutral-800 text-indigo-400"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 min-h-[340px]">
        {/* TAB 1: SKILLS & GAP ANALYSIS */}
        {activeTab === "skills" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills */}
              <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Matched Skills from JD ({atsScore.matchedSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {atsScore.matchedSkills.length > 0 ? (
                    atsScore.matchedSkills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
                      >
                        ✓ {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500">
                      No direct keyword matches found.
                    </span>
                  )}
                </div>
              </div>

              {/* Missing Skills */}
              <div className="bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Skills / Gaps Identified ({atsScore.missingSkills.length})</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {atsScore.missingSkills.length > 0 ? (
                    atsScore.missingSkills.map((m, idx) => (
                      <span
                        key={idx}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                          m.importance === "critical"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                            : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                        }`}
                      >
                        <XCircle className="w-3 h-3 shrink-0" />
                        <span>{m.skill}</span>
                        <span className="text-[10px] px-1 bg-black/40 rounded">
                          {m.importance}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium">
                      Outstanding! Zero critical skill gaps identified.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Categorized Skills Extracted */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                All Extracted Resume Skills
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/60 space-y-2">
                  <span className="text-xs font-semibold text-indigo-400">Languages</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {resumeData.skills?.languages?.join(", ") || "None extracted"}
                  </p>
                </div>
                <div className="p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/60 space-y-2">
                  <span className="text-xs font-semibold text-purple-400">Frameworks</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {resumeData.skills?.frameworks?.join(", ") || "None extracted"}
                  </p>
                </div>
                <div className="p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/60 space-y-2">
                  <span className="text-xs font-semibold text-pink-400">Cloud & DevOps</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {resumeData.skills?.toolsAndCloud?.join(", ") || "None extracted"}
                  </p>
                </div>
                <div className="p-4 bg-neutral-950/40 rounded-xl border border-neutral-800/60 space-y-2">
                  <span className="text-xs font-semibold text-emerald-400">Soft Skills</span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {resumeData.skills?.softSkills?.join(", ") || "Problem solving, teamwork"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORK EXPERIENCE */}
        {activeTab === "experience" && (
          <div className="space-y-4">
            {resumeData.experience.map((exp, idx) => (
              <div
                key={idx}
                className="p-5 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <h4 className="text-sm font-bold text-white">{exp.role}</h4>
                  <span className="text-xs text-neutral-400 font-mono">
                    {exp.duration || "Dates unspecified"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-indigo-400">{exp.company}</p>
                <ul className="list-disc list-inside space-y-1 text-xs text-neutral-300 pt-1">
                  {exp.responsibilities.map((resp, rIdx) => (
                    <li key={rIdx} className="leading-relaxed">
                      {resp}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: PROJECTS */}
        {activeTab === "projects" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumeData.projects.map((proj, idx) => (
              <div
                key={idx}
                className="p-5 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white">{proj.title}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {proj.techStack.map((tech, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[10px] font-mono"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    {proj.description || "Hands-on implementation of software architecture."}
                  </p>
                </div>
                {proj.impact && (
                  <div className="pt-2 border-t border-neutral-800 text-[11px] text-emerald-400 font-medium">
                    ⚡ Impact: {proj.impact}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: EDUCATION & CERTIFICATIONS */}
        {activeTab === "education" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Academic Degrees
              </h3>
              {resumeData.education.map((edu, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-1"
                >
                  <p className="text-xs font-bold text-white">{edu.degree}</p>
                  <p className="text-xs text-indigo-400">{edu.institution}</p>
                  {edu.year && (
                    <p className="text-[11px] text-neutral-400 font-mono">
                      Graduated: {edu.year}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-400" />
                Certifications & Courses
              </h3>
              {resumeData.certifications.length > 0 ? (
                resumeData.certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-1"
                  >
                    <p className="text-xs font-bold text-white">{cert.name}</p>
                    {cert.date && (
                      <p className="text-[11px] text-neutral-400 font-mono">
                        Issued: {cert.date}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-4 bg-neutral-950/40 border border-neutral-800 rounded-xl text-xs text-neutral-400">
                  No verified certifications found. Consider acquiring role-relevant credentials.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: RECOMMENDATIONS */}
        {activeTab === "recommendations" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Key Strengths
                </span>
                <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1.5">
                  {atsScore.strengths.map((s, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Areas to Optimize
                </span>
                <ul className="list-disc list-inside text-xs text-neutral-300 space-y-1.5">
                  {atsScore.weaknesses.map((w, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl space-y-2">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Actionable ATS Tips
              </span>
              <ul className="space-y-2 text-xs text-neutral-300">
                {atsScore.improvementRecommendations.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
