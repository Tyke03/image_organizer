import React, { useEffect, useRef } from 'react';
import { PhotoFile, ProcessingStats } from '../types';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProcessingViewProps {
  photos: PhotoFile[];
  stats: ProcessingStats;
}

const ProcessingView: React.FC<ProcessingViewProps> = ({ photos, stats }) => {
  const percentage = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest processed items
  useEffect(() => {
    if (scrollRef.current) {
        // Implementation detail: keeping simple for now, user can scroll freely
    }
  }, [stats.processed]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      {/* Header Stats */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 sticky top-4 z-10 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              Processing Photos with Gemini 2.5 Flash
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              Analyzing visual content to generate semantic tags...
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-blue-400">{percentage}%</div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {stats.processed} / {stats.total} Completed
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4" ref={scrollRef}>
        {photos.map((photo) => (
          <div 
            key={photo.id} 
            className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all duration-300 ${
              photo.status === 'done' ? 'border-green-500/50 opacity-100' :
              photo.status === 'processing' ? 'border-blue-500 scale-105 shadow-xl z-10' :
              photo.status === 'error' ? 'border-red-500 opacity-80' :
              'border-transparent opacity-50 grayscale'
            }`}
          >
            <img 
              src={photo.previewUrl} 
              alt="processing preview" 
              className="w-full h-full object-cover"
            />
            
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {photo.status === 'done' && (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-400 mb-2" />
                  <div className="flex flex-wrap justify-center gap-1">
                    {photo.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-white">{t}</span>
                    ))}
                  </div>
                </>
              )}
              {photo.status === 'processing' && (
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              )}
              {photo.status === 'error' && (
                <AlertCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProcessingView;