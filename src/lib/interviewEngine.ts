import {
  AnswerEvaluation,
  QuestionDifficulty,
  QuestionItem,
  ResumeData,
  SpeechMetrics,
} from "@/types";
import { callGeminiJson } from "./geminiClient";
import { cleanProjectTitle } from "./atsAnalyzer";

const COMMON_FILLER_WORDS = [
  "um",
  "uh",
  "like",
  "you know",
  "basically",
  "actually",
  "literally",
  "sort of",
  "kind of",
  "i mean",
  "right",
];

/**
 * Speech analysis helper: calculates WPM, filler word count, clarity score
 */
export function analyzeSpeech(transcript: string, durationSeconds: number): SpeechMetrics {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  const validDurationMinutes = Math.max(0.1, durationSeconds / 60);
  const rawWpm = Math.round(wordCount / validDurationMinutes);
  const wpm = Math.min(300, rawWpm);

  const lower = transcript.toLowerCase();
  const detectedFillerWords: string[] = [];
  let fillerWordsCount = 0;

  for (const filler of COMMON_FILLER_WORDS) {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    const matches = lower.match(regex);
    if (matches) {
      fillerWordsCount += matches.length;
      detectedFillerWords.push(`${filler} (${matches.length})`);
    }
  }

  // Clarity score 0-100: ideal WPM is 120-160, penalize high filler density
  let clarityScore = 85;
  if (wpm < 80) clarityScore -= 15;
  if (wpm > 180) clarityScore -= 10;
  const fillerRatio = wordCount > 0 ? (fillerWordsCount / wordCount) * 100 : 0;
  clarityScore -= Math.min(35, Math.round(fillerRatio * 4));
  if (wordCount > 30) clarityScore += 10;

  return {
    durationSeconds: Math.round(durationSeconds),
    wordCount,
    wpm,
    fillerWordsCount,
    detectedFillerWords,
    clarityScore: Math.max(30, Math.min(100, clarityScore)),
  };
}

/**
 * Generates the exemplary 12-point Self-Introduction Model Answer populated with candidate resume details
 */
export function buildSelfIntroTemplateModelAnswer(resume: ResumeData, jobRole: string): string {
  const name =
    resume.candidateName && resume.candidateName !== "Candidate"
      ? resume.candidateName
      : "Candidate";
  const primaryEdu = resume.education?.[0];
  const degree = primaryEdu?.degree || "Bachelor of Technology in Computer Science and Engineering";
  let college = primaryEdu?.institution || "Jawaharlal Nehru Technological University College of Engineering";
  if (/^iit\b/i.test(college)) college = "Indian Institute of Technology";
  else if (/^nit\b/i.test(college)) college = "National Institute of Technology";
  else if (/^bits\b/i.test(college)) college = "Birla Institute of Technology and Science";
  else if (/^iiit\b/i.test(college)) college = "Indian Institute of Information Technology";
  else if (/^jntu\b/i.test(college)) college = "Jawaharlal Nehru Technological University College of Engineering";

  const topLanguages = (
    resume?.skills?.languages?.length ? resume.skills.languages : ["Java", "Python", "TypeScript"]
  )
    .slice(0, 4)
    .join(", ");
  const topFrameworks = (
    resume?.skills?.frameworks?.length
      ? resume.skills.frameworks
      : ["React", "Next.js", "Spring Boot", "Node.js"]
  )
    .slice(0, 4)
    .join(", ");

  const location = "Hyderabad";

  return `Good Morning/afternoon/evening.

My name is ${name}.
(Note: Full name stated - no short names or pet names)

First of all, I would like to thank you for giving me an opportunity to introduce myself.

I am currently staying in ${location} but born and brought up in Guntur, Andhra Pradesh.

I have completed my graduation in ${degree} from ${college}.
(Note: College name stated in full form without short forms or acronyms)

I did my plus 2 from the state board with 94% and SSC from the state board with 96%.

Coming to technical skills, I have learnt an array of subjects during my graduation, but I am good with the programming languages like ${topLanguages}, alongside practical frameworks including ${topFrameworks}.

Coming to my soft skills, I have good leadership qualities, effective with communication, adapting the situations etc.

My strengths are persistant learning, facing the newchallenges etc.

My weakness is problems with meeting deadlines when striving for excessive perfection, and I am rectifying my weakness by adhering to strict agile sprint timeboxing and incremental milestone deliveries.

My hobbies are contributing to open-source software, solving algorithmic puzzles, and exploring system architectures that match my job profile as a ${jobRole}.

If time permits, coming to my family, I come from a supportive family that has always encouraged continuous learning and integrity.

My short term goal is to get a job in a reputed company like yours as a ${jobRole}.

My long term goal is to become a more responsible and knowledgeable personality and in a responsible position in my company.
(Note: Never claim wanting to become CEO of the company, as it reflects overconfidence)

That's all about me.

Once again thank you very much for giving me a wonderful opportunity to introduce myself behind you.`;
}

/**
 * Generate a dynamic opening icebreaker / self-introduction question that varies across interview sessions
 */
export function generateFirstQuestion(
  resume: ResumeData,
  jobRole: string,
  pastAskedTexts: string[] = []
): QuestionItem {
  const name =
    resume?.candidateName && resume.candidateName !== "Candidate" ? resume.candidateName : "there";

  const pastLower = (pastAskedTexts || []).filter(Boolean).map((t) => (t || "").toLowerCase().trim());

  const selfIntroExpectedPoints = [
    "1. Formal Greeting (Good morning / afternoon / evening)",
    "2. Full Name (Strict rule: No short names or pet names)",
    "3. Opening Gratitude ('First of all, I would like to thank you for giving me an opportunity to introduce myself.')",
    "4. Current Location & Origin ('I am currently staying in... but born and brought up in...')",
    "5. Graduation & Specialization (Degree & full college name, strictly no short forms or acronyms)",
    "6. Schooling (+2 from state board with percentage, and SSC from state board with percentage)",
    "7. Technical Skills (Subjects learnt & programming languages known effectively)",
    "8. Soft Skills (Explicit leadership qualities, effective communication, adaptability)",
    "9. Strengths & Weakness (Persistent learning, facing challenges + weakness with active rectification plan)",
    "10. Profile-Aligned Hobbies matching the role",
    "11. Family background (Brief mention if time permits)",
    "12. Realistic Short-term (reputed company) & Long-term goals (responsible technical position, avoid overconfidence like CEO)",
    "13. Closing Gratitude ('That's all about me. Once again thank you very much for giving me a wonderful opportunity to introduce myself.')"
  ];

  const icebreakerOptions: Array<{
    text: string;
    rationale: string;
    points: string[];
  }> = [
    {
      text: `Hello ${name}, welcome to your interview for the ${jobRole} position. Please introduce yourself.`,
      rationale: "Comprehensive self-introduction evaluated against the standardized 12-point professional structure.",
      points: selfIntroExpectedPoints,
    },
    {
      text: `Welcome ${name}! To get started with our interview today, could you please introduce yourself?`,
      rationale: "Opening self-introduction probing professional communication, background, and career trajectory.",
      points: selfIntroExpectedPoints,
    },
    {
      text: `Hi ${name}, thank you for joining us today. To begin, please introduce yourself.`,
      rationale: "Holistic self-introduction testing articulation, credentials, technical foundation, and career goals.",
      points: selfIntroExpectedPoints,
    },
  ];

  // Filter out any option that was already asked in prior or current sessions
  const unasked = icebreakerOptions.filter(
    (opt) => !pastLower.some((p) => p.includes(opt.text.toLowerCase().slice(0, 30)))
  );

  const chosen =
    unasked.length > 0
      ? unasked[Math.floor(Math.random() * unasked.length)]
      : icebreakerOptions[Math.floor(Math.random() * icebreakerOptions.length)];

  return {
    id: `q-1-icebreaker-${Date.now().toString().slice(-4)}`,
    targetCategory: "icebreaker",
    difficulty: "Fundamental",
    questionText: chosen.text,
    rationale: chosen.rationale,
    expectedKeyPoints: chosen.points,
  };
}

/**
 * Check consistency between candidate spoken answer and resume
 */
function checkResumeConsistency(answer: string, resume: ResumeData): string | undefined {
  const lowerAns = answer.toLowerCase();

  // If candidate claims never using a tool that's prominent on their resume
  for (const lang of (resume?.skills?.languages || []).slice(0, 3)) {
    if (
      lowerAns.includes(`never used ${lang.toLowerCase()}`) ||
      lowerAns.includes(`don't know ${lang.toLowerCase()}`) ||
      lowerAns.includes(`haven't worked with ${lang.toLowerCase()}`)
    ) {
      return `Resume claims proficiency in ${lang.toUpperCase()}, but response expressed unfamiliarity or lack of experience.`;
    }
  }

  // If candidate claims unrealistic duration
  if (
    lowerAns.includes("10 years") &&
    (resume?.education || []).some((e) => e.year && parseInt(e.year) > 2018)
  ) {
    return "Candidate claimed 10+ years of experience, which contradicts recent graduation timeline on resume.";
  }

  return undefined;
}

/**
 * Evaluate candidate's answer with adaptive strength scoring, strict question-answer matching,
 * and 12-point structured self-introduction template grading.
 */
export async function evaluateCandidateAnswer(
  question: QuestionItem,
  answer: string,
  resume: ResumeData,
  jobRole: string,
  durationSeconds: number,
  apiKey?: string
): Promise<AnswerEvaluation> {
  const speechMetrics = analyzeSpeech(answer, durationSeconds);
  const consistencyWarning = checkResumeConsistency(answer, resume);
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const answerLower = answer.toLowerCase();

  const isSelfIntro =
    question.targetCategory === "icebreaker" ||
    question.id.includes("icebreaker") ||
    question.id.startsWith("q-1") ||
    /self[- ]introduction|introduce yourself/i.test(question.questionText);

  // Bonus for relevant key technologies mentioned
  const allCandidateTech = [
    ...(resume.skills.languages || []),
    ...(resume.skills.frameworks || []),
    ...(resume.skills.toolsAndCloud || []),
  ];
  const techMatches = allCandidateTech.filter((t) =>
    answerLower.includes(t.toLowerCase())
  );

  let fallbackEval: AnswerEvaluation;
  let prompt: string;

  if (isSelfIntro) {
    // -------------------------------------------------------------
    // BRANCH A: 12-POINT STRUCTURED SELF-INTRODUCTION EVALUATION
    // -------------------------------------------------------------
    const hasGreeting = /\b(good\s+(?:morning|afternoon|evening)|hello|greetings)\b/i.test(answer);
    const hasFullName =
      /\b(?:my\s+name\s+is|i\s+am|myself|this\s+is)\b/i.test(answer) ||
      Boolean(
        resume.candidateName &&
        resume.candidateName !== "Candidate" &&
        answerLower.includes(resume.candidateName.toLowerCase().split(" ")[0])
      );
    const hasGratitude =
      /\b(?:thank\s+you|thanks|grateful|pleasure)\b/i.test(answer) &&
      /\b(?:opportunity|privilege|platform)\b/i.test(answer);
    const hasLocationOrigin =
      /\b(?:staying|living|residing|currently|location)\b/i.test(answer) &&
      /\b(?:born|brought\s+up|native|from|origin)\b/i.test(answer);
    const hasGraduation =
      /\b(?:graduat|bachelor|b\.?tech|b\.?e\.?|degree|college|university|institute)\b/i.test(answer);
    const hasSchooling =
      /\b(?:\+2|plus\s*2|intermediate|12th|ssc|10th|class\s*10|class\s*12|state\s*board|cbse|icse)\b/i.test(answer) ||
      /\b\d{2}(?:\.\d+)?%\b/.test(answer);
    const hasTechSkills =
      /\b(?:technical\s+skills?|programming|languages?|technolog|stack|code|coding)\b/i.test(answer) ||
      techMatches.length >= 1;
    const hasSoftSkills =
      /\b(?:soft\s+skills?|leadership|communication|adaptab|teamwork|collaboration|problem[- ]solving)\b/i.test(answer);
    const hasStrengths =
      /\b(?:strengths?|persist[ea]nt\s+learning|curiosity|challenges?|facing\s+(?:the\s+)?(?:new\s*)?challenges|resilience|dedicated)\b/i.test(answer);
    const hasWeakness =
      /\b(?:weakness(?:es)?|rectif|improving|working\s+on|overcoming|mitigat|problems?\s+with\s+(?:meeting\s+)?deadlines|deadlines?)\b/i.test(answer);
    const hasHobbies =
      /\b(?:hobb(?:y|ies)|leisure|free\s+time|spare\s+time|reading|puzzles?|open[- ]source)\b/i.test(answer);
    const hasGoals =
      /\b(?:short[- ]term|long[- ]term|goals?|aspiration|reputed|responsible\s+position|knowledgeable\s+personality)\b/i.test(answer);
    const hasClosing =
      /\b(?:that'?s\s+all\s+about\s+me|once\s+again\s+thank\s+you|thank\s+you\s+very\s+much|behind\s+you)\b/i.test(answer);

    const isOverconfident =
      /\b(?:become\s+(?:the\s+)?ceo|be\s+the\s+ceo|run\s+the\s+company|take\s+over\s+the\s+company|own\s+this\s+company|become\s+the\s+owner|become\s+the\s+boss)\b/i.test(answer);

    const hasCollegeAcronymOnly =
      /\b(?:from\s+)?(IIT|NIT|BITS|IIIT|JNTU|SRM|VIT|DTU|NSUT|MIT)\b/i.test(answer) &&
      !/\b(?:institute|university|college\s+of\s+engineering)\b/i.test(answer);

    const templateItems: Array<{ label: string; covered: boolean }> = [
      { label: "Formal Greeting", covered: hasGreeting },
      { label: "Full Name (no pet/short names)", covered: hasFullName },
      { label: "Opening Gratitude for opportunity", covered: hasGratitude },
      { label: "Current Location & Origin", covered: hasLocationOrigin },
      { label: "Graduation Degree & Full College Name", covered: hasGraduation },
      { label: "Schooling (+2 and SSC boards with percentages)", covered: hasSchooling },
      { label: "Technical Skills & Languages Known", covered: hasTechSkills },
      { label: "Soft Skills (leadership, communication, adaptability)", covered: hasSoftSkills },
      { label: "Strengths (persistent learning, facing challenges)", covered: hasStrengths },
      { label: "Weakness with Active Rectification Plan", covered: hasWeakness },
      { label: "Profile-Aligned Hobbies", covered: hasHobbies },
      { label: "Realistic Short & Long-Term Goals", covered: hasGoals },
      { label: "Closing Gratitude Statement", covered: hasClosing },
    ];

    const coveredList = templateItems.filter((i) => i.covered).map((i) => i.label);
    const missedList = templateItems.filter((i) => !i.covered).map((i) => i.label);

    let selfIntroScore = Math.round(25 + (coveredList.length / templateItems.length) * 70);
    if (words.length < 35) {
      selfIntroScore = Math.min(selfIntroScore, 45);
    }
    if (words.length >= 90 && coveredList.length >= 9) {
      selfIntroScore = Math.max(selfIntroScore, 85);
    }
    if (isOverconfident) {
      selfIntroScore = Math.max(25, selfIntroScore - 15);
    }
    if (hasCollegeAcronymOnly) {
      selfIntroScore = Math.max(25, selfIntroScore - 5);
    }
    if (consistencyWarning) {
      selfIntroScore = Math.max(20, selfIntroScore - 15);
    }

    const finalScore = Math.max(20, Math.min(98, selfIntroScore));
    const strengthLevel: "Strong" | "Moderate" | "Weak" =
      finalScore >= 75 ? "Strong" : finalScore >= 50 ? "Moderate" : "Weak";

    const nextDifficultyTriggered: QuestionDifficulty =
      strengthLevel === "Strong"
        ? "Advanced"
        : strengthLevel === "Weak"
        ? "Fundamental"
        : "Intermediate";

    let selfIntroFeedback = "";
    if (coveredList.length >= 10) {
      selfIntroFeedback = `Outstanding self-introduction! You closely followed the professional 12-point structure covering ${coveredList.length} of 13 key areas, including your greeting, educational milestones, and balanced technical and soft skills.`;
    } else if (coveredList.length >= 6) {
      selfIntroFeedback = `Solid self-introduction covering ${coveredList.length} template elements. To elevate your presentation, ensure you explicitly cover: ${missedList.slice(0, 3).join(", ")}.`;
    } else {
      selfIntroFeedback = `Your self-introduction was incomplete. A polished interview introduction requires a structured delivery covering: ${missedList.slice(0, 4).join(", ")}.`;
    }

    if (isOverconfident) {
      selfIntroFeedback += " Note on Goals: Avoid claiming you want to become CEO or run the company, as this can sound overconfident. Frame your long-term goal around achieving responsible technical leadership and mentorship within the organization.";
    }
    if (hasCollegeAcronymOnly) {
      selfIntroFeedback += " Note on College Name: Please state your full institution name rather than short forms or acronyms.";
    }

    fallbackEval = {
      questionId: question.id,
      questionText: question.questionText,
      candidateAnswer: answer,
      score: finalScore,
      strengthLevel,
      speechMetrics,
      feedback: selfIntroFeedback,
      idealModelAnswer: buildSelfIntroTemplateModelAnswer(resume, jobRole),
      consistencyWarning,
      nextDifficultyTriggered,
    };

    prompt = `
Evaluate the candidate's self-introduction for Question 1 for the role "${jobRole}".

CRITICAL MANDATE — 12-POINT STRUCTURED SELF-INTRODUCTION EVALUATION:
The candidate was asked to deliver a formal self-introduction. You MUST strictly evaluate their response against this 12-Point Template:
1. Formal Greeting: Good morning / afternoon / evening
2. Full Name: Full name stated (Strict rule: No short names or pet names)
3. Opening Gratitude: "First of all, I would like to thank you for giving me an opportunity to introduce myself."
4. Location & Origin: Current staying location AND where born and brought up
5. Graduation & Specialization: Degree/specialization + College name in FULL FORM (strictly NO short forms/acronyms like "IIT", "NIT", "BITS" without full names)
6. Schooling: Plus 2 from state/central board with percentage, and SSC from board with percentage
7. Technical Skills: Array of subjects learnt during graduation + core programming languages effectively known
8. Soft Skills: Explicit leadership qualities, effective communication, adaptability
9. Strengths & Weakness: Strengths (persistent learning, facing challenges) + Weakness with an active rectification plan
10. Hobbies: Profile-aligned hobbies matching the role
11. Family: Brief mention of family background
12. Goals: Short-term (reputed company) + Long-term (responsible & knowledgeable technical position; STRICT PENALTY for overconfidence like claiming to become CEO)
13. Closing Gratitude: "That's all about me. Once again thank you very much for giving me a wonderful opportunity to introduce myself behind you."

Candidate's Transcript Answer: "${answer}"
Candidate's Resume Highlights:
- Name: ${resume?.candidateName || "Candidate"}
- Education: ${resume?.education?.[0]?.degree || "Graduation"} at ${resume?.education?.[0]?.institution || "Engineering College"}
- Skills: ${[...(resume?.skills?.languages || []), ...(resume?.skills?.frameworks || [])].slice(0, 6).join(", ")}

SCORING RULES:
- 10-13 points covered thoroughly: Score 85-95 ("Strong")
- 6-9 points covered: Score 60-74 ("Moderate")
- Less than 6 points covered or brief answer: Score 30-50 ("Weak")
- Overconfidence penalty: If candidate claims to become CEO or run the company, penalize by 15 points and flag in feedback.
- College short-form notice: If candidate used an acronym for college without full name, mention it.

REQUIRED OUTPUT:
1. score: Integer 0-100
2. strengthLevel: "Strong" (>=75), "Moderate" (50-74), or "Weak" (<50)
3. nextDifficultyTriggered: "Advanced" if Strong, "Intermediate" if Moderate, "Fundamental" if Weak
4. feedback: Clear breakdown of which of the template elements were covered well and which specific points were omitted or need improvement.
5. idealModelAnswer: The full, exemplary self-introduction written out following the exact 12-point sample template populated with candidate resume details.
6. consistencyWarning: Any contradiction with resume (or null if none)

Respond strictly in JSON matching schema:
{
  "score": 85,
  "strengthLevel": "Strong",
  "nextDifficultyTriggered": "Advanced",
  "feedback": "...",
  "idealModelAnswer": "...",
  "consistencyWarning": null
}
`;
  } else {
    // -------------------------------------------------------------
    // BRANCH B: STRICT QUESTION-ANSWER ACCURACY MATCHING (QUESTIONS 2 TO 10)
    // -------------------------------------------------------------
    const stopWords = new Set([
      "what", "how", "why", "when", "where", "which", "who", "whom", "whose",
      "is", "are", "was", "were", "be", "been", "being", "have", "has", "had",
      "do", "does", "did", "can", "could", "should", "would", "will", "shall",
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with",
      "about", "by", "of", "from", "up", "into", "over", "after", "your", "you",
      "across", "tell", "explain", "describe", "walk", "through", "in", "its", "our",
      "please", "give", "detail", "role", "system", "project"
    ]);

    const questionTokens = (question.questionText + " " + (question.expectedKeyPoints || []).join(" ") + " " + (question.contextRef || ""))
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stopWords.has(w));

    const uniqueQTokens = Array.from(new Set(questionTokens));
    const matchedTokens = uniqueQTokens.filter((token) => answerLower.includes(token));
    const overlapRatio = uniqueQTokens.length > 0 ? matchedTokens.length / uniqueQTokens.length : 0;

    const isEvasive =
      /^(i don'?t know|no idea|not sure|skip|pass|i haven'?t worked on this|never done this|na|no comments?)$/i.test(answer.trim()) ||
      /\b(?:i don'?t know much about|never heard of|can we skip|next question please)\b/i.test(answer);

    const isOffTopic = words.length >= 10 && matchedTokens.length === 0 && !techMatches.length;

    let qScore = 65;
    if (isEvasive) {
      qScore = 25;
    } else if (isOffTopic) {
      qScore = 35;
    } else if (words.length < 20) {
      qScore = 42;
    } else {
      qScore = 55 + Math.round(overlapRatio * 30);
      if (words.length >= 50) qScore += 8;
      if (/\b\d+(?:%|M|k|ms|s|\+)\b/i.test(answer) || /\b(?:latency|throughput|scale|production|architect)\b/i.test(answer)) {
        qScore += 6;
      }
      if (techMatches.length >= 2) qScore += 6;
    }

    if (consistencyWarning) {
      qScore -= 15;
    }

    const finalScore = Math.max(20, Math.min(98, qScore));
    const strengthLevel: "Strong" | "Moderate" | "Weak" =
      finalScore >= 75 ? "Strong" : finalScore >= 50 ? "Moderate" : "Weak";

    const nextDifficultyTriggered: QuestionDifficulty =
      strengthLevel === "Strong"
        ? "Advanced"
        : strengthLevel === "Weak"
        ? "Fundamental"
        : "Intermediate";

    let qFeedback = "";
    if (isEvasive) {
      qFeedback = `Your response skipped or avoided the question asked regarding "${question.contextRef || question.targetCategory}". In a technical interview, share foundational principles or related architecture even if you don't know every detail.`;
    } else if (isOffTopic) {
      qFeedback = `Your answer did not directly address the question asked about "${question.contextRef || question.targetCategory}". Interviewers expect a direct answer focused on the specific mechanism, design choice, or trade-off questioned.`;
    } else if (strengthLevel === "Strong") {
      qFeedback = `Excellent response! You directly addressed the question on "${question.contextRef || question.targetCategory}", clearly articulated the underlying technical mechanics, and demonstrated strong engineering depth.`;
    } else if (strengthLevel === "Moderate") {
      qFeedback = `Solid response addressing the question, but could be elevated by explaining deeper architectural mechanics, edge cases, and concrete performance metrics.`;
    } else {
      qFeedback = `The answer was somewhat brief and lacked depth on "${question.contextRef || question.targetCategory}". Structure your answer with the STAR technique and explain the specific engineering mechanics.`;
    }

    const dynamicModelAnswer = `In an exemplary response addressing "${question.questionText}":
1. Core Technical Mechanics: Directly answer the question by detailing the exact architecture, algorithms, or design patterns used.
2. Trade-offs & Implementation: Explain why specific choices were made over alternatives, addressing failure modes, edge cases, and resilience.
3. Quantified Outcomes: Conclude with measurable engineering results (such as latency reduction, throughput scaling, or error-rate drop) relevant to ${jobRole}.`;

    fallbackEval = {
      questionId: question.id,
      questionText: question.questionText,
      candidateAnswer: answer,
      score: finalScore,
      strengthLevel,
      speechMetrics,
      feedback: qFeedback,
      idealModelAnswer: dynamicModelAnswer,
      consistencyWarning,
      nextDifficultyTriggered,
    };

    prompt = `
Evaluate the candidate's answer for Question #${question.id} in an interview for the role "${jobRole}".

CRITICAL MANDATE — STRICT QUESTION-ANSWER ACCURACY & RELEVANCE:
You must strictly evaluate whether the candidate's answer DIRECTLY and ACCURATELY answers the specific question asked:
Question Asked: "${question.questionText}"
Target Category: "${question.targetCategory}"
Topic Focus: "${question.contextRef || jobRole}"
Difficulty Level: "${question.difficulty}"
Expected Key Points: ${JSON.stringify(question.expectedKeyPoints)}

Candidate's Transcript Answer: "${answer}"
Candidate's Resume Highlights:
- Top Skills: ${[...(resume?.skills?.languages || []), ...(resume?.skills?.frameworks || [])].slice(0, 6).join(", ")}
- Recent Experience / Projects: ${(resume?.projects || []).slice(0, 2).map((p: any) => p.title).join(", ")}

SCORING CRITERIA:
1. OFF-TOPIC, EVASIVE, OR GENERIC BUZZWORDS (Score: 20-45, strengthLevel: "Weak"):
   - Candidate talks about something else, gives a superficial non-answer, dodges the question, or repeats buzzwords without explaining the asked concept.
   - Explicitly state what was asked vs what was missed in feedback.
2. PARTIALLY RELEVANT / BASIC (Score: 50-74, strengthLevel: "Moderate"):
   - Directly addresses the topic, but lacks architectural depth, trade-offs, or concrete mechanism explanations.
3. HIGH ACCURACY & MECHANISM-RICH (Score: 75-95, strengthLevel: "Strong"):
   - Directly and comprehensively answers the question asked, explaining technical mechanics, edge cases, trade-offs, and quantitative outcomes.

REQUIRED OUTPUT:
1. score: Integer 0-100
2. strengthLevel: "Strong" (>=75), "Moderate" (50-74), or "Weak" (<50)
3. nextDifficultyTriggered: "Advanced" if Strong, "Intermediate" if Moderate, "Fundamental" if Weak
4. feedback: 2-3 sentences of constructive, specific critique explaining how accurately they answered the prompt and what was missing
5. idealModelAnswer: A comprehensive, exemplary answer directly addressing the question "${question.questionText}" with senior technical depth
6. consistencyWarning: Any contradiction with resume (or null if none)

Respond strictly in JSON matching the schema:
{
  "score": 85,
  "strengthLevel": "Strong",
  "nextDifficultyTriggered": "Advanced",
  "feedback": "...",
  "idealModelAnswer": "...",
  "consistencyWarning": null
}
`;
  }

  return callGeminiJson<AnswerEvaluation>(
    prompt,
    "You are a rigorous technical interview bar-raiser. Output strictly valid JSON.",
    () => fallbackEval,
    apiKey
  ).then((res) => ({
    ...fallbackEval,
    ...res,
    speechMetrics,
    candidateAnswer: answer,
    questionId: question.id,
    questionText: question.questionText,
    idealModelAnswer:
      isSelfIntro && !res.idealModelAnswer?.includes("Good morning")
        ? buildSelfIntroTemplateModelAnswer(resume, jobRole)
        : res.idealModelAnswer || fallbackEval.idealModelAnswer,
  }));
}

/**
 * Generate next adaptive question dynamically avoiding duplicates and cycling across resume projects, skills, and scenarios
 */
export async function generateNextAdaptiveQuestion(
  resume: ResumeData,
  jobRole: string,
  jobDescription: string,
  askedQuestions: QuestionItem[],
  lastEvaluation: AnswerEvaluation,
  questionNumber: number,
  apiKey?: string,
  pastAskedQuestions: string[] = []
): Promise<QuestionItem> {
  const nextDiff = lastEvaluation?.nextDifficultyTriggered || "Fundamental";
  const currentSessionAsked = (askedQuestions || [])
    .filter((q): q is QuestionItem => Boolean(q && q.questionText))
    .map((q) => q.questionText.toLowerCase().trim());
  const allBlacklist = Array.from(
    new Set([...currentSessionAsked, ...(pastAskedQuestions || []).filter(Boolean).map((t) => t.toLowerCase().trim())])
  );

  // Available candidate assets with cleaned titles
  const candidateProjects = (resume?.projects || []).map((p) => ({
    ...p,
    title: cleanProjectTitle(p.title),
  }));

  const allSkills = [
    ...(resume?.skills?.languages || []),
    ...(resume?.skills?.frameworks || []),
    ...(resume?.skills?.toolsAndCloud || []),
  ].filter(Boolean);

  const p1 = candidateProjects[0]?.title || "key project";
  const p2 =
    candidateProjects[1]?.title ||
    (candidateProjects[0]?.title
      ? `${candidateProjects[0].title} (core pipeline & logic)`
      : "technical project");
  const pAll =
    candidateProjects.map((p) => p.title).filter(Boolean).join(", ") ||
    "resume portfolio projects";
  const projectTitle = p1;

  // Dynamically select a skill not yet probed
  const unprobedSkills = allSkills.filter(
    (s) => !currentSessionAsked.some((t) => t.includes(s.toLowerCase()))
  );
  const targetSkill =
    unprobedSkills.length > 0
      ? unprobedSkills[Math.floor(Math.random() * unprobedSkills.length)]
      : allSkills[Math.floor(Math.random() * allSkills.length)] || "software architecture";

  // Determine target category and focus based on 10-question roadmap
  let targetCategory: QuestionItem["targetCategory"] = "technical";
  let contextRef: string | undefined = undefined;
  let questionFocusDescription = "";

  if (questionNumber === 2) {
    targetCategory = "project_deep_dive";
    contextRef = `Project 1 Architecture: "${p1}"`;
    questionFocusDescription = `Probe the candidate's flagship project "${p1}". Ask about high-level architecture, design choices, and rationale for the technology stack.`;
  } else if (questionNumber === 3) {
    targetCategory = "project_deep_dive";
    contextRef = `Project 2 Implementation & Logic: "${p2}"`;
    questionFocusDescription = `Probe project "${p2}". Ask about concrete data flow, state management, API design, algorithm logic, or schema structure.`;
  } else if (questionNumber === 4) {
    targetCategory = "scenario_architecture";
    contextRef = `Cross-Project Trade-offs & Optimizations: "${pAll}"`;
    questionFocusDescription = `Evaluate engineering trade-offs, bottlenecks, performance optimizations, and failure handling across all candidate projects ("${pAll}").`;
  } else if (questionNumber === 5) {
    targetCategory = "technical";
    contextRef = `Core Technical Fundamentals for ${jobRole}`;
    questionFocusDescription = `Evaluate foundational engineering concepts, protocols, paradigms, and core principles essential for a ${jobRole}.`;
  } else if (questionNumber === 6) {
    targetCategory = "scenario_architecture";
    contextRef = `System Architecture & Design Patterns for ${jobRole}`;
    questionFocusDescription = `Present a design pattern or system architecture scenario typical for a senior ${jobRole}.`;
  } else if (questionNumber === 7) {
    targetCategory = "scenario_architecture";
    contextRef = `Production Incident Debugging & Troubleshooting for ${jobRole}`;
    questionFocusDescription = `Test structured root-cause analysis on an unexpected production incident or critical failure in ${jobRole}.`;
  } else if (questionNumber === 8) {
    targetCategory = "technical";
    contextRef = `Scalability, Concurrency & Performance for ${jobRole}`;
    questionFocusDescription = `Examine high-load scaling, concurrency control, latency reduction, and memory or resource optimization for ${jobRole}.`;
  } else if (questionNumber === 9) {
    targetCategory = "technical";
    contextRef = `Security, Integrity & Fault Tolerance for ${jobRole}`;
    questionFocusDescription = `Evaluate security best practices, data validation, zero-trust, and resilience patterns for ${jobRole}.`;
  } else {
    // Question 10 (or beyond)
    targetCategory = "stakeholder_impact";
    contextRef = `Stakeholder Collaboration & Technical Leadership for ${jobRole}`;
    questionFocusDescription = `Assess leadership, cross-functional collaboration, communicating technical debt, and business alignment for ${jobRole}.`;
  }

  // Large, randomized, role-tailored question pool ensuring variety across runs
  const generateFallbackQuestion = (): QuestionItem => {
    const candidates: Array<{
      category: QuestionItem["targetCategory"];
      context?: string;
      text: string;
      rationale: string;
      points: string[];
    }> = [];

    // 0. CANDIDATE PROJECTS DEDICATED POOL (FOR QUESTIONS 2, 3, 4)
    candidates.push(
      // Q2: Project 1 Architecture & Design Decisions
      {
        category: "project_deep_dive",
        context: `Project 1: ${p1}`,
        text: `In your project "${p1}", what architectural decisions and tech stack choices did you make, and why?`,
        rationale: "Assess architectural justification, component division, and project ownership.",
        points: ["Architectural pattern chosen", "Tech stack rationale", "Core design trade-offs"],
      },
      {
        category: "project_deep_dive",
        context: `Project 1: ${p1}`,
        text: `Can you walk through the system architecture of "${p1}" and explain how the key components communicate?`,
        rationale: "Evaluate component topology, communication protocols, and architectural structure.",
        points: ["Component breakdown", "Communication flow", "Decoupling strategy"],
      },
      {
        category: "project_deep_dive",
        context: `Project 1: ${p1}`,
        text: `In "${p1}", how did you design data security, user authorization, and state integrity?`,
        rationale: "Evaluate security, state integrity, and authorization design.",
        points: ["Authentication & authorization", "Data sanitization", "State consistency"],
      },
      {
        category: "project_deep_dive",
        context: `Project 1: ${p1}`,
        text: `What architectural trade-offs did you encounter when structuring the core layers of "${p1}"?`,
        rationale: "Probe architectural trade-offs and engineering discipline.",
        points: ["Options considered", "Trade-off analysis", "Long-term maintainability"],
      },
      {
        category: "project_deep_dive",
        context: `Project 1: ${p1}`,
        text: `How did you divide responsibility between client and server components in "${p1}"?`,
        rationale: "Assess tier separation, boundary definitions, and modular design.",
        points: ["Client-server boundaries", "API abstraction", "Data fetching patterns"],
      },

      // Q3: Project 2 Implementation & Logic
      {
        category: "project_deep_dive",
        context: `Project 2: ${p2}`,
        text: `Walking through "${p2}", how did you implement the core data pipeline, state handling, and business logic?`,
        rationale: "Assess implementation mechanics, data flow, and state handling in candidate projects.",
        points: ["Data flow and processing", "State management mechanics", "Error handling logic"],
      },
      {
        category: "project_deep_dive",
        context: `Project 2: ${p2}`,
        text: `In "${p2}", how did you structure your APIs, database interactions, and backend data integrity?`,
        rationale: "Evaluate backend/API mechanics and data integrity guarantees.",
        points: ["API design patterns", "Data persistence strategy", "Validation and consistency"],
      },
      {
        category: "project_deep_dive",
        context: `Project 2: ${p2}`,
        text: `What edge cases or unexpected data inputs did you handle in the implementation of "${p2}"?`,
        rationale: "Examine edge-case handling, input defensive programming, and resilience.",
        points: ["Defensive validation", "Edge cases encountered", "Error handling paths"],
      },
      {
        category: "project_deep_dive",
        context: `Project 2: ${p2}`,
        text: `How did you manage asynchronous processing, latency, and query optimization in "${p2}"?`,
        rationale: "Assess asynchronous execution, latency reduction, and database efficiency.",
        points: ["Async task handling", "Index usage", "Latency benchmarks"],
      },
      {
        category: "project_deep_dive",
        context: `Project 2: ${p2}`,
        text: `In "${p2}", what logging, monitoring, or error handling patterns did you build into the system?`,
        rationale: "Probe operational observability and error tracing.",
        points: ["Logging strategy", "Error recovery", "Telemetry"],
      },

      // Q4: Cross-Project Trade-offs & Optimizations across all projects
      {
        category: "scenario_architecture",
        context: `Projects: ${pAll}`,
        text: `Across your projects (${pAll}), what was the most difficult bottleneck or trade-off you had to optimize?`,
        rationale: "Evaluate cross-project engineering trade-offs, scalability bottlenecks, and optimization.",
        points: ["Identified bottleneck", "Trade-off evaluation", "Measurable performance result"],
      },
      {
        category: "scenario_architecture",
        context: `Projects: ${pAll}`,
        text: `Looking at "${pAll}", what failure modes did you anticipate, and how did you handle error resilience?`,
        rationale: "Assess edge-case handling, failure resilience, and fault tolerance across projects.",
        points: ["Failure scenarios considered", "Fallback mechanisms", "Data recovery strategy"],
      },
      {
        category: "scenario_architecture",
        context: `Projects: ${pAll}`,
        text: `If you had to re-architect "${pAll}" to handle 100x traffic scale, what would you redesign first?`,
        rationale: "Assess scalability intuition, horizontal scaling, and architectural foresight.",
        points: ["Scale bottlenecks", "Caching and partitioning", "Decoupling microservices"],
      },
      {
        category: "scenario_architecture",
        context: `Projects: ${pAll}`,
        text: `What technical debt or architectural compromises exist in "${pAll}", and how would you fix them?`,
        rationale: "Evaluate pragmatic engineering, trade-off awareness, and technical debt management.",
        points: ["Compromises made", "Refactoring plan", "Impact on velocity"],
      },
      {
        category: "scenario_architecture",
        context: `Projects: ${pAll}`,
        text: `Across your portfolio (${pAll}), how did you test your code and ensure release reliability?`,
        rationale: "Assess testing discipline, CI/CD, and regression prevention.",
        points: ["Unit and integration tests", "Mocking dependencies", "Release verification"],
      }
    );

    const roleLower = jobRole.toLowerCase().trim();

    // 1. DATA ANALYST / BI / BUSINESS ANALYST
    if (
      roleLower.includes("data analyst") ||
      roleLower.includes("analyst") ||
      roleLower.includes("bi") ||
      roleLower.includes("business intelligence")
    ) {
      candidates.push(
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `In your project "${projectTitle}", what key metrics would you track to analyze user engagement and trends?`,
          rationale: "Assess ability to establish business metrics from raw application features.",
          points: ["Metric definitions", "Data validation", "Tracking mechanism"],
        },
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `How would you design a real-time executive dashboard for "${projectTitle}" to monitor system anomalies?`,
          rationale: "Test dashboard design, KPI aggregation, and user alerting.",
          points: ["KPI layout", "Real-time refresh rates", "Threshold alerting"],
        },
        {
          category: "technical",
          context: "SQL Window Functions",
          text: `In SQL, how do window functions like RANK and DENSE_RANK differ when analyzing customer rankings?`,
          rationale: "Evaluate core SQL competency and aggregation precision.",
          points: ["Handling ties and gaps", "PARTITION BY usage", "Query performance"],
        },
        {
          category: "technical",
          context: "Data Cleaning & Hygiene",
          text: `How do you handle incomplete, duplicated, or null values when cleaning raw business datasets for analysis?`,
          rationale: "Test data hygiene discipline and statistical distribution preservation.",
          points: ["Null imputation vs dropping", "Deduplication logic", "Audit logs"],
        },
        {
          category: "technical",
          context: "A/B Testing & Metrics",
          text: `How do you determine statistical significance and minimum sample size when running an A/B test?`,
          rationale: "Assess hypothesis testing, confidence intervals, and experiment design.",
          points: ["P-values and significance level", "Sample size power calculations", "Avoiding peeking bias"],
        },
        {
          category: "scenario_architecture",
          context: "Metric Drop Investigation",
          text: `If an executive dashboard shows an unexpected 25% drop in weekly conversions, how would you diagnose it?`,
          rationale: "Test structured analytical troubleshooting and root cause analysis.",
          points: ["Data pipeline integrity", "Cohort and dimension breakdown", "Hypothesis testing"],
        },
        {
          category: "scenario_architecture",
          context: "Data Warehouse Modeling",
          text: `When designing an analytical reporting schema, when would you choose a Star Schema over Snowflake?`,
          rationale: "Evaluate dimensional modeling, denormalization, and reporting query speed.",
          points: ["Fact and dimension table design", "Query performance tradeoffs", "ETL maintenance complexity"],
        },
        {
          category: "stakeholder_impact",
          context: "Presenting Insights to Leadership",
          text: `How do you present complex statistical findings or anomalies to non-technical business stakeholders?`,
          rationale: "Assess data storytelling and translating numbers into actionable decisions.",
          points: ["Executive summary framing", "Chart clarity", "Actionable recommendations"],
        },
        {
          category: "stakeholder_impact",
          context: "Conflicting Metrics",
          text: `How do you resolve situations where marketing and product teams report conflicting KPI figures?`,
          rationale: "Test data governance, single-source-of-truth alignment, and cross-functional leadership.",
          points: ["Metric definition alignment", "Data lineage audit", "Shared KPI documentation"],
        }
      );
    }
    // 2. MACHINE LEARNING / AI / DATA SCIENCE
    else if (
      roleLower.includes("machine learning") ||
      roleLower.includes("ai") ||
      roleLower.includes("data scientist")
    ) {
      candidates.push(
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `In your project "${projectTitle}", what evaluation metrics did you use to validate model performance and prevent bias?`,
          rationale: "Assess ML evaluation rigor and anti-overfitting measures.",
          points: ["Precision vs Recall", "Cross-validation setup", "Data leakage checks"],
        },
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `How did you handle feature preprocessing, missing values, and scaling in "${projectTitle}"?`,
          rationale: "Test feature engineering and data pipeline discipline.",
          points: ["Standardization vs normalization", "Categorical encoding", "Pipeline reproducibility"],
        },
        {
          category: "technical",
          context: "Imbalanced Classification",
          text: `How do you decide between precision and recall when optimizing a model for imbalanced classification?`,
          rationale: "Test cost matrix understanding and threshold tuning.",
          points: ["Cost of false positives vs false negatives", "PR-AUC curve analysis", "Threshold calibration"],
        },
        {
          category: "technical",
          context: "Overfitting vs Generalization",
          text: `What techniques do you use to detect and prevent overfitting during deep neural network training?`,
          rationale: "Examine regularization, dropout, early stopping, and data augmentation.",
          points: ["Early stopping criteria", "L1/L2 regularization & dropout", "Validation loss monitoring"],
        },
        {
          category: "scenario_architecture",
          context: "Production Model Drift",
          text: `If your trained model shows high test accuracy but degrades severely in production, how would you debug it?`,
          rationale: "Test observability into data drift, concept drift, and feature mismatch.",
          points: ["Feature distribution drift", "Feedback loop delay", "Automated retraining triggers"],
        },
        {
          category: "scenario_architecture",
          context: "Low-Latency Inference",
          text: `How do you optimize a large transformer model to achieve sub-50ms inference latency in production?`,
          rationale: "Assess model quantization, pruning, batching, and GPU acceleration.",
          points: ["Quantization (INT8/FP16)", "ONNX/TensorRT runtime", "Dynamic batching"],
        },
        {
          category: "technical",
          context: "Vector Databases & Embeddings",
          text: `How do vector databases like FAISS or Pinecone perform approximate nearest neighbor search under millions of embeddings?`,
          rationale: "Assess vector index architectures, HNSW graphs, and cosine similarity lookup.",
          points: ["HNSW index mechanics", "Quantization for vector memory", "Recall vs latency trade-off"],
        },
        {
          category: "technical",
          context: "Data Leakage Prevention",
          text: `How do you detect and prevent subtle target leakage between feature preprocessing and train/validation splits?`,
          rationale: "Test production pipeline hygiene and cross-validation integrity.",
          points: ["Pipeline encapsulation", "Temporal split integrity", "Leakage audit tests"],
        },
        {
          category: "technical",
          context: "RAG Architecture & Hallucinations",
          text: `In LLM systems, how do you architect a Retrieval-Augmented Generation pipeline to prevent model hallucinations?`,
          rationale: "Assess RAG chunking, semantic retrieval, reranking, and context faithfulness.",
          points: ["Chunking strategy & embeddings", "Cross-encoder reranking", "Grounding and attribution"],
        },
        {
          category: "scenario_architecture",
          context: "Continuous Training & MLOps",
          text: `How do you architect an automated continuous training pipeline triggered by feature drift and performance degradation?`,
          rationale: "Test MLOps orchestration, artifact tracking, and shadow deployment.",
          points: ["Automated drift alerts", "Shadow model verification", "Model registry rollbacks"],
        },
        {
          category: "stakeholder_impact",
          context: "Explaining ML to Leadership",
          text: `How do you explain model trade-offs and error margins to product managers and business leaders?`,
          rationale: "Probe communication of probabilistic outputs to non-technical partners.",
          points: ["Confidence score interpretation", "Risk mitigation strategies", "Business ROI clarity"],
        }
      );
    }
    // 3. FRONTEND / UI / REACT DEVELOPER
    else if (
      roleLower.includes("frontend") ||
      roleLower.includes("ui") ||
      roleLower.includes("react")
    ) {
      candidates.push(
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `In your project "${projectTitle}", how did you optimize frontend rendering performance and responsive UI?`,
          rationale: "Assess UI performance practices, lazy loading, and component structure.",
          points: ["Virtualization & lazy loading", "State colocation", "Bundle size reduction"],
        },
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `How did you structure client-side state management and asynchronous data fetching in "${projectTitle}"?`,
          rationale: "Examine state architecture, caching, and race condition prevention.",
          points: ["State library choice", "Optimistic updates", "Cache invalidation"],
        },
        {
          category: "technical",
          context: "Event Loop & Hydration",
          text: `How does the browser event loop prioritize microtasks and macrotasks during intensive DOM re-renders?`,
          rationale: "Evaluate JavaScript engine runtime and rendering frame budget knowledge.",
          points: ["Call stack execution", "Microtask vs macrotask queues", "RequestAnimationFrame timing"],
        },
        {
          category: "technical",
          context: "SSR vs Client Hydration",
          text: `What causes React hydration mismatch errors in Server-Side Rendered applications, and how do you prevent them?`,
          rationale: "Test Next.js/React SSR architecture and hydration lifecycle mastery.",
          points: ["Server vs client DOM diff", "Suppression strategies", "Window/localStorage guards"],
        },
        {
          category: "scenario_architecture",
          context: "Rendering 10,000 Records",
          text: `If users report that a dashboard table freezes when rendering 10,000 items, how would you fix it?`,
          rationale: "Test virtualization, DOM recycling, and memory profiling.",
          points: ["Windowing / virtualization", "Web Workers for filtering", "Debounced search"],
        },
        {
          category: "scenario_architecture",
          context: "Core Web Vitals Optimization",
          text: `How do you identify and eliminate Largest Contentful Paint (LCP) and Cumulative Layout Shift (CLS) issues?`,
          rationale: "Test modern Web Vitals optimization discipline.",
          points: ["Image dimensions and preloading", "Font loading strategies", "Critical CSS delivery"],
        },
        {
          category: "stakeholder_impact",
          context: "Design System Delivery",
          text: `How do you balance implementing pixel-perfect design specifications with tight product delivery deadlines?`,
          rationale: "Assess pragmatic UI engineering and stakeholder communication.",
          points: ["Reusable design tokens", "Scoping MVP variants", "Transparent trade-off discussion"],
        }
      );
    }
    // 4. DEVOPS / CLOUD / SRE
    else if (
      roleLower.includes("devops") ||
      roleLower.includes("cloud") ||
      roleLower.includes("infra") ||
      roleLower.includes("sre")
    ) {
      candidates.push(
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `In your project "${projectTitle}", how did you configure automated CI/CD pipelines, containerization, and deployments?`,
          rationale: "Evaluate continuous delivery discipline and container orchestration in real projects.",
          points: ["Pipeline stages", "Container security", "Automated rollbacks"],
        },
        {
          category: "technical",
          context: "Zero-Downtime Releases",
          text: `How do you perform zero-downtime rolling deployments when releasing schema changes to production databases?`,
          rationale: "Test safe release engineering and expand-contract migrations.",
          points: ["Expand-contract migrations", "Canary rollouts", "Connection draining"],
        },
        {
          category: "technical",
          context: "Kubernetes Failure Modes",
          text: `How do you diagnose and recover a Kubernetes pod stuck in a CrashLoopBackOff state?`,
          rationale: "Test container runtime troubleshooting, probe configurations, and log inspection.",
          points: ["Pod events and logs", "OOMKilled checks", "Liveness/readiness probe tuning"],
        },
        {
          category: "scenario_architecture",
          context: "Peak Gateway Timeouts",
          text: `If a core service starts returning 504 gateway timeouts during peak traffic, how do you triage it?`,
          rationale: "Examine incident management, log aggregation, and bottleneck identification.",
          points: ["Distributed tracing", "Connection pool exhaustion", "Horizontal auto-scaling"],
        },
        {
          category: "stakeholder_impact",
          context: "SLA & Error Budgeting",
          text: `How do you establish service level objectives with engineering teams while balancing feature velocity and reliability?`,
          rationale: "Probe error budget management and SLA negotiation.",
          points: ["Error budget policies", "Blameless postmortems", "Reliability prioritization"],
        }
      );
    }
    // 5. BACKEND / FULL-STACK / GENERAL SOFTWARE
    else {
      candidates.push(
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `In your project "${projectTitle}", what was the most complex technical trade-off you made, and why?`,
          rationale: "Examine architectural decision-making and practical constraints.",
          points: ["Options evaluated", "Selected approach rationale", "Observed trade-offs"],
        },
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `How did you design authentication, authorization, and data security in your project "${projectTitle}"?`,
          rationale: "Test security hygiene, token handling, and access control.",
          points: ["JWT vs Session storage", "CSRF/XSS protection", "Role-based access control"],
        },
        {
          category: "project_deep_dive",
          context: `Project: ${projectTitle}`,
          text: `How did you structure database schema relationships, indices, and foreign keys in "${projectTitle}"?`,
          rationale: "Assess database modeling discipline and relational integrity.",
          points: ["Normalization vs denormalization", "Indexing strategy", "Query optimization"],
        },
        {
          category: "technical",
          context: "Concurrency & Race Conditions",
          text: `How do you guarantee data consistency and prevent race conditions when multiple users update shared state?`,
          rationale: "Assess concurrency control, database transaction isolation, and idempotency.",
          points: ["Optimistic vs pessimistic locking", "Database isolation levels", "Idempotency keys"],
        },
        {
          category: "technical",
          context: "Database Indexing & N+1",
          text: `How do database B-Tree indexes work, and how do you resolve N+1 query bottlenecks in ORMs?`,
          rationale: "Evaluate relational database performance and query plan analysis.",
          points: ["B-Tree lookups and selectivity", "Eager loading vs lazy loading", "Compound index ordering"],
        },
        {
          category: "technical",
          context: "Distributed Caching",
          text: `When implementing a distributed cache like Redis, how do you handle cache invalidation and cache stampede?`,
          rationale: "Assess caching strategies, TTL policies, and high-concurrency safeguards.",
          points: ["Cache-aside vs write-through", "Mutex locks for stampedes", "TTL jitter"],
        },
        {
          category: "technical",
          context: "Microservices vs Monolith",
          text: `How do you handle distributed transactions across multiple microservices without distributed two-phase locks?`,
          rationale: "Test event-driven architecture and the Saga pattern.",
          points: ["Saga pattern (choreography/orchestration)", "Compensating transactions", "Eventual consistency"],
        },
        {
          category: "scenario_architecture",
          context: "API Latency Spike",
          text: `If an API endpoint response time suddenly jumps from 50ms to 2 seconds under load, how do you debug it?`,
          rationale: "Probe production profiling, query execution plans, distributed tracing, and caching.",
          points: ["Database query plan analysis", "APM distributed tracing", "Downstream service latency"],
        },
        {
          category: "scenario_architecture",
          context: "Zero-Downtime DB Migration",
          text: `How do you rename a column on a multi-million row production table without causing service downtime?`,
          rationale: "Assess safe schema evolution and backward compatibility.",
          points: ["Add new column", "Dual-write application layer", "Backfill and deprecate"],
        },
        {
          category: "scenario_architecture",
          context: "Rate Limiting & Abuse Prevention",
          text: `How would you architect a distributed rate-limiter to protect public APIs against DDoS or brute-force attacks?`,
          rationale: "Evaluate token bucket algorithms, Redis sliding windows, and edge throttling.",
          points: ["Token bucket / sliding window", "Redis atomic operations", "Client IP / token hashing"],
        },
        {
          category: "stakeholder_impact",
          context: "Technical Debt Prioritization",
          text: `How do you convince product stakeholders to invest in technical debt when they prioritize new features?`,
          rationale: "Assess engineering advocacy, developer velocity, and business-value justification.",
          points: ["Quantifying cost of bugs", "Incremental refactoring in feature work", "Executive alignment"],
        },
        {
          category: "stakeholder_impact",
          context: "Major Outage Post-Mortem",
          text: `When leading a post-mortem after a critical production outage, how do you foster a blameless culture?`,
          rationale: "Evaluate engineering leadership, psychological safety, and root cause prevention.",
          points: ["Blameless root-cause analysis", "Actionable preventative items", "Systemic improvement"],
        }
      );
    }

    // Slot-aware selection matching the 10-question roadmap
    let slotCandidates = candidates;
    if (questionNumber === 2) {
      slotCandidates = candidates.filter(
        (c) => c.category === "project_deep_dive" && c.context?.startsWith("Project 1")
      );
    } else if (questionNumber === 3) {
      slotCandidates = candidates.filter(
        (c) => c.category === "project_deep_dive" && c.context?.startsWith("Project 2")
      );
    } else if (questionNumber === 4) {
      slotCandidates = candidates.filter((c) => c.context?.startsWith("Projects:"));
    } else {
      // Questions 5 to 10: strictly target role competencies (exclude project specifics)
      const roleOnly = candidates.filter((c) => !c.context?.startsWith("Project"));
      const categoryMatched = roleOnly.filter((c) => c.category === targetCategory);
      slotCandidates = categoryMatched.length > 0 ? categoryMatched : roleOnly;
    }

    if (slotCandidates.length === 0) {
      slotCandidates = candidates;
    }

    // Filter candidates against questions asked in this or past sessions
    const unasked = slotCandidates.filter(
      (c) =>
        !allBlacklist.some(
          (black) =>
            black.includes(c.text.toLowerCase().slice(0, 25)) ||
            c.text.toLowerCase().includes(black.slice(0, 25))
        )
    );

    // Pick a completely unasked question randomly from the pool
    let chosen = unasked.length > 0 ? unasked[Math.floor(Math.random() * unasked.length)] : null;

    // If pool is exhausted for this slot, check broader unasked role candidates
    if (!chosen) {
      const broaderUnasked = candidates.filter(
        (c) =>
          !c.context?.startsWith("Project") &&
          !allBlacklist.some(
            (black) =>
              black.includes(c.text.toLowerCase().slice(0, 25)) ||
              c.text.toLowerCase().includes(black.slice(0, 25))
          )
      );
      const broaderCategoryMatched = broaderUnasked.filter((c) => c.category === targetCategory);
      if (broaderCategoryMatched.length > 0) {
        chosen = broaderCategoryMatched[Math.floor(Math.random() * broaderCategoryMatched.length)];
      } else if (broaderUnasked.length > 0) {
        chosen = broaderUnasked[Math.floor(Math.random() * broaderUnasked.length)];
      }
    }

    // If completely exhausted, generate a guaranteed unique dynamic question
    if (!chosen) {
      if (questionNumber === 2) {
        chosen = {
          category: "project_deep_dive",
          context: `Project 1: ${p1}`,
          text: `In "${p1}", what architectural patterns did you select and how did you resolve your primary engineering bottleneck?`,
          rationale: "Assess architectural patterns and bottleneck resolution.",
          points: ["Architectural pattern", "Bottleneck diagnosis", "Resolution"],
        };
      } else if (questionNumber === 3) {
        chosen = {
          category: "project_deep_dive",
          context: `Project 2: ${p2}`,
          text: `In "${p2}", how did you design data persistence, query efficiency, and state management?`,
          rationale: "Assess data persistence and implementation mechanics.",
          points: ["Data persistence", "Query efficiency", "State management"],
        };
      } else if (questionNumber === 4) {
        chosen = {
          category: "scenario_architecture",
          context: `Projects: ${pAll}`,
          text: `Reflecting on "${pAll}", what performance metric or reliability hurdle required the most intricate refactoring?`,
          rationale: "Probe production optimization and refactoring persistence.",
          points: ["Performance metric", "Refactoring complexity", "Outcome"],
        };
      } else {
        chosen = {
          category: targetCategory,
          context: contextRef || jobRole,
          text: `For ${jobRole}, how do you evaluate system resilience, test automation, and production observability under heavy load?`,
          rationale: "Assess senior engineering readiness and operational discipline.",
          points: ["System resilience", "Automated verification", "Observability metrics"],
        };
      }
    }

    return {
      id: `q-${questionNumber}-${Date.now().toString().slice(-4)}`,
      targetCategory: chosen.category,
      difficulty: nextDiff,
      contextRef: chosen.context,
      questionText: chosen.text,
      rationale: chosen.rationale,
      expectedKeyPoints: chosen.points,
    };
  };

  const fallback = generateFallbackQuestion();

  // If OpenAI / Gemini API is active, craft a tailored non-repeating question directly evaluating target role
  const prompt = `
You are a senior technical interviewer at a tier-1 company interviewing a candidate for the role: "${jobRole}".
The candidate just completed Question #${questionNumber - 1}.

INTERVIEW ROADMAP (10 QUESTIONS TOTAL - CURRENT QUESTION: #${questionNumber} of 10):
- Question 1: Comprehensive Self-Introduction & Background.
- Questions 2, 3, 4 (3 questions): Deep-dive into all candidate projects from their resume.
- Questions 5 to 10 (6 questions): Deep-dive into technical competencies, system architecture, incident debugging, performance, security, and leadership for "${jobRole}".

CURRENT QUESTION TARGET (QUESTION #${questionNumber} of 10):
- Target Category: ${targetCategory}
- Specific Focus: ${contextRef}
- Objective: ${questionFocusDescription}
- Candidate Resume Projects: "${pAll}"
- Candidate Specific Project / Component: "${questionNumber === 2 ? p1 : questionNumber === 3 ? p2 : pAll}"
- Candidate Tech Skills: ${targetSkill}

PREVIOUS QUESTIONS ASKED (CRITICAL: DO NOT REPEAT, DUPLICATE, OR COVER SIMILAR TOPICS):
${allBlacklist.slice(0, 25).map((t, i) => `${i + 1}. ${t}`).join("\n")}

STRICT DIVERSITY & FORMAT RULES:
1. EXPLORE A COMPLETELY DIFFERENT TECHNICAL ANGLE from all questions listed above.
2. MAXIMUM 12 TO 20 WORDS TOTAL: Short, punchy, single sentence only.
${
  questionNumber >= 2 && questionNumber <= 4
    ? `3. MUST specifically ask about the candidate's resume projects ("${pAll}").`
    : `3. MUST directly evaluate technical competency or scenario for the TARGET ROLE "${jobRole}".`
}
4. EXACTLY ONE SPECIFIC QUESTION.
5. Output strictly valid JSON.

Schema:
{
  "questionText": "...",
  "rationale": "...",
  "difficulty": "${nextDiff}",
  "targetCategory": "${targetCategory}",
  "contextRef": "${contextRef || jobRole}",
  "expectedKeyPoints": ["Point 1", "Point 2", "Point 3"]
}
`;

  return callGeminiJson<QuestionItem>(
    prompt,
    "You are a principal technical interviewer at a tier-1 tech company. Output strictly valid JSON without markdown wrapping.",
    () => fallback,
    apiKey,
    { temperature: 0.88, presencePenalty: 0.8 }
  ).then((res) => {
    // If AI returned something too close to what was already asked, use diverse fallback
    const resText = (res.questionText || "").toLowerCase().trim();
    const isDuplicate = allBlacklist.some(
      (asked) => asked.length > 20 && (resText.includes(asked.slice(0, 25)) || asked.includes(resText.slice(0, 25)))
    );

    if (isDuplicate || !res.questionText) {
      console.warn("AI generated a question similar to previously asked or empty. Using distinct fallback.");
      return fallback;
    }

    return {
      ...fallback,
      ...res,
      id: `q-${questionNumber}-${Date.now().toString().slice(-4)}`,
      difficulty: nextDiff,
      targetCategory,
      contextRef,
    };
  });
}
