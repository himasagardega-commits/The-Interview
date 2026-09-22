import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const sessions = await prisma.interviewSession.findMany({
      include: {
        user: {
          select: { name: true, email: true },
        },
        evaluations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
