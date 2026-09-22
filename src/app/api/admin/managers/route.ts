import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const managers = await prisma.user.findMany({
      where: { role: "MANAGER" },
      select: {
        id: true,
        name: true,
        email: true,
        isApproved: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ managers });
  } catch (error) {
    console.error("Error fetching managers:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
