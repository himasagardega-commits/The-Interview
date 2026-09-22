import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { session, userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const interviewSession = await prisma.interviewSession.create({
      data: {
        userId,
        targetRole: session.targetRole,
        resumeText: session.resumeData.rawText || "",
        videoUrl: session.videoUrl || null,
        overallScore: session.finalReport?.overallScore || 0,
        recommendation: session.finalReport?.recommendation || "N/A",
        evaluations: {
          create: session.answerHistory.map((ans: any) => ({
            questionText: ans.questionText || "N/A",
            candidateAnswer: ans.candidateAnswer || "",
            score: ans.score || 0,
            feedback: ans.feedback || "",
            idealModelAnswer: ans.idealModelAnswer || "",
          })),
        },
      },
    });

    return NextResponse.json({ success: true, interviewSession });
  } catch (error) {
    console.error("Error saving session to DB:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const candidateId = url.searchParams.get("candidateId");

    let whereClause = {};
    if (candidateId) {
      whereClause = { userId: candidateId };
    }

    const sessions = await prisma.interviewSession.findMany({
      where: whereClause,
      include: {
        evaluations: true,
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
