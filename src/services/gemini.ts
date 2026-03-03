import { GoogleGenAI } from "@google/genai";

export type ImageGenerationConfig = {
  model: "gemini-2.5-flash-image" | "gemini-3.1-flash-image-preview";
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
  imageSize?: "512px" | "1K" | "2K" | "4K";
};

export type GeneratedImage = {
  id: string;
  prompt: string;
  url: string;
  timestamp: number;
  config: ImageGenerationConfig;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateImage(
  prompt: string, 
  config: ImageGenerationConfig, 
  retryCount = 0
): Promise<string> {
  // Use API_KEY if available (from user selection), otherwise fallback to GEMINI_API_KEY
  const apiKey = (process.env as any).API_KEY || process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const parts: any[] = [];
    
    // Always include a text part, even if empty, but prefer non-empty
    parts.push({ text: prompt || "Generate image" });

    // Validate aspect ratio for model
    const restrictedRatios = ["1:4", "1:8", "4:1", "8:1"];
    let aspectRatio = config.aspectRatio;
    if (config.model === "gemini-2.5-flash-image" && restrictedRatios.includes(aspectRatio)) {
      console.warn(`Aspect ratio ${aspectRatio} not supported by ${config.model}. Falling back to 1:1.`);
      aspectRatio = "1:1";
    }

    const response = await ai.models.generateContent({
      model: config.model,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          ...(config.imageSize && { imageSize: config.imageSize }),
        },
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("No candidates returned from model. This might be due to safety filters.");
    }

    if (candidate.finishReason === "SAFETY") {
      throw new Error("Generation blocked by safety filters. Please try a different prompt.");
    }

    for (const part of candidate.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response. Finish reason: " + candidate.finishReason);
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    
    // Handle Rate Limiting (429) with exponential backoff
    if (error.message?.includes("429") || error.message?.includes("RESOURCE_EXHAUSTED")) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
        console.log(`Rate limited. Retrying in ${delay}ms... (Attempt ${retryCount + 1}/3)`);
        await sleep(delay);
        return generateImage(prompt, config, retryCount + 1);
      }
      throw new Error("RATE_LIMIT_EXCEEDED");
    }

    // Rethrow with a more descriptive message if it's a permission error
    if (error.message?.includes("403") || error.message?.includes("permission")) {
      throw new Error("AUTH_REQUIRED");
    }
    throw error;
  }
}
