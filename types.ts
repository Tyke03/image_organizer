export interface PhotoFile {
  id: string;
  file: File;
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  tags: string[];
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