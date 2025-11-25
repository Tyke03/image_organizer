# AI_RULES.md - PhotoSort AI

## Project Overview
PhotoSort AI is a client-side React application that uses AI vision models to automatically analyze and organize photos into semantic albums based on visual content. The app implements a multi-tier fallback system to ensure reliability even when primary APIs hit quota limits.

## Tech Stack

- **Framework**: React 19.2.0 with TypeScript for type-safe component development
- **Build Tool**: Vite 6.2.0 for fast development and optimized production builds
- **Styling**: Tailwind CSS (via CDN) for utility-first responsive design
- **Icons**: lucide-react for consistent, lightweight SVG icons throughout the UI
- **AI/ML (Multi-Tier)**: 
  - **Primary**: @google/genai (Gemini 2.5 Flash) - Fast, cost-effective, good quality
  - **Fallback**: openai (GPT-4 Vision) - Reliable, proven, handles high load
  - **Emergency**: replicate (LLaVA/BLIP) - Open source, pay-per-use backup
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
- **ALWAYS** resize images to 512px max dimension before sending to any vision API (reduces tokens and quota issues)
- **ALWAYS** convert images to JPEG format with 0.7 quality for API calls
- **DO NOT** send full-resolution images to any API

### AI/API Integration - Multi-Model Fallback System

#### Primary Model: Gemini 2.5 Flash
- **ALWAYS** use @google/genai package as the first choice
- **ALWAYS** implement exponential backoff with retry logic for API failures
- **ALWAYS** handle 429 (quota exceeded) errors by switching to fallback model
- **ALWAYS** use structured JSON output with responseSchema for consistent tag extraction
- **DO NOT** make parallel API calls - process images sequentially to avoid rate limits

#### Fallback Model: OpenAI GPT-4 Vision
- **ALWAYS** install and configure `openai` package as backup
- **ALWAYS** switch to OpenAI when Gemini returns 429 errors or fails repeatedly
- **ALWAYS** use the same prompt structure and tag extraction format
- **ALWAYS** track which model was used for each photo (add `modelUsed` field to PhotoFile type)
- **DO NOT** use OpenAI as primary due to higher cost

#### Emergency Backup: Replicate (Open Source Models)
- **ALWAYS** install and configure `replicate` package as final fallback
- **ALWAYS** use models like LLaVA-1.5 or Salesforce BLIP for vision tasks
- **ALWAYS** implement this as last resort when both Gemini and OpenAI fail
- **ALWAYS** expect slower response times due to cold starts
- **DO NOT** rely on this as primary due to inconsistent quality

#### Fallback Logic Implementation Rules
- **ALWAYS** implement a `VisionModelService` abstraction layer that handles model switching
- **ALWAYS** track failure counts per model to avoid repeatedly hitting failed services
- **ALWAYS** log which model was used for each successful analysis
- **ALWAYS** provide user feedback when switching models (e.g., "Using backup AI model...")
- **ALWAYS** reset to primary model after successful processing batch
- **DO NOT** switch models mid-batch unless absolutely necessary

#### API Key Management
- **ALWAYS** store all API keys in environment variables:
  - `GEMINI_API_KEY` (primary)
  - `OPENAI_API_KEY` (fallback)
  - `REPLICATE_API_TOKEN` (emergency)
- **ALWAYS** check for API key availability before attempting to use a model
- **ALWAYS** provide clear error messages when API keys are missing
- **DO NOT** hardcode any API keys in source files

### File Handling
- **ALWAYS** use JSZip for creating downloadable ZIP archives of organized photos
- **ALWAYS** use URL.createObjectURL for image previews and revoke with URL.revokeObjectURL to prevent memory leaks
- **DO NOT** load entire files into memory unnecessarily

### State & Data Flow
- **ALWAYS** use React useState for component state management
- **ALWAYS** keep photo metadata (PhotoFile type) separate from album organization (Album type)
- **ALWAYS** track which AI model was used for each photo analysis
- **DO NOT** add Redux, Zustand, or other state management libraries unless the app grows significantly more complex

### Code Organization
- **ALWAYS** place utility functions in `/services` directory (imageUtils, geminiService, openaiService, replicateService, visionModelService)
- **ALWAYS** place React components in `/components` directory
- **ALWAYS** define TypeScript types in `types.ts` at the root level
- **ALWAYS** create a unified `visionModelService.ts` that orchestrates fallback logic
- **DO NOT** mix business logic with UI components - keep them separated

### Performance & UX
- **ALWAYS** show real-time processing progress with visual feedback
- **ALWAYS** implement throttling/rate limiting to respect API quotas
- **ALWAYS** provide retry mechanisms for failed photos
- **ALWAYS** inform users when switching to backup AI models
- **DO NOT** block the UI during processing - use async/await properly

### Environment & Configuration
- **ALWAYS** load all AI API keys from environment variables (process.env.GEMINI_API_KEY, process.env.OPENAI_API_KEY, process.env.REPLICATE_API_TOKEN)
- **ALWAYS** use Vite's environment variable system (defined in vite.config.ts)
- **ALWAYS** gracefully handle missing API keys with clear error messages
- **DO NOT** hardcode API keys or sensitive data in source files

## Key Architectural Decisions

1. **Client-Side Only**: All processing happens in the browser - no backend server required
2. **Sequential Processing**: Photos are analyzed one at a time to avoid API rate limits
3. **Adaptive Throttling**: Delay between API calls dynamically adjusts based on success/failure rates
4. **Multi-Tier AI Fallback**: Three-layer redundancy (Gemini → OpenAI → Replicate) ensures app never completely fails
5. **Smart Clustering**: Photos are grouped into albums of ~20 images using tag-based clustering with merge logic
6. **Graceful Degradation**: Failed photos are collected in a separate album with retry capability
7. **Model Tracking**: Each photo tracks which AI model successfully analyzed it for debugging and cost analysis

## Adding New Features

- **New UI Components**: Create in `/components`, use Tailwind + lucide-react
- **New Processing Logic**: Add to `/services` with proper TypeScript types
- **New Photo Metadata**: Extend the `PhotoFile` interface in `types.ts`
- **New Album Logic**: Modify `clusteringService.ts` with clear comments explaining the algorithm
- **New AI Models**: Add new service file in `/services` and integrate into `visionModelService.ts` fallback chain

## Multi-Model Fallback Architecture

### Tier 1 (Primary): Gemini 2.5 Flash
- **Use Case**: Default for all image analysis
- **Advantages**: Fast, cost-effective, good quality
- **Quota Handling**: Exponential backoff, switch to Tier 2 on repeated 429 errors

### Tier 2 (Fallback): OpenAI GPT-4 Vision
- **Use Case**: When Gemini quota is exhausted or fails repeatedly
- **Advantages**: Highly reliable, proven uptime, handles high load
- **Cost**: Higher per-request cost, use only when necessary

### Tier 3 (Emergency): Replicate (LLaVA/BLIP)
- **Use Case**: When both Gemini and OpenAI are unavailable
- **Advantages**: Open source, pay-per-use, no hard quotas
- **Limitations**: Slower cold starts, less consistent quality

### Fallback Decision Tree
```
1. Try Gemini with exponential backoff (max 3 retries)
2. If 429 error or repeated failures → Switch to OpenAI
3. If OpenAI fails → Try Replicate
4. If all fail → Mark photo as error, allow manual retry
5. After successful batch → Reset to Gemini for next batch
```

## DO NOT

- Add server-side code or API routes (this is a pure client-side app)
- Install UI component libraries (shadcn/ui, MUI, etc.) - build custom with Tailwind
- Add routing libraries (React Router, etc.) - use step-based navigation
- Make the app more complex than necessary - keep it simple and focused
- Use multiple AI models simultaneously (sequential fallback only)
- Ignore API quota limits - always implement proper throttling and fallback logic
- Skip tracking which model was used - this is critical for debugging and cost analysis

## Cost Optimization Guidelines

- **ALWAYS** prefer Gemini 2.5 Flash when available (lowest cost)
- **ALWAYS** resize images to 512px before sending to any API
- **ALWAYS** track API usage per model for cost analysis
- **ALWAYS** implement aggressive throttling to avoid unnecessary API calls
- **DO NOT** use premium models (GPT-4, Claude) unless fallback is necessary
- **DO NOT** send full-resolution images to any API