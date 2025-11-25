# AI_RULES.md - PhotoSort AI

## Project Overview
PhotoSort AI is a client-side React application that uses AI vision models to automatically analyze and organize photos into semantic albums based on visual content. The app uses OpenRouter as a unified API gateway to access multiple AI vision models with automatic fallback handling.

## Tech Stack

- **Framework**: React 19.2.0 with TypeScript for type-safe component development
- **Build Tool**: Vite 6.2.0 for fast development and optimized production builds
- **Styling**: Tailwind CSS (via CDN) for utility-first responsive design
- **Icons**: lucide-react for consistent, lightweight SVG icons throughout the UI
- **AI/ML**: OpenRouter unified API with automatic multi-model fallback
  - **Primary**: `google/gemini-2.0-flash-exp:free` - Free, fast, good quality
  - **Fallback**: `anthropic/claude-3.5-sonnet` - Reliable, high quality
  - **Emergency**: `openai/gpt-4o` - Industry standard, proven reliability
- **File Processing**: Browser-native Canvas API for image resizing/compression, JSZip for creating downloadable archives
- **State Management**: React useState hooks (no external state library needed)
- **Routing**: None - single-page application with step-based navigation
- **Unique IDs**: uuid package for generating unique photo and album identifiers

## Library Usage Rules

### UI Components & Styling
- **ALWAYS** use Tailwind CSS utility classes for all styling (loaded via CDN in index.html)
- **ALWAYS** use lucide-react for icons - never use other icon libraries or inline SVGs
- **DO NOT** add CSS frameworks like Bootstrap, Material-UI, or Ant Design
- **DO NOT** use component libraries - build custom components with Tailwind

### Image Processing
- **ALWAYS** use the Canvas API for client-side image resizing and format conversion
- **ALWAYS** resize images to 512px max dimension before sending to vision API (reduces tokens and quota issues)
- **ALWAYS** convert images to JPEG format with 0.7 quality for API calls
- **DO NOT** send full-resolution images to any API

### AI/API Integration - OpenRouter Unified Gateway

#### OpenRouter Setup
- **ALWAYS** use the `openai` npm package configured with OpenRouter's base URL
- **ALWAYS** set `baseURL: 'https://openrouter.ai/api/v1'` when initializing the client
- **ALWAYS** use a single `OPENROUTER_API_KEY` environment variable
- **DO NOT** install separate SDKs for Gemini, Claude, or GPT - OpenRouter handles all models

#### Model Selection Strategy
- **ALWAYS** provide an array of fallback models in order of preference (cost → reliability)
- **ALWAYS** start with free/cheap models and fallback to premium models
- **ALWAYS** use the `models` array parameter for automatic fallback handling
- **DO NOT** manually implement retry logic - OpenRouter handles this automatically

#### Recommended Model Fallback Order
```javascript
models: [
  'google/gemini-2.0-flash-exp:free',  // Tier 1: Free, fast
  'anthropic/claude-3.5-sonnet',        // Tier 2: Premium, reliable
  'openai/gpt-4o'                       // Tier 3: Industry standard
]
```

#### Vision API Usage
- **ALWAYS** send images as base64 data URLs in the `image_url` content type
- **ALWAYS** use structured prompts requesting JSON output for consistent tag extraction
- **ALWAYS** handle both text and image content in the messages array
- **ALWAYS** track which model was used via the response's `model` field
- **DO NOT** make parallel API calls - process images sequentially to avoid rate limits

#### Error Handling
- **ALWAYS** implement exponential backoff for transient errors
- **ALWAYS** log which model successfully processed each image
- **ALWAYS** provide user feedback when fallback models are being used
- **ALWAYS** collect failed images for manual retry
- **DO NOT** assume the primary model will always be available

#### API Key Management
- **ALWAYS** store the OpenRouter API key in environment variable: `OPENROUTER_API_KEY`
- **ALWAYS** check for API key availability before making requests
- **ALWAYS** provide clear error messages when API key is missing
- **DO NOT** hardcode API keys in source files

### File Handling
- **ALWAYS** use JSZip for creating downloadable ZIP archives of organized photos
- **ALWAYS** use URL.createObjectURL for image previews and revoke with URL.revokeObjectURL to prevent memory leaks
- **DO NOT** load entire files into memory unnecessarily

### State & Data Flow
- **ALWAYS** use React useState for component state management
- **ALWAYS** keep photo metadata (PhotoFile type) separate from album organization (Album type)
- **ALWAYS** track which AI model was used for each photo analysis (add `modelUsed` field)
- **DO NOT** add Redux, Zustand, or other state management libraries unless the app grows significantly more complex

### Code Organization
- **ALWAYS** place utility functions in `/services` directory (imageUtils, openRouterService, clusteringService)
- **ALWAYS** place React components in `/components` directory
- **ALWAYS** define TypeScript types in `types.ts` at the root level
- **ALWAYS** create a single `openRouterService.ts` that handles all vision API calls
- **DO NOT** mix business logic with UI components - keep them separated

### Performance & UX
- **ALWAYS** show real-time processing progress with visual feedback
- **ALWAYS** implement throttling/rate limiting to respect API quotas
- **ALWAYS** provide retry mechanisms for failed photos
- **ALWAYS** inform users when fallback models are being used
- **DO NOT** block the UI during processing - use async/await properly

### Environment & Configuration
- **ALWAYS** load the OpenRouter API key from environment variable (process.env.OPENROUTER_API_KEY)
- **ALWAYS** use Vite's environment variable system (defined in vite.config.ts)
- **ALWAYS** gracefully handle missing API keys with clear error messages
- **DO NOT** hardcode API keys or sensitive data in source files

## Key Architectural Decisions

1. **Client-Side Only**: All processing happens in the browser - no backend server required
2. **Sequential Processing**: Photos are analyzed one at a time to avoid API rate limits
3. **Adaptive Throttling**: Delay between API calls dynamically adjusts based on success/failure rates
4. **OpenRouter Unified Gateway**: Single API key with automatic multi-model fallback eliminates complex SDK management
5. **Smart Clustering**: Photos are grouped into albums of ~20 images using tag-based clustering with merge logic
6. **Graceful Degradation**: Failed photos are collected in a separate album with retry capability
7. **Model Tracking**: Each photo tracks which AI model successfully analyzed it for debugging and cost analysis

## Adding New Features

- **New UI Components**: Create in `/components`, use Tailwind + lucide-react
- **New Processing Logic**: Add to `/services` with proper TypeScript types
- **New Photo Metadata**: Extend the `PhotoFile` interface in `types.ts`
- **New Album Logic**: Modify `clusteringService.ts` with clear comments explaining the algorithm
- **New AI Models**: Add to the `models` array in `openRouterService.ts` - no new SDK needed

## OpenRouter Multi-Model Architecture

### Why OpenRouter?
- **Single API Key**: One key for all AI providers (Gemini, Claude, GPT-4, etc.)
- **Automatic Fallback**: Built-in retry logic across multiple models
- **Cost Optimization**: Automatically routes to cheapest available model
- **OpenAI-Compatible**: Use familiar OpenAI SDK with different base URL
- **Unified Billing**: One invoice for all AI usage across providers

### Model Tier Strategy

#### Tier 1 (Primary): Gemini 2.0 Flash (Free)
- **Model ID**: `google/gemini-2.0-flash-exp:free`
- **Use Case**: Default for all image analysis
- **Advantages**: Free, fast, good quality
- **Cost**: $0.00 per request

#### Tier 2 (Fallback): Claude 3.5 Sonnet
- **Model ID**: `anthropic/claude-3.5-sonnet`
- **Use Case**: When Gemini quota is exhausted or fails
- **Advantages**: Highly reliable, excellent vision capabilities
- **Cost**: ~$3 per 1M input tokens

#### Tier 3 (Emergency): GPT-4o
- **Model ID**: `openai/gpt-4o`
- **Use Case**: When both Gemini and Claude are unavailable
- **Advantages**: Industry standard, proven reliability
- **Cost**: ~$2.50 per 1M input tokens

### Fallback Flow
```
1. OpenRouter tries Gemini (free tier)
2. If fails → Automatically tries Claude
3. If fails → Automatically tries GPT-4o
4. If all fail → Mark photo as error, allow manual retry
5. Response includes which model was actually used
```

### Implementation Pattern
```typescript
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
});

const response = await openrouter.chat.completions.create({
  models: [
    'google/gemini-2.0-flash-exp:free',
    'anthropic/claude-3.5-sonnet',
    'openai/gpt-4o'
  ],
  messages: [{
    role: 'user',
    content: [
      { type: 'text', text: 'Analyze this image and return 5-10 tags...' },
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }
    ]
  }],
  response_format: { type: 'json_object' }
});

// Track which model was actually used
const modelUsed = response.model;
```

## DO NOT

- Add multiple AI provider SDKs (OpenRouter handles all providers)
- Manually implement fallback logic (OpenRouter does this automatically)
- Install UI component libraries (shadcn/ui, MUI, etc.) - build custom with Tailwind
- Add routing libraries (React Router, etc.) - use step-based navigation
- Make the app more complex than necessary - keep it simple and focused
- Ignore API quota limits - always implement proper throttling
- Skip tracking which model was used - this is critical for debugging and cost analysis

## Cost Optimization Guidelines

- **ALWAYS** prefer free models when available (Gemini free tier)
- **ALWAYS** resize images to 512px before sending to API
- **ALWAYS** track API usage per model for cost analysis
- **ALWAYS** implement aggressive throttling to avoid unnecessary API calls
- **ALWAYS** use OpenRouter's automatic routing to minimize costs
- **DO NOT** send full-resolution images to any API
- **DO NOT** make unnecessary API calls - cache results when possible

## OpenRouter-Specific Best Practices

- **ALWAYS** include your app name in headers: `HTTP-Referer: https://your-app.com`
- **ALWAYS** monitor which models are being used via response tracking
- **ALWAYS** check OpenRouter's model availability before deploying
- **ALWAYS** use the `models` array for automatic fallback instead of manual retry logic
- **DO NOT** assume all models support the same features (check model capabilities)
- **DO NOT** hardcode model IDs - make them configurable for easy updates