import { NextResponse } from "next/server";
import { generateFirstQuestion } from "@/lib/interviewEngine";
import { callAiJson } from "@/lib/geminiClient";
import { QuestionItem } from "@/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resumeData, jobRole, pastAskedQuestions, apiKey } = body;

    if (!resumeData || !jobRole) {
      return NextResponse.json(
        { error: "Missing required parameters: resumeData, jobRole" },
        { status: 400 }
      );
    }

    const fallback = generateFirstQuestion(resumeData, jobRole, pastAskedQuestions || []);

    const name =
      resumeData.candidateName && resumeData.candidateName !== "Candidate"
        ? resumeData.candidateName
        : "there";

    const prompt = `
You are a senior technical interviewer welcoming candidate "${name}" for the role of "${jobRole}".
Invite the candidate to deliver their comprehensive, structured self-introduction.

The self-introduction will be evaluated against a standardized 12-point professional structure:
1. Formal greeting and full name (strict rule: no pet names or short names)
2. Opening gratitude statement for the opportunity
3. Current location and origin / hometown
4. Graduation specialization and college name in FULL FORM (strictly no short forms or acronyms like "IIT", "NIT", "BITS" without spelling out)
5. Schooling percentages (+2 and SSC from state board)
6. Technical skills and core programming languages effectively known
7. Soft skills (leadership qualities, effective communication, adaptability)
8. Strengths (persistent learning, facing challenges) and weakness with an active rectification plan
9. Profile-aligned hobbies matching the target role
10. Brief family background
11. Realistic short-term goal (reputed company) & long-term goal (responsible technical position, strictly avoiding overconfidence like CEO)
12. Closing gratitude statement

Candidate Context:
- Name: ${name}
- Target Role: ${jobRole}
- College: ${resumeData.education?.[0]?.institution || "Engineering College"}
- Degree: ${resumeData.education?.[0]?.degree || "Graduation"}
- Key Skills: ${[...(resumeData.skills?.languages || []), ...(resumeData.skills?.frameworks || [])].slice(0, 6).join(", ")}

DO NOT REPEAT OR SOUND SIMILAR TO THESE PREVIOUSLY ASKED QUESTIONS:
${(pastAskedQuestions || []).slice(0, 10).map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

REQUIREMENTS:
1. The questionText MUST simply welcome the candidate and ask them to introduce themselves (e.g., "Hello ${name}, welcome to your interview for ${jobRole}. Please introduce yourself."). STRICT RULE: Do NOT list or enumerate the 12 evaluation criteria in the questionText.
2. Output strictly valid JSON matching schema:
{
  "questionText": "...",
  "rationale": "...",
  "expectedKeyPoints": [
    "Formal greeting and full candidate name (no short/pet names)",
    "Opening gratitude for the opportunity",
    "Current location and place of origin",
    "Graduation specialization and full college name (no short forms)",
    "Schooling details (+2 and SSC boards with percentages)",
    "Technical skills and core programming languages effectively known",
    "Soft skills (leadership, effective communication, adaptability)",
    "Strengths (persistent learning) and weakness with active rectification plan",
    "Profile-aligned hobbies and brief family background",
    "Realistic short-term goal (reputed company) and long-term goal (responsible position, avoiding overconfidence)",
    "Closing gratitude statement"
  ]
}
`;

    const question = await callAiJson<QuestionItem>(
      prompt,
      "You are a professional technical interviewer. Output strictly valid JSON.",
      () => fallback,
      apiKey,
      { temperature: 0.85, presencePenalty: 0.7 }
    );

    return NextResponse.json({
      question: {
        ...fallback,
        ...question,
        id: `q-1-icebreaker-${Date.now().toString().slice(-4)}`,
        targetCategory: "icebreaker",
        difficulty: "Fundamental",
        expectedKeyPoints: fallback.expectedKeyPoints,
      },
    });
  } catch (error) {
    console.error("API /api/first-question error:", error);
    return NextResponse.json(
      { error: "Failed to generate first question" },
      { status: 500 }
    );
  }
}
