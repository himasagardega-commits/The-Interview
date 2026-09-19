import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Executes a structured JSON prompt exclusively with Google Gemini (gemini-3.6-flash), with automatic fallback
 * to the intelligent deterministic evaluator engine if no API key is provided or if network/quota error occurs.
 */
export interface AiCallOptions {
  temperature?: number;
  presencePenalty?: number;
  model?: string;
}

// Track models that have recently returned 429 quota exhaustion to prevent repeated lag
const rateLimitedModels = new Map<string, number>();

export async function callAiJson<T>(
  prompt: string,
  systemInstruction: string,
  fallbackFn: () => T,
  customApiKey?: string,
  options?: AiCallOptions
): Promise<T> {
  const rawKey =
    process.env.GEMINI_API_KEY?.trim() ||
    customApiKey?.trim() ||
    process.env.NEXT_PUBLIC_AI_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim();

  if (!rawKey || rawKey === "") {
    return fallbackFn();
  }

  const cleanKey = rawKey.trim();

  // -------------------------------------------------------------
  // EXCLUSIVE AI ENGINE: Google Gemini
  // -------------------------------------------------------------
  try {
    const genAI = new GoogleGenerativeAI(cleanKey);

    const runGemini = async (modelName: string): Promise<T> => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: options?.temperature ?? 0.3,
        },
        systemInstruction,
      });

      // Strict 4500ms timeout per model attempt
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`[Google Gemini] Model ${modelName} call timed out after 4500ms`));
        }, 4500);
      });

      const generatePromise = (async () => {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        let cleaned = responseText.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
        }
        return JSON.parse(cleaned) as T;
      })();

      return Promise.race([generatePromise, timeoutPromise]);
    };

    // Fast, reliable models with highest quota availability first
    const baseModels = [
      "gemini-flash-lite-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
    ];

    const candidateModels = Array.from(
      new Set(options?.model ? [options.model, ...baseModels] : baseModels)
    );

    const now = Date.now();
    const activeCandidates = candidateModels.filter(
      (m) => (rateLimitedModels.get(m) || 0) <= now
    );
    const modelsToTry = activeCandidates.length > 0 ? activeCandidates : candidateModels;

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Google Gemini] Requesting model: ${modelName}...`);
        const res = await runGemini(modelName);
        return res;
      } catch (err: any) {
        const is429 =
          err?.status === 429 ||
          String(err?.message || "").includes("429") ||
          String(err?.message || "").toLowerCase().includes("quota");
        if (is429) {
          rateLimitedModels.set(modelName, Date.now() + 60000); // 60s cooldown
        }
        console.warn(
          `[Google Gemini] Model ${modelName} issue: ${err?.status || err?.message?.split("\n")[0]}, trying next model...`
        );
      }
    }
  } catch (error) {
    console.warn("[Google Gemini] API call exception, falling back to local evaluator:", error);
  }

  return fallbackFn();
}

// Keep backwards-compatible alias
export const callGeminiJson = callAiJson;
