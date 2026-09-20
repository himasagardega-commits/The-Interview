import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    return NextResponse.json({
      exists: !!user,
    });
  } catch (error: any) {
    console.error("Check user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
