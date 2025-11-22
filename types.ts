export interface SongData {
  title: string;
  artist: string;
  originalLyrics: string;
  coverImage: string | null; // Base64 string
}

export interface ClozeResult {
  processedLyrics: string;
  answerKey: string[];
}

export enum AppState {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  ERROR = 'ERROR',
}
