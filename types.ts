export interface PhotoFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  tags: string[];
  modelUsed?: string; // Track which AI model was used (e.g., 'google/gemini-2.0-flash-exp:free')
  error?: string;
}

export interface Album {
  id: string;
  name: string;
  photoIds: string[];
  mainTag: string;
}

export interface ProcessingStats {
  total: number;
  processed: number;
  startTime: number | null;
  endTime: number | null;
}

export enum AppStep {
  UPLOAD = 'UPLOAD',
  PROCESSING = 'PROCESSING',
  RESULTS = 'RESULTS',
}

export interface TagResult {
  tags: string[];
}