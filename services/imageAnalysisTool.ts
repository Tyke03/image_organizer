import OpenAI from 'openai';

// Initialize OpenRouter client (OpenAI-compatible)
const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://photosort-ai.app', // Optional: helps OpenRouter track usage
  }
});

// Model fallback order: Free → Premium → Industry Standard
const VISION_MODELS = [
  'google/gemini-2.0-flash-exp:free',  // Tier 1: Free, fast
  'anthropic/claude-3.5-sonnet',        // Tier 2: Premium, reliable
  'openai/gpt-4o'                       // Tier 3: Industry standard
];

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Analyzes an image using OpenRouter's multi-model vision API with automatic fallback.
 * Returns a description and an array of semantic tags describing the image content.
 * 
 * @param base64Image - Base64 encoded JPEG image (512px max dimension)
 * @returns Object containing description, tags, and the model used.
 */
export const analyzeImage = async (base64Image: string): Promise<{ description: string, tags: string[], modelUsed: string }> => {
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    try {
      // OpenRouter extends OpenAI API with 'models' array for automatic fallback
      const response = await (openrouter.chat.completions.create as any)({
        model: VISION_MODELS[0], // Primary model (required by OpenAI SDK)
        models: VISION_MODELS, // OpenRouter-specific: tries these in order automatically
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this image. Provide a concise, single-sentence description of the main subject and context. Then, return 5-10 descriptive tags as a JSON array.
                       Mix broad categories (e.g., 'outdoors', 'portrait') with specific subjects (e.g., 'cat', 'beach').
                       Return ONLY a JSON object with two keys: "description" (string) and "tags" (array of strings). All tags should be lowercase.
                       Example: {"description": "A serene beach at sunset with palm trees.", "tags": ["beach", "sunset", "ocean", "tropical", "palm trees"]}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300, // Increased max_tokens to accommodate description + tags
        temperature: 0.3
      });

      const content = response.choices[0]?.message?.content;
      const modelUsed = response.model || 'unknown';
      
      if (!content) {
        throw new Error('Empty response from OpenRouter');
      }

      // Parse JSON response
      const parsed = JSON.parse(content);
      const description = (parsed.description || '') as string;
      const tags = (parsed.tags || []) as string[];
      
      // Clean and deduplicate tags
      const uniqueTags = Array.from(
        new Set(tags.map(t => t.toLowerCase().trim()).filter(t => t.length > 0))
      );

      if (description.length === 0 && uniqueTags.length === 0) {
        console.warn('No description or tags extracted from response');
        return { description: '', tags: [], modelUsed };
      }

      console.log(`✓ Image analyzed successfully using ${modelUsed}`);
      return { description, tags: uniqueTags, modelUsed };

    } catch (error: any) {
      attempt++;
      
      const errorMessage = error.message || JSON.stringify(error);
      console.warn(`OpenRouter analysis attempt ${attempt} failed:`, errorMessage);
      
      // Check for retryable errors
      const isQuotaError = errorMessage.includes('429') || errorMessage.includes('quota');
      const isServerError = errorMessage.includes('503') || errorMessage.includes('500');
      const isRetryable = isQuotaError || isServerError || errorMessage.includes('fetch failed');
      
      if (attempt >= MAX_RETRIES || !isRetryable) {
        console.error('Final OpenRouter error after retries:', error);
        throw error; // Re-throw so App can handle it
      }
      
      // Exponential backoff with jitter
      let waitTime = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      
      if (isQuotaError) {
        console.warn(`Quota limit detected. Waiting ${waitTime/1000}s before retry...`);
        waitTime += Math.random() * 5000; // Add jitter
      }

      await delay(waitTime);
    }
  }

  return { description: '', tags: [], modelUsed: 'failed' };
};

/**
 * Check if OpenRouter API key is configured
 */
export const isConfigured = (): boolean => {
  return !!process.env.OPENROUTER_API_KEY;
};

/**
 * Get available vision models (for debugging/monitoring)
 */
export const getAvailableModels = (): string[] => {
  return [...VISION_MODELS];
};