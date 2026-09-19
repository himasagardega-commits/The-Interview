import { FinalReport, InterviewSession } from "@/types";
import { callGeminiJson } from "./geminiClient";

/**
 * Generates the comprehensive post-interview diagnostic evaluation report
 */
export async function generateInterviewReport(
  session: InterviewSession,
  apiKey?: string
): Promise<FinalReport> {
  const { resumeData, atsScore, targetRole, answerHistory } = session;

  // Deduplicate any repeated question evaluations
  const seenIds = new Set<string>();
  const uniqueAnswers = (answerHistory || []).filter((item) => {
    if (!item.questionId || seenIds.has(item.questionId)) {
      return false;
    }
    seenIds.add(item.questionId);
    return true;
  });

  const totalQuestions = uniqueAnswers.length;
  const rawAvgScore =
    totalQuestions > 0
      ? Math.round(uniqueAnswers.reduce((acc, curr) => acc + curr.score, 0) / totalQuestions)
      : 70;

  // Average WPM & total filler words
  const totalFillerWords = uniqueAnswers.reduce(
    (acc, curr) => acc + (curr.speechMetrics?.fillerWordsCount || 0),
    0
  );
  const averageWpm =
    totalQuestions > 0
      ? Math.round(
          uniqueAnswers.reduce((acc, curr) => acc + (curr.speechMetrics?.wpm || 120), 0) /
            totalQuestions
        )
      : 130;

  // Dimensions
  const consistencyPenalties = answerHistory.filter((a) => a.consistencyWarning).length * 15;
  const keywordMatchFactor = atsScore?.categoryBreakdown?.keywordMatch ?? 75;
  const technicalCompetence = Math.max(
    30,
    Math.min(98, Math.round(rawAvgScore * 0.95 + (keywordMatchFactor * 0.05)))
  );
  const communicationArticulation = Math.max(
    35,
    Math.min(
      96,
      Math.round(
        (totalQuestions > 0
          ? answerHistory.reduce(
              (acc, curr) => acc + (curr.speechMetrics?.clarityScore || 80),
              0
            ) / totalQuestions
          : 80)
      )
    )
  );
  const problemSolvingStructure = Math.max(
    30,
    Math.min(95, Math.round(rawAvgScore * 0.9 + (answerHistory.some((a) => a.strengthLevel === "Strong") ? 8 : 0)))
  );
  const resumeConsistency = Math.max(30, Math.min(100, 95 - consistencyPenalties));
  const roleReadiness = Math.max(
    30,
    Math.min(
      96,
      Math.round((technicalCompetence + communicationArticulation + problemSolvingStructure) / 3)
    )
  );

  const overallScore = Math.round(
    technicalCompetence * 0.35 +
      communicationArticulation * 0.2 +
      problemSolvingStructure * 0.2 +
      resumeConsistency * 0.15 +
      roleReadiness * 0.1
  );

  const recommendation: FinalReport["recommendation"] =
    overallScore >= 85
      ? "Strong Hire"
      : overallScore >= 72
      ? "Hire"
      : overallScore >= 55
      ? "Leaning Hire"
      : "Needs Improvement";

  // Strengths & Weaknesses
  const keyStrengths: string[] = [];
  if (communicationArticulation >= 75) {
    keyStrengths.push("Clear verbal articulation with a well-paced delivery (~" + averageWpm + " WPM).");
  }
  if (technicalCompetence >= 70) {
    keyStrengths.push("Solid technical foundation in core stack requirements for " + targetRole + ".");
  }
  if (answerHistory.some((a) => a.strengthLevel === "Strong")) {
    keyStrengths.push("Demonstrated great depth when handling complex project and architecture questions.");
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push("Eager approach and willingness to walk through technical concepts.");
  }

  const criticalWeaknesses: string[] = [];
  if (totalFillerWords > 8) {
    criticalWeaknesses.push(
      `Frequent speech hesitations (${totalFillerWords} filler words detected like 'um', 'uh', 'like').`
    );
  }
  if (consistencyPenalties > 0) {
    criticalWeaknesses.push(
      "Inconsistencies detected between verbal technical answers and claims listed on the resume."
    );
  }
  if (technicalCompetence < 70) {
    criticalWeaknesses.push(
      "Answers to advanced architectural scenarios lacked concrete metrics, trade-off analysis, or edge case handling."
    );
  }
  if (criticalWeaknesses.length === 0) {
    criticalWeaknesses.push("Could provide more concise conclusions using the STAR method to stay under 2 minutes per answer.");
  }

  // Technical Gaps
  const technicalGaps: string[] = [];
  if (atsScore?.missingSkills && atsScore.missingSkills.length > 0) {
    technicalGaps.push(...atsScore.missingSkills.slice(0, 3).map((m) => `Missing Job Requirement: ${m.skill}`));
  }
  technicalGaps.push("Deep-dive failure recovery, distributed caching, and zero-downtime deployment patterns");

  // Preparation Roadmap
  const preparationRoadmap = [
    {
      step: 1,
      title: "Master the STAR Technique for Behavioral & Architecture Stories",
      description:
        "Frame all project discussions with explicit Situation, Task, Action, and Measurable Results. Replace qualitative statements with quantified impact (latency %, throughput, cost savings).",
      resources: [
        "The STAR Method Handbook for Tech Interviews",
        "System Design Primer (GitHub / Donne Martin)",
      ],
    },
    {
      step: 2,
      title: `Close the ${atsScore?.missingSkills?.[0]?.skill || "High-Scale Distributed Systems"} Knowledge Gap`,
      description: `Review production-grade architectures and common trade-offs for ${atsScore?.missingSkills?.slice(0, 2).map((s) => s.skill).join(", ") || "cloud infrastructure"}.`,
      resources: [
        "Designing Data-Intensive Applications (Martin Kleppmann)",
        "Official Documentation & Architecture Best Practice Guides",
      ],
    },
    {
      step: 3,
      title: "Pacing & Speech Hygiene Polish",
      description:
        "Practice delivering 90-second structured technical pitches. Introduce a 2-second silent pause to collect thoughts rather than using filler words ('um', 'actually', 'like').",
      resources: [
        "Toastmasters Technical Speaking Guide",
        "Mock Interview Audio Recording & Self-Review",
      ],
    },
  ];

  const fallbackReport: FinalReport = {
    id: `rep-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString(),
    candidateName: resumeData.candidateName || "Candidate",
    targetRole,
    overallScore,
    recommendation,
    atsSummary: atsScore || {
      overallAtsScore: 75,
      roleMatchScore: 75,
      categoryBreakdown: {
        keywordMatch: 75,
        experienceDepth: 75,
        technicalSkills: 75,
        educationAndCertifications: 75,
        quantifiedImpact: 75,
        structuralReadability: 75,
      },
      matchedSkills: resumeData.skills?.languages || [],
      missingSkills: [],
      improvementRecommendations: [
        "Include more concrete metrics (percentages, throughput, scale) in project descriptions.",
        "Align technical keywords with the target job requirements."
      ],
      formattingIssues: [],
    },
    dimensionScores: {
      technicalCompetence,
      communicationArticulation,
      problemSolvingStructure,
      resumeConsistency,
      roleReadiness,
    },
    keyStrengths,
    criticalWeaknesses,
    technicalGaps,
    questionEvaluations: uniqueAnswers,
    preparationRoadmap,
    averageWpm,
    totalFillerWords,
  };

  // If Gemini / OpenAI API is available, enrich with tailored multi-perspective feedback
  const prompt = `
Generate a comprehensive interview performance diagnostic report.
Role: ${targetRole}
Candidate Name: ${resumeData.candidateName}
Total Questions Evaluated: ${uniqueAnswers.length}

Questions & Answers:
${uniqueAnswers
  .map(
    (q, i) =>
      `Q${i + 1}: ${q.questionText}\nCandidate Answer: ${q.candidateAnswer}\nScore: ${q.score}/100\nFeedback: ${q.feedback}`
  )
  .join("\n\n")}

Provide:
1. overallScore (0-100)
2. recommendation ("Strong Hire" | "Hire" | "Leaning Hire" | "Needs Improvement")
3. dimensionScores: { technicalCompetence, communicationArticulation, problemSolvingStructure, resumeConsistency, roleReadiness } (all 0-100)
4. keyStrengths (3-4 bullet points)
5. criticalWeaknesses (2-3 bullet points)
6. technicalGaps (2-3 bullet points)
7. preparationRoadmap (3 structured steps with step number, title, description, and list of resources)

Respond strictly in JSON matching the schema.
`;

  return callGeminiJson<FinalReport>(
    prompt,
    "You are a technical director reviewing interview loop candidate scores. Output strictly valid JSON without markdown fences.",
    () => fallbackReport,
    apiKey
  ).then((res) => ({
    ...fallbackReport,
    ...res,
    id: fallbackReport.id,
    createdAt: fallbackReport.createdAt,
    atsSummary: atsScore,
    questionEvaluations: uniqueAnswers,
    averageWpm,
    totalFillerWords,
  }));
}
