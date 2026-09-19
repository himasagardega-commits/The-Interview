import { NextResponse } from "next/server";
import { generateInterviewReport } from "@/lib/evaluationEngine";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { session, apiKey } = body;

    if (!session || !session.resumeData || !session.targetRole) {
      return NextResponse.json(
        { error: "Invalid or incomplete session provided" },
        { status: 400 }
      );
    }

    const report = await generateInterviewReport(session, apiKey);
    return NextResponse.json({ report });
  } catch (error) {
    console.error("API /api/report error:", error);
    return NextResponse.json(
      { error: "Failed to generate comprehensive interview report" },
      { status: 500 }
    );
  }
}
