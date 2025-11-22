export interface SongData {
  title: string;
  artist: string;
  originalLyrics: string;
  coverImage: string | null; // Base64 string
}

export interface ClozeResult {
  lines: string[];
  answerKey: string[];
  // Word bank removed as requested
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  ERROR = 'ERROR',
}