# AI_RULES.md - PhotoSort AI

## Project Overview
PhotoSort AI is a client-side React application that uses Google's Gemini 2.5 Flash Vision API to automatically analyze and organize photos into semantic albums based on visual content.

## Tech Stack

- **Framework**: React 19.2.0 with TypeScript for type-safe component development
- **Build Tool**: Vite 6.2.0 for fast development and optimized production builds
- **Styling**: Tailwind CSS (via CDN) for utility-first responsive design
- **Icons**: lucide-react for consistent, lightweight SVG icons throughout the UI
- **AI/ML**: @google/genai (Gemini 2.5 Flash) for image analysis and semantic tagging
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
- **ALWAYS** resize images to 512px max dimension before sending to Gemini API (reduces tokens and quota issues)
- **ALWAYS** convert images to JPEG format with 0.7 quality for API calls
- **DO NOT** send full-resolution images to the API

### AI/API Integration
- **ALWAYS** use @google/genai package for Gemini API calls
- **ALWAYS** implement exponential backoff with retry logic for API failures
- **ALWAYS** handle 429 (quota exceeded) errors with aggressive throttling (30+ second delays)
- **ALWAYS** use structured JSON output with responseSchema for consistent tag extraction
- **DO NOT** make parallel API calls - process images sequentially to avoid rate limits

### File Handling
- **ALWAYS** use JSZip for creating downloadable ZIP archives of organized photos
- **ALWAYS** use URL.createObjectURL for image previews and revoke with URL.revokeObjectURL to prevent memory leaks
- **DO NOT** load entire files into memory unnecessarily

### State & Data Flow
- **ALWAYS** use React useState for component state management
- **ALWAYS** keep photo metadata (PhotoFile type) separate from album organization (Album type)
- **DO NOT** add Redux, Zustand, or other state management libraries unless the app grows significantly more complex

### Code Organization
- **ALWAYS** place utility functions in `/services` directory (imageUtils, geminiService, clusteringService)
- **ALWAYS** place React components in `/components` directory
- **ALWAYS** define TypeScript types in `types.ts` at the root level
- **DO NOT** mix business logic with UI components - keep them separated

### Performance & UX
- **ALWAYS** show real-time processing progress with visual feedback
- **ALWAYS** implement throttling/rate limiting to respect API quotas
- **ALWAYS** provide retry mechanisms for failed photos
- **DO NOT** block the UI during processing - use async/await properly

### Environment & Configuration
- **ALWAYS** load the Gemini API key from environment variables (process.env.GEMINI_API_KEY)
- **ALWAYS** use Vite's environment variable system (defined in vite.config.ts)
- **DO NOT** hardcode API keys or sensitive data in source files

## Key Architectural Decisions

1. **Client-Side Only**: All processing happens in the browser - no backend server required
2. **Sequential Processing**: Photos are analyzed one at a time to avoid API rate limits
3. **Adaptive Throttling**: Delay between API calls dynamically adjusts based on success/failure rates
4. **Smart Clustering**: Photos are grouped into albums of ~20 images using tag-based clustering with merge logic
5. **Graceful Degradation**: Failed photos are collected in a separate album with retry capability

## Adding New Features

- **New UI Components**: Create in `/components`, use Tailwind + lucide-react
- **New Processing Logic**: Add to `/services` with proper TypeScript types
- **New Photo Metadata**: Extend the `PhotoFile` interface in `types.ts`
- **New Album Logic**: Modify `clusteringService.ts` with clear comments explaining the algorithm

## DO NOT

- Add server-side code or API routes (this is a pure client-side app)
- Install UI component libraries (shadcn/ui, MUI, etc.) - build custom with Tailwind
- Add routing libraries (React Router, etc.) - use step-based navigation
- Make the app more complex than necessary - keep it simple and focused