import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { audioBase64, mimeType } = await req.json();

    if (!audioBase64) {
      return NextResponse.json({ error: "No audio data provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Gemini API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash as it is fast and supports audio natively
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Transcribe this audio clip exactly as spoken. Do not add any commentary, formatting, or conversational text. Output ONLY the raw transcription.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: mimeType || "audio/webm",
          data: audioBase64,
        },
      },
    ]);

    const transcription = result.response.text().trim();

    return NextResponse.json({ text: transcription });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json(
      { error: "Failed to transcribe audio. Please try again." },
      { status: 500 }
    );
  }
}
