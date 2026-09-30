export interface Song {
  id: string;
  videoId?: string;
  title: string;
  artist: string;
  thumbnail: string;
  url: string; // local file:// path or stream URL
  streamUrl?: string; // remote stream URL
  duration: number; // in seconds
  fileSize?: number; // in bytes
  isDownloaded: boolean;
  addedAt: number;
  source: 'youtube' | 'local' | 'demo';
  isFavorite?: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  songIds: string[];
  createdAt: number;
  isSystem?: boolean;
}

export interface DownloadProgress {
  songId: string;
  videoId?: string;
  title: string;
  artist: string;
  thumbnail: string;
  progress: number; // 0 to 100
  bytesRead: number;
  totalBytes: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

export type PlaybackState = 'PLAYING' | 'PAUSED' | 'BUFFERING' | 'STOPPED' | 'COMPLETED';

export type RepeatMode = 'off' | 'all' | 'one';
