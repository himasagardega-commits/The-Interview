import { NextResponse } from "next/server";
import { analyzeResumeAndJob } from "@/lib/atsAnalyzer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resumeText, jobRole, jobDescription, apiKey } = body;

    if (!resumeText || !jobRole) {
      return NextResponse.json(
        { error: "Missing required fields: resumeText, jobRole" },
        { status: 400 }
      );
    }

    const result = await analyzeResumeAndJob(resumeText, jobRole, jobDescription, apiKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API /api/analyze error:", error);
    return NextResponse.json(
      { error: "Failed to analyze resume and job requirements" },
      { status: 500 }
    );
  }
}
