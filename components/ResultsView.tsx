import React, { useState } from 'react';
import { Album, PhotoFile } from '../types';
import { Folder, Download, Image as ImageIcon, ChevronRight, Check, RefreshCw, AlertCircle } from 'lucide-react';
import JSZip from 'jszip';

interface ResultsViewProps {
  albums: Album[];
  photos: PhotoFile[];
  onReset: () => void;
  onRetry: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ albums, photos, onReset, onRetry }) => {
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(albums[0]?.id || null);
  const [isZipping, setIsZipping] = useState(false);

  const selectedAlbum = albums.find(a => a.id === selectedAlbumId);
  const selectedPhotos = selectedAlbum 
    ? photos.filter(p => selectedAlbum.photoIds.includes(p.id))
    : [];

  const hasErrors = albums.some(a => a.mainTag === 'error');

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      
      // Create folder structure
      albums.forEach(album => {
        // Skip failed album in zip usually, but maybe user wants them? 
        // Let's include them in a "Failed" folder so they aren't lost.
        const folder = zip.folder(album.name);
        if (folder) {
          const albumPhotos = photos.filter(p => album.photoIds.includes(p.id));
          albumPhotos.forEach(photo => {
             folder.file(photo.file.name, photo.file);
          });
        }
      });

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "organized_photos.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (e) {
      console.error("Failed to zip", e);
      alert("Error creating zip file.");
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6 max-w-7xl mx-auto">
      {/* Sidebar: Album List */}
      <div className="w-full md:w-80 flex-shrink-0 flex flex-col bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 bg-slate-800">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Folder className="w-5 h-5 text-yellow-500" />
            Albums Created ({albums.length})
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {albums.map(album => (
            <button
              key={album.id}
              onClick={() => setSelectedAlbumId(album.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                selectedAlbumId === album.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : album.mainTag === 'error' 
                    ? 'text-red-400 hover:bg-red-900/20' 
                    : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {album.mainTag === 'error' ? (
                   <AlertCircle className="w-5 h-5 flex-shrink-0" />
                ) : (
                   <Folder className={`w-5 h-5 flex-shrink-0 ${selectedAlbumId === album.id ? 'text-white' : 'text-slate-500'}`} />
                )}
                <span className="truncate font-medium">{album.name}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${selectedAlbumId === album.id ? 'bg-blue-500' : 'bg-slate-900'}`}>
                {album.photoIds.length}
              </span>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-slate-700 bg-slate-800 space-y-2">
            {hasErrors && (
                <button
                    onClick={onRetry}
                    className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-900 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Retry Failed Photos
                </button>
            )}

            <button 
                onClick={handleDownloadZip}
                disabled={isZipping}
                className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-green-900/20"
            >
                {isZipping ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                    <Download className="w-5 h-5" />
                )}
                {isZipping ? "Creating Zip..." : "Download Sorted Zip"}
            </button>
            <button 
                onClick={onReset}
                className="w-full py-2 text-slate-400 hover:text-white text-sm"
            >
                Start Over
            </button>
        </div>
      </div>

      {/* Main Content: Photo Grid */}
      <div className="flex-1 flex flex-col bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
            <div>
                <h1 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    {selectedAlbum?.mainTag === 'error' && <AlertCircle className="text-red-500" />}
                    {selectedAlbum?.name}
                </h1>
                <p className="text-slate-400 text-sm flex items-center gap-2">
                    <span className="bg-slate-700 px-2 py-0.5 rounded text-xs text-white">
                        #{selectedAlbum?.mainTag}
                    </span>
                    <span>{selectedAlbum?.photoIds.length} photos</span>
                </p>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
            {selectedPhotos.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500">
                    <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                    <p>Select an album to view photos</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {selectedPhotos.map(photo => (
                        <div key={photo.id} className={`group relative aspect-square bg-slate-900 rounded-lg overflow-hidden border ${photo.status === 'error' ? 'border-red-500' : 'border-slate-700'} shadow-sm`}>
                            <img 
                                src={photo.previewUrl} 
                                alt="Result" 
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-end">
                                <p className="text-white text-xs line-clamp-2">
                                    {photo.tags.length > 0 ? photo.tags.join(', ') : 'No tags'}
                                </p>
                                {photo.status === 'error' && <span className="text-red-400 text-xs font-bold mt-1">Failed</span>}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

// Simple loader icon for zip button
const Loader2 = ({ className }: { className?: string }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);

export default ResultsView;