
import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MAX_RETRIES = 5; 
const BASE_DELAY_MS = 2000;
const QUOTA_ERROR_DELAY_MS = 30000; // Wait 30 seconds if we hit a 429

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeImage = async (base64Image: string): Promise<string[]> => {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      const model = 'gemini-2.5-flash';
      
      // Prompt optimized for token usage and clarity
      const promptText = `
        Return 5-10 tags for this image in a JSON array.
        Mix of broad categories (e.g. 'outdoors', 'anime') and specific subjects (e.g. 'cat', 'beach').
        Lowercase only.
      `;

      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image
              }
            },
            {
              text: promptText
            }
          ]
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini");
      
      const tags = JSON.parse(text) as string[];
      const uniqueTags = Array.from(new Set(tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0)));
      
      if (uniqueTags.length === 0) return []; 
      
      return uniqueTags;

    } catch (error: any) {
      attempt++;
      
      const errorMessage = error.message || JSON.stringify(error);
      console.warn(`Gemini analysis attempt ${attempt} failed:`, errorMessage);
      
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED');
      const isRetryable = isQuotaError || errorMessage.includes('503') || errorMessage.includes('fetch failed');
      
      if (attempt >= MAX_RETRIES || !isRetryable) {
        console.error("Final Gemini Error:", error);
        throw error; // Re-throw so App can adjust global throttling
      }
      
      // Smart Backoff
      let waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      
      if (isQuotaError) {
        console.warn(`Quota exceeded (429). Waiting ${QUOTA_ERROR_DELAY_MS/1000} seconds before retry...`);
        waitTime = QUOTA_ERROR_DELAY_MS + (Math.random() * 5000);
      } else {
        waitTime += Math.random() * 1000;
      }

      await delay(waitTime);
    }
  }
  return [];
};
