<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# PhotoSort AI - Intelligent Photo Organization

Automatically organize and group your photos into semantic albums using AI vision models. Upload a folder, get it sorted by visual content - all powered by OpenRouter's unified AI gateway.

## Features

- 🤖 **Multi-Model AI Vision**: Automatic fallback across Gemini, Claude, and GPT-4
- 🆓 **Free Tier Available**: Uses free Gemini model by default
- 📦 **Smart Clustering**: Groups photos into ~20-image albums based on visual similarity
- 🔄 **Automatic Retry**: Failed photos can be retried with one click
- 💾 **ZIP Export**: Download organized albums as a ZIP file
- 🎨 **Beautiful UI**: Modern, responsive interface built with Tailwind CSS
- 🔒 **Privacy First**: All processing happens in your browser

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

1. **Upload**: Drag and drop a folder of photos or select multiple images
2. **AI Analysis**: Each photo is analyzed using OpenRouter's vision models
   - Primary: Gemini 2.0 Flash (Free)
   - Fallback: Claude 3.5 Sonnet
   - Emergency: GPT-4o
3. **Smart Clustering**: Photos are grouped into semantic albums based on visual tags
4. **Download**: Export organized albums as a ZIP file

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
│   ├── services/            # Business logic
│   │   ├── imageUtils.ts    # Image processing
│   │   ├── openRouterService.ts  # AI vision API
│   │   └── clusteringService.ts  # Album organization
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

- Images are automatically resized to 512px before analysis (reduces API costs)
- Free Gemini model is used by default
- Fallback to premium models only when necessary
- Sequential processing prevents rate limit issues

## Troubleshooting

### "API key not configured" error
- Make sure you've created `.env.local` with your OpenRouter API key
- Restart the dev server after adding the key

### Photos failing to process
- Check your OpenRouter account has credits/quota
- The app will automatically try fallback models
- Use the "Retry Failed Photos" button to reprocess errors

### Slow processing
- This is normal - images are processed sequentially to avoid rate limits
- The app automatically adjusts speed based on API response times

## Contributing

Contributions are welcome! Please read [AI_RULES.md](AI_RULES.md) for development guidelines.

## License

MIT

## Acknowledgments

- Powered by [OpenRouter](https://openrouter.ai)
- Built with [React](https://react.dev) and [Vite](https://vitejs.dev)
- Icons by [Lucide](https://lucide.dev)