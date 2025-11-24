import React, { useCallback } from 'react';
import { Upload, FileImage, FolderInput } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
}

const DropZone: React.FC<DropZoneProps> = ({ onFilesSelected }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files).filter((file: File) => 
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file: File) => 
        file.type.startsWith('image/')
      );
      if (files.length > 0) {
        onFilesSelected(files);
      }
    }
  };

  return (
    <div 
      className="w-full max-w-2xl mx-auto border-2 border-dashed border-slate-600 rounded-2xl p-12 text-center hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer group"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('fileInput')?.click()}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="p-6 bg-slate-800 rounded-full group-hover:scale-110 transition-transform shadow-xl shadow-blue-500/10">
          <Upload className="w-12 h-12 text-blue-400" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-white">Drop your photos here</h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            Drag and drop a folder or select multiple images to start organizing.
            <br />
            <span className="text-sm text-slate-500 mt-2 block">Supports JPG, PNG, WebP</span>
          </p>
        </div>
        
        <input 
          type="file" 
          id="fileInput" 
          multiple 
          accept="image/*" 
          className="hidden" 
          onChange={handleFileInput}
        />
        
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
          <FolderInput className="w-5 h-5" />
          Select Files
        </button>
      </div>
    </div>
  );
};

export default DropZone;