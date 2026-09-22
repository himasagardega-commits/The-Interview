import { NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("video") as Blob | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      mkdirSync(uploadsDir, { recursive: true });
    }

    // Save with unique name
    const filename = `interview_${Date.now()}.webm`;
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const videoUrl = `/uploads/${filename}`;

    return NextResponse.json({ success: true, videoUrl });
  } catch (error) {
    console.error("Video upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
