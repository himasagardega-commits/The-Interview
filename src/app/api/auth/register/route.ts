import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { name, email, password, role: requestedRole } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    let role = "CANDIDATE";
    let isApproved = false;

    if (requestedRole === "MANAGER") {
      role = "MANAGER";
    }

    if (email.toLowerCase() === "admin@theinterview.com") {
      role = "ADMIN";
      isApproved = true;
    }

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as any,
        isApproved,
      },
    });

    // Strip out the password hash before sending the response
    const { passwordHash: _, ...safeUser } = newUser;

    return NextResponse.json({
      success: true,
      message: "User registered successfully",
      user: safeUser,
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
