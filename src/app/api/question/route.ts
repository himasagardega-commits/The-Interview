import { NextResponse } from "next/server";
import { generateNextAdaptiveQuestion } from "@/lib/interviewEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      resumeData,
      jobRole,
      jobDescription,
      askedQuestions,
      lastEvaluation,
      questionNumber,
      pastAskedQuestions,
      apiKey,
    } = body;

    if (!resumeData || !jobRole || !lastEvaluation) {
      return NextResponse.json(
        { error: "Missing required parameters for next question generation: resumeData, jobRole, lastEvaluation" },
        { status: 400 }
      );
    }

    const cleanJobDescription =
      jobDescription ||
      `Standard technical competencies, responsibilities, and architectural requirements for a ${jobRole}`;

    const question = await generateNextAdaptiveQuestion(
      resumeData,
      jobRole,
      cleanJobDescription,
      askedQuestions || [],
      lastEvaluation,
      questionNumber || 2,
      apiKey,
      pastAskedQuestions || []
    );

    return NextResponse.json({ question });
  } catch (error) {
    console.error("API /api/question error:", error);
    return NextResponse.json(
      { error: "Failed to generate dynamic adaptive question" },
      { status: 500 }
    );
  }
}
