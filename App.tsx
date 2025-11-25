import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppStep, PhotoFile, ProcessingStats, Album } from './types';
import { createPreview, revokePreview, resizeAndConvert } from './services/imageUtils';
import { analyzeImage } from './services/openRouterService';
import { organizePhotos } from './services/clusteringService';

// Components
import DropZone from './components/DropZone';
import ProcessingView from './components/ProcessingView';
import ResultsView from './components/ResultsView';
import { Boxes, Sparkles, AlertTriangle } from 'lucide-react';

// Helper for throttling
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Main App Component
const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.UPLOAD);
  const [photos, setPhotos] = useState<PhotoFile[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [isQuotaMode, setIsQuotaMode] = useState(false);
  const [processingStats, setProcessingStats] = useState<ProcessingStats>({
    total: 0,
    processed: 0,
    startTime: null,
    endTime: null
  });

  // Handle File Selection
  const handleFilesSelected = (files: File[]) => {
    const newPhotos: PhotoFile[] = files.map(file => ({
      id: uuidv4(),
      file,
      previewUrl: createPreview(file),
      status: 'pending',
      tags: [],
      modelUsed: undefined
    }));

    setPhotos(newPhotos);
    setProcessingStats({
      total: newPhotos.length,
      processed: 0,
      startTime: null,
      endTime: null
    });
    setStep(AppStep.PROCESSING);
    startProcessing(newPhotos);
  };

  // Main Processing Loop
  const startProcessing = async (photosToProcess: PhotoFile[]) => {
    setProcessingStats(prev => ({ ...prev, startTime: Date.now() }));

    // Dynamic Throttle State
    let currentDelay = 2000; // Start with 2s
    const MAX_DELAY = 30000; // Cap at 30s
    const MIN_DELAY = 2000;
    const photoQueue = [...photosToProcess];
    
    // Helper to process a single photo
    const processPhoto = async (photo: PhotoFile) => {
      // Update status to processing
      setPhotos(current => current.map(p => p.id === photo.id ? { ...p, status: 'processing' } : p));
      
      const start = Date.now();
      let success = false;

      try {
        // 1. Resize and Convert (512px)
        const base64 = await resizeAndConvert(photo.file);
        
        // 2. Analyze with OpenRouter (automatic multi-model fallback)
        const { tags, modelUsed } = await analyzeImage(base64);
        
        // Update status to done
        setPhotos(current => current.map(p => 
          p.id === photo.id 
            ? { ...p, status: tags.length > 0 ? 'done' : 'error', tags, modelUsed } 
            : p
        ));
        success = true;
      } catch (err: any) {
        console.error(`Error processing ${photo.id}`, err);
        setPhotos(current => current.map(p => p.id === photo.id ? { ...p, status: 'error', error: 'Failed' } : p));
        
        // Check for 429 specifically to trigger aggressive throttling
        if (err.message?.includes('429') || JSON.stringify(err).includes('429')) {
            success = false; // Force delay increase
        }
      } finally {
        setProcessingStats(prev => ({ ...prev, processed: prev.processed + 1 }));
      }

      return { success, duration: Date.now() - start };
    };

    // Process in batches (Sequential Loop)
    for (let i = 0; i < photoQueue.length; i++) {
      const photo = photoQueue[i];
      
      const result = await processPhoto(photo);

      // Congestion Control Logic
      if (!result.success || result.duration > 15000) {
        // If it failed or took very long (likely retries), BACK OFF
        currentDelay = Math.min(currentDelay + 5000, MAX_DELAY);
        setIsQuotaMode(true);
      } else {
        // If it was fast and successful, gently speed up
        currentDelay = Math.max(currentDelay - 250, MIN_DELAY);
        if (currentDelay < 5000) setIsQuotaMode(false);
      }

      // Wait before next request (if not last)
      if (i < photoQueue.length - 1) {
        console.log(`Waiting ${currentDelay}ms before next photo...`);
        await delay(currentDelay); 
      }
    }

    // All done
    setProcessingStats(prev => ({ ...prev, endTime: Date.now() }));
    finishProcessing();
  };

  const finishProcessing = () => {
    setPhotos(currentPhotos => {
        const sortedAlbums = organizePhotos(currentPhotos);
        setAlbums(sortedAlbums);
        setStep(AppStep.RESULTS);
        return currentPhotos;
    });
  };

  const handleRetryFailed = () => {
    const failedPhotos = photos.filter(p => p.status === 'error' || (p.status === 'done' && p.tags.length === 0));
    if (failedPhotos.length === 0) return;

    // Reset status
    setPhotos(prev => prev.map(p => failedPhotos.find(fp => fp.id === p.id) ? { ...p, status: 'pending' } : p));
    setStep(AppStep.PROCESSING);
    setProcessingStats({
        total: failedPhotos.length,
        processed: 0,
        startTime: Date.now(),
        endTime: null
    });
    startProcessing(failedPhotos);
  };

  const handleReset = () => {
    photos.forEach(p => revokePreview(p.previewUrl));
    setPhotos([]);
    setAlbums([]);
    setStep(AppStep.UPLOAD);
    setIsQuotaMode(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-2 rounded-lg">
              <Boxes className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              PhotoSort AI
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
             <span className="flex items-center gap-1.5">
               <Sparkles className="w-4 h-4 text-amber-400" />
               Powered by OpenRouter
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {step === AppStep.UPLOAD && (
          <div className="h-full flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
            <div className="mb-8 text-center max-w-lg">
              <h2 className="text-4xl font-bold text-white mb-4">Organize Chaos. Instantly.</h2>
              <p className="text-lg text-slate-400">
                Upload a folder of photos. AI will analyze them and group them into semantic albums automatically.
              </p>
            </div>
            <DropZone onFilesSelected={handleFilesSelected} />
          </div>
        )}

        {step === AppStep.PROCESSING && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 relative">
             {isQuotaMode && (
                 <div className="max-w-6xl mx-auto mb-4 bg-amber-500/10 border border-amber-500/50 text-amber-400 p-3 rounded-lg flex items-center gap-3">
                     <AlertTriangle className="w-5 h-5" />
                     <span className="text-sm font-medium">API rate limits detected. Using backup models and slowing down processing...</span>
                 </div>
             )}
             <ProcessingView photos={photos} stats={processingStats} />
          </div>
        )}

        {step === AppStep.RESULTS && (
          <div className="animate-in fade-in duration-700">
             <ResultsView 
                albums={albums} 
                photos={photos} 
                onReset={handleReset} 
                onRetry={handleRetryFailed}
             />
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-slate-600 text-sm">
        <p>
            Multi-model AI vision powered by OpenRouter (Gemini, Claude, GPT-4).
        </p>
      </footer>
    </div>
  );
};

export default App;