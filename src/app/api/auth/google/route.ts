import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { OAuth2Client } from "google-auth-library";

// Initialize OAuth client
const client = new OAuth2Client(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

export async function POST(req: Request) {
  try {
    const { credential } = await req.json();

    if (!credential) {
      return NextResponse.json({ error: "No credential provided" }, { status: 400 });
    }

    // Verify the Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Invalid Google token" }, { status: 400 });
    }

    const { email, name, picture } = payload;

    // Find or create user in the database
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create a new user since they don't exist
      user = await prisma.user.create({
        data: {
          email,
          name: name || "Google User",
          role: "CANDIDATE", // default role
          isApproved: false,
        },
      });
    }

    // We don't send the passwordHash to the client
    const { passwordHash: _, ...safeUser } = user;

    // Also include picture for the avatar
    return NextResponse.json({
      success: true,
      message: "Logged in with Google successfully",
      user: {
        ...safeUser,
        picture, // Include google profile picture
      },
    });
  } catch (error: any) {
    console.error("Google Login error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
