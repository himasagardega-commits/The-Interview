import { NextResponse } from "next/server";
import { evaluateCandidateAnswer } from "@/lib/interviewEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, answer, resumeData, jobRole, durationSeconds, apiKey } = body;

    if (!question || !answer || !resumeData || !jobRole) {
      return NextResponse.json(
        { error: "Missing parameters for answer evaluation" },
        { status: 400 }
      );
    }

    const evaluation = await evaluateCandidateAnswer(
      question,
      answer,
      resumeData,
      jobRole,
      durationSeconds || 30,
      apiKey
    );

    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("API /api/evaluate-answer error:", error);
    return NextResponse.json(
      { error: "Failed to evaluate candidate answer" },
      { status: 500 }
    );
  }
}
