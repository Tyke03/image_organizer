<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PhotoSort AI - Intelligent Photo Organization

Automatically organize and group your photos into semantic albums using AI vision models. Upload a folder, get it sorted by visual content - all powered by OpenRouter's unified AI gateway. The application is now structured into modular tools for better development and testing.

## Features

- 🤖 **Multi-Model AI Vision**: Automatic fallback across Gemini, Claude, and GPT-4 via OpenRouter.
- 🆓 **Free Tier Available**: Uses free Gemini model by default.
- 📦 **Smart Clustering**: Groups photos into ~20-image albums based on visual similarity.
- 🔄 **Automatic Retry**: Failed photos can be retried with one click.
- 💾 **ZIP Export**: Download organized albums as a ZIP file.
- 🎨 **Beautiful UI**: Modern, responsive interface built with Tailwind CSS.
- 🔒 **Privacy First**: All processing happens in your browser.

## Modular Workflow Tools

The application's core AI functionalities are now separated into distinct, independently useful tools:

### 1. Image Analysis & Tagging Tool (`services/imageAnalysisTool.ts`)
-   **Purpose:** Analyzes a single image using OpenRouter's multi-model vision API to extract a concise description and relevant tags.
-   **Inputs:** Base64 encoded JPEG image data.
-   **Outputs:** An object containing the image `description`, `tags` (array of strings), and the `modelUsed` for analysis.
-   This tool handles all direct interaction with the OpenRouter API, including model fallback and retries.

### 2. Image Grouping & Clustering Tool (`services/clusteringService.ts`)
-   **Purpose:** Organizes a collection of images into distinct albums based on their extracted descriptions and tags.
-   **Inputs:** A list of image metadata (including `id`, `description`, `tags`) from the Image Analysis & Tagging Tool.
-   **Outputs:** A list of `Album` objects and any `ungrouped_image_ids`.
-   This tool runs entirely client-side, applying clustering algorithms to group semantically related images.

## Tech Stack

- **Frontend**: React 19.2.0 + TypeScript + Vite
- **Styling**: Tailwind CSS (via CDN)
- **AI**: OpenRouter unified API (Gemini, Claude, GPT-4)
- **Icons**: lucide-react

## Getting Started

### Prerequisites

- Node.js 18+ installed
- OpenRouter API key ([Get one here](https://openrouter.ai/keys))

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd photosort-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env.local` file and add your OpenRouter API key:
   ```bash
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Upload**: Drag and drop a folder of photos or select multiple images.
2. **AI Analysis (Tool 1)**: Each photo is analyzed by the `Image Analysis & Tagging Tool` using OpenRouter's vision models (Gemini, Claude, GPT-4 fallback). It extracts a description and tags.
3. **Smart Clustering (Tool 2)**: The `Image Grouping & Clustering Tool` then processes the descriptions and tags to group photos into semantic albums.
4. **Download**: Export organized albums as a ZIP file.

## OpenRouter Configuration

PhotoSort AI uses OpenRouter as a unified gateway to access multiple AI vision models. This provides:

- ✅ Single API key for all models
- ✅ Automatic fallback handling
- ✅ Cost optimization (free tier available)
- ✅ No need to manage multiple SDKs

### Supported Models

The app automatically tries models in this order:

1. `google/gemini-2.0-flash-exp:free` - Free, fast, good quality
2. `anthropic/claude-3.5-sonnet` - Premium, highly reliable
3. `openai/gpt-4o` - Industry standard fallback

## Project Structure

```
photosort-ai/
├── src/
│   ├── components/          # React components
│   │   ├── DropZone.tsx
│   │   ├── ProcessingView.tsx
│   │   └── ResultsView.tsx
│   ├── services/            # Business logic (modular tools)
│   │   ├── imageUtils.ts    # Image processing utilities
│   │   ├── imageAnalysisTool.ts  # Tool 1: AI vision API interaction
│   │   └── clusteringService.ts  # Tool 2: Album organization logic
│   ├── types.ts             # TypeScript types
│   └── App.tsx              # Main app component
├── AI_RULES.md              # Development guidelines
├── .env.local               # Environment variables (create this)
└── package.json
```

## Development

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Cost Optimization

- Images are automatically resized to 512px before analysis (reduces API costs).
- Free Gemini model is used by default.
- Fallback to premium models only when necessary.
- Sequential processing prevents rate limit issues.

## Troubleshooting

### "API key not configured" error
- Make sure you've created `.env.local` with your OpenRouter API key.
- Restart the dev server after adding the key.

### Photos failing to process
- Check your OpenRouter account has credits/quota.
- The app will automatically try fallback models.
- Use the "Retry Failed Photos" button to reprocess errors.

### Slow processing
- This is normal - images are processed sequentially to avoid rate limits.
- The app automatically adjusts speed based on API response times.

## Contributing

Contributions are welcome! Please read [AI_RULES.md](AI_RULES.md) for development guidelines.

## License

MIT

## Acknowledgments

- Powered by [OpenRouter](https://openrouter.ai)
- Built with [React](https://react.dev) and [Vite](https://vitejs.dev)
- Icons by [Lucide](https://lucide.dev)