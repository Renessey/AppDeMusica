import { NativeModules, NativeEventEmitter } from 'react-native';
import { PlaybackState } from '../types';

const { AudioPlayerModule, AudioDownloaderModule } = NativeModules;

class AudioEngine {
  private playerEmitter: NativeEventEmitter | null = null;
  private downloaderEmitter: NativeEventEmitter | null = null;

  constructor() {
    if (AudioPlayerModule) {
      this.playerEmitter = new NativeEventEmitter(AudioPlayerModule);
    }
    if (AudioDownloaderModule) {
      this.downloaderEmitter = new NativeEventEmitter(AudioDownloaderModule);
    }
  }

  // --- Audio Player Methods ---
  async play(urlOrPath: string, songId: string): Promise<boolean> {
    if (!AudioPlayerModule) {
      console.warn('AudioPlayerModule not available');
      return false;
    }
    try {
      return await AudioPlayerModule.play(urlOrPath, songId);
    } catch (e) {
      console.error('AudioEngine.play error:', e);
      throw e;
    }
  }

  async pause(): Promise<boolean> {
    if (!AudioPlayerModule) return false;
    try {
      return await AudioPlayerModule.pause();
    } catch (e) {
      console.error('AudioEngine.pause error:', e);
      return false;
    }
  }

  async resume(): Promise<boolean> {
    if (!AudioPlayerModule) return false;
    try {
      return await AudioPlayerModule.resume();
    } catch (e) {
      console.error('AudioEngine.resume error:', e);
      return false;
    }
  }

  async stop(): Promise<boolean> {
    if (!AudioPlayerModule) return false;
    try {
      return await AudioPlayerModule.stop();
    } catch (e) {
      console.error('AudioEngine.stop error:', e);
      return false;
    }
  }

  async seekTo(positionMs: number): Promise<boolean> {
    if (!AudioPlayerModule) return false;
    try {
      return await AudioPlayerModule.seekTo(positionMs);
    } catch (e) {
      console.error('AudioEngine.seekTo error:', e);
      return false;
    }
  }

  async getCurrentPosition(): Promise<{ position: number; duration: number }> {
    if (!AudioPlayerModule) return { position: 0, duration: 0 };
    try {
      return await AudioPlayerModule.getCurrentPosition();
    } catch {
      return { position: 0, duration: 0 };
    }
  }

  async isPlaying(): Promise<boolean> {
    if (!AudioPlayerModule) return false;
    try {
      return await AudioPlayerModule.isPlaying();
    } catch {
      return false;
    }
  }

  // Event Listeners for Player
  onPlaybackProgress(callback: (data: { songId: string; position: number; duration: number }) => void) {
    if (!this.playerEmitter) return { remove: () => {} };
    const sub = this.playerEmitter.addListener('onPlaybackProgress', (data: any) => callback(data));
    return sub;
  }

  onPlaybackStateChange(callback: (data: { state: PlaybackState; songId: string; position?: number; duration?: number }) => void) {
    if (!this.playerEmitter) return { remove: () => {} };
    const sub = this.playerEmitter.addListener('onPlaybackStateChange', (data: any) => callback(data));
    return sub;
  }

  onPlaybackComplete(callback: (data: { songId: string }) => void) {
    if (!this.playerEmitter) return { remove: () => {} };
    const sub = this.playerEmitter.addListener('onPlaybackComplete', (data: any) => callback(data));
    return sub;
  }

  onPlaybackError(callback: (data: { songId: string; error: string }) => void) {
    if (!this.playerEmitter) return { remove: () => {} };
    const sub = this.playerEmitter.addListener('onPlaybackError', (data: any) => callback(data));
    return sub;
  }

  // --- Downloader Methods ---
  async downloadAudio(
    streamUrl: string,
    songId: string,
    fileName: string,
    title: string,
    artist: string
  ): Promise<{ filePath: string; fileUri: string; fileSize: number; duration?: number }> {
    if (!AudioDownloaderModule) {
      throw new Error('AudioDownloaderModule is not available on this platform');
    }
    return await AudioDownloaderModule.downloadAudio(streamUrl, songId, fileName, title, artist);
  }

  async getAudioDuration(filePathOrUri: string): Promise<number> {
    if (!AudioDownloaderModule || !AudioDownloaderModule.getAudioDuration) return 0;
    try {
      return await AudioDownloaderModule.getAudioDuration(filePathOrUri);
    } catch {
      return 0;
    }
  }

  async cancelDownload(songId: string): Promise<boolean> {
    if (!AudioDownloaderModule) return false;
    try {
      return await AudioDownloaderModule.cancelDownload(songId);
    } catch {
      return false;
    }
  }

  async deleteAudioFile(filePath: string): Promise<boolean> {
    if (!AudioDownloaderModule) return false;
    try {
      return await AudioDownloaderModule.deleteAudioFile(filePath);
    } catch {
      return false;
    }
  }

  onDownloadProgress(callback: (data: { songId: string; progress: number; bytesRead: number; totalBytes: number }) => void) {
    if (!this.downloaderEmitter) return { remove: () => {} };
    const sub = this.downloaderEmitter.addListener('onDownloadProgress', (data: any) => callback(data));
    return sub;
  }

  onDownloadError(callback: (data: { songId: string; error: string }) => void) {
    if (!this.downloaderEmitter) return { remove: () => {} };
    const sub = this.downloaderEmitter.addListener('onDownloadError', (data: any) => callback(data));
    return sub;
  }
}

export const audioEngine = new AudioEngine();
