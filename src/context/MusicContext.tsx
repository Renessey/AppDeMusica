import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import { Song, Playlist, DownloadProgress, PlaybackState, RepeatMode } from '../types';
import { audioEngine } from '../services/audioEngine';
import { loadSongs, saveSongs, loadPlaylists, savePlaylists } from '../services/storage';
import {
  extractVideoId,
  fetchYouTubeMetadata,
  cleanAudioStreamUrl,
  resolveYouTubeAudio,
} from '../services/youtubeEngine';

interface MusicContextType {
  songs: Song[];
  playlists: Playlist[];
  currentSong: Song | null;
  playbackState: PlaybackState;
  isPlaying: boolean;
  position: number;
  duration: number;
  isShuffle: boolean;
  repeatMode: RepeatMode;
  activeDownloads: Record<string, DownloadProgress>;
  isPlayerModalVisible: boolean;
  activeQueue: Song[];
  
  // Actions
  playSong: (song: Song, queue?: Song[]) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  nextSong: () => Promise<void>;
  previousSong: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleFavorite: (songId: string) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  
  // Playlist actions
  createPlaylist: (name: string, description?: string) => Promise<Playlist>;
  deletePlaylist: (playlistId: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;

  // Download actions
  startDownload: (
    urlOrId: string,
    streamUrl?: string,
    metadata?: { title?: string; artist?: string; thumbnail?: string; duration?: number },
    targetPlaylistId?: string
  ) => Promise<void>;
  cancelDownload: (songId: string) => Promise<void>;

  // UI state
  openPlayerModal: () => void;
  closePlayerModal: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [activeQueue, setActiveQueue] = useState<Song[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('STOPPED');
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off');
  const [activeDownloads, setActiveDownloads] = useState<Record<string, DownloadProgress>>({});
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(false);

  const songsRef = useRef<Song[]>([]);
  const currentSongRef = useRef<Song | null>(null);
  const queueRef = useRef<Song[]>([]);
  const repeatModeRef = useRef<RepeatMode>('off');
  const isShuffleRef = useRef<boolean>(false);
  const isCompletingRef = useRef<boolean>(false);
  const handleSongCompletedRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const nextSongRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const previousSongRef = useRef<() => Promise<void>>(() => Promise.resolve());

  songsRef.current = songs;
  currentSongRef.current = currentSong;
  queueRef.current = activeQueue;
  repeatModeRef.current = repeatMode;
  isShuffleRef.current = isShuffle;

  // Load saved songs and playlists on mount
  useEffect(() => {
    async function init() {
      const loadedSongs = await loadSongs();
      setSongs(loadedSongs);
      songsRef.current = loadedSongs;
      setActiveQueue(loadedSongs);
      queueRef.current = loadedSongs;
      const loadedPlaylists = await loadPlaylists();
      setPlaylists(loadedPlaylists);

      // Automatically inspect and correct any existing downloaded songs that have placeholder duration (210 or 0)
      let needsSave = false;
      const verifiedSongs = await Promise.all(
        loadedSongs.map(async (song) => {
          if ((song.duration === 210 || !song.duration) && song.url && song.url.startsWith('file://')) {
            try {
              const realDur = await audioEngine.getAudioDuration(song.url);
              if (realDur > 0) {
                needsSave = true;
                return { ...song, duration: realDur };
              }
            } catch {}
          }
          return song;
        })
      );

      if (needsSave) {
        setSongs(verifiedSongs);
        setActiveQueue(verifiedSongs);
        await saveSongs(verifiedSongs);
      }
    }
    init();
  }, []);

  // Subscribe to native audio events
  useEffect(() => {
    const progressSub = audioEngine.onPlaybackProgress(({ songId, position: posMs, duration: durMs }) => {
      if (currentSongRef.current && currentSongRef.current.id === songId) {
        setPosition(posMs / 1000);
        if (durMs > 0) {
          const totalSec = Math.round(durMs / 1000);
          setDuration(totalSec);

          if ((!currentSongRef.current.duration || currentSongRef.current.duration <= 0) && totalSec > 0) {
            currentSongRef.current = { ...currentSongRef.current, duration: totalSec };
            setCurrentSong((prev) => (prev ? { ...prev, duration: totalSec } : null));
            setSongs((prevSongs) => {
              const updated = prevSongs.map((s) => (s.id === songId ? { ...s, duration: totalSec } : s));
              saveSongs(updated);
              return updated;
            });
          }
        }
      }
    });

    const stateSub = audioEngine.onPlaybackStateChange(({ state, songId, duration: durMs }) => {
      setPlaybackState(state);
      if (durMs && durMs > 0 && currentSongRef.current && currentSongRef.current.id === songId) {
        const totalSec = Math.round(durMs / 1000);
        setDuration(totalSec);
        if (currentSongRef.current.duration !== totalSec && totalSec > 0) {
          currentSongRef.current = { ...currentSongRef.current, duration: totalSec };
          setCurrentSong((prev) => (prev ? { ...prev, duration: totalSec } : null));
          setSongs((prevSongs) => {
            const updated = prevSongs.map((s) => (s.id === songId ? { ...s, duration: totalSec } : s));
            saveSongs(updated);
            return updated;
          });
        }
      }
    });

    const completeSub = audioEngine.onPlaybackComplete(() => {
      handleSongCompletedRef.current();
    });

    const errorSub = audioEngine.onPlaybackError(({ error }) => {
      console.warn('Playback error from native:', error);
      setPlaybackState('STOPPED');
    });

    const downloadSub = audioEngine.onDownloadProgress((data) => {
      setActiveDownloads((prev) => {
        const existing = prev[data.songId];
        if (!existing) return prev;
        const mappedProgress = existing.progress >= 35
          ? Math.max(existing.progress, Math.min(100, Math.round(35 + (data.progress * 0.65))))
          : Math.max(existing.progress, data.progress);

        return {
          ...prev,
          [data.songId]: {
            ...existing,
            progress: data.progress >= 100 ? 100 : mappedProgress,
            bytesRead: data.bytesRead,
            totalBytes: data.totalBytes,
            status: data.progress >= 100 ? 'completed' : 'downloading',
          },
        };
      });
    });

    const downloadErrSub = audioEngine.onDownloadError(({ songId, error }) => {
      setActiveDownloads((prev) => {
        const existing = prev[songId];
        if (!existing) return prev;
        return {
          ...prev,
          [songId]: {
            ...existing,
            status: 'error',
            error,
          },
        };
      });
    });

    return () => {
      progressSub?.remove();
      stateSub?.remove();
      completeSub?.remove();
      errorSub?.remove();
      downloadSub?.remove();
      downloadErrSub?.remove();
    };
  }, []);

  const handleSongCompleted = async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;
    setTimeout(() => {
      isCompletingRef.current = false;
    }, 1000);

    const mode = repeatModeRef.current;
    if (mode === 'one' && currentSongRef.current) {
      await audioEngine.seekTo(0);
      await audioEngine.play(currentSongRef.current.url, currentSongRef.current.id);
      return;
    }
    await nextSongRef.current();
  };
  handleSongCompletedRef.current = handleSongCompleted;

  const playSong = async (song: Song, queue?: Song[]) => {
    try {
      // Synchronously update currentSongRef & queueRef to ensure instant consistency
      currentSongRef.current = song;
      if (queue && queue.length > 0) {
        queueRef.current = queue;
        setActiveQueue(queue);
      } else if (!queueRef.current.some((s) => s.id === song.id)) {
        queueRef.current = songsRef.current;
        setActiveQueue(songsRef.current);
      }

      setCurrentSong(song);
      setPosition(0);
      setDuration(song.duration || 0);
      setPlaybackState('BUFFERING');
      await audioEngine.play(song.url, song.id);
    } catch (e: any) {
      console.warn('Erro ao reproduzir musica:', e);
      setPlaybackState('STOPPED');
      // If error occurs during playback, attempt to advance to the next song in sequence
      setTimeout(() => {
        if (queueRef.current.length > 1) {
          nextSongRef.current();
        }
      }, 1000);
    }
  };

  const togglePlayPause = async () => {
    if (!currentSong) {
      const q = queueRef.current.length > 0 ? queueRef.current : songs;
      if (q.length > 0) {
        await playSong(q[0], q);
      }
      return;
    }

    if (playbackState === 'PLAYING') {
      await audioEngine.pause();
    } else if (playbackState === 'PAUSED') {
      await audioEngine.resume();
    } else {
      await audioEngine.play(currentSong.url, currentSong.id);
    }
  };

  const seekTo = async (seconds: number) => {
    setPosition(seconds);
    await audioEngine.seekTo(Math.floor(seconds * 1000));
  };

  const nextSong = async () => {
    const queue = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (queue.length === 0) return;

    if (isShuffleRef.current && queue.length > 1) {
      const curId = currentSongRef.current?.id;
      let nextIndex = Math.floor(Math.random() * queue.length);
      if (queue[nextIndex].id === curId) {
        nextIndex = (nextIndex + 1) % queue.length;
      }
      await playSong(queue[nextIndex], queue);
      return;
    }

    const currentIndex = queue.findIndex((s) => s.id === currentSongRef.current?.id);
    let nextIndex = 0;
    if (currentIndex >= 0) {
      if (currentIndex < queue.length - 1) {
        // Avance para a música abaixo na lista
        nextIndex = currentIndex + 1;
      } else {
        // Chegou ao fim da lista: reinicia no topo mantendo a sequência contínua
        nextIndex = 0;
      }
    } else {
      nextIndex = 0;
    }

    const targetSong = queue[nextIndex];
    if (targetSong) {
      await playSong(targetSong, queue);
    }
  };

  const previousSong = async () => {
    if (position > 4) {
      // If played more than 4 seconds, restart current track
      await seekTo(0);
      return;
    }

    const queue = queueRef.current.length > 0 ? queueRef.current : songsRef.current;
    if (queue.length === 0) return;

    const currentIndex = queue.findIndex((s) => s.id === currentSongRef.current?.id);
    let prevIndex = 0;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    } else if (currentIndex === 0) {
      prevIndex = queue.length - 1;
    } else {
      prevIndex = 0;
    }

    const targetSong = queue[prevIndex];
    if (targetSong) {
      await playSong(targetSong, queue);
    } else {
      await seekTo(0);
    }
  };
  nextSongRef.current = nextSong;
  previousSongRef.current = previousSong;

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const toggleRepeat = () => {
    setRepeatMode((prev) => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const toggleFavorite = async (songId: string) => {
    let nextIsFavorite = false;
    const updatedSongs = songs.map((s) => {
      if (s.id === songId) {
        nextIsFavorite = !s.isFavorite;
        return { ...s, isFavorite: nextIsFavorite };
      }
      return s;
    });
    setSongs(updatedSongs);
    await saveSongs(updatedSongs);

    // Update current song in state if active
    if (currentSongRef.current && currentSongRef.current.id === songId) {
      setCurrentSong((prev) => (prev ? { ...prev, isFavorite: nextIsFavorite } : null));
    }

    // Also update system favorite playlist
    setPlaylists((prevPlaylists) => {
      let foundFavPl = false;
      let updated = prevPlaylists.map((pl) => {
        if (pl.id === 'pl_favs' || pl.name.toLowerCase().includes('favorita')) {
          foundFavPl = true;
          const has = pl.songIds.includes(songId);
          return {
            ...pl,
            songIds: nextIsFavorite
              ? (has ? pl.songIds : [...pl.songIds, songId])
              : pl.songIds.filter((id) => id !== songId),
          };
        }
        return pl;
      });

      if (!foundFavPl && nextIsFavorite) {
        const newFavPl: Playlist = {
          id: 'pl_favs',
          name: 'Favoritas ❤️',
          description: 'Suas músicas curtidas e favoritas',
          coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
          songIds: [songId],
          createdAt: Date.now(),
          isSystem: true,
        };
        updated = [newFavPl, ...updated];
      }

      savePlaylists(updated);
      return updated;
    });
  };

  const deleteSong = async (songId: string) => {
    const target = songs.find((s) => s.id === songId);
    if (target && target.url.startsWith('file://')) {
      await audioEngine.deleteAudioFile(target.url);
    }
    if (currentSong?.id === songId) {
      await audioEngine.stop();
      setCurrentSong(null);
    }
    const updated = songs.filter((s) => s.id !== songId);
    setSongs(updated);
    await saveSongs(updated);

    // Remove from playlists
    const updatedPlaylists = playlists.map((pl) => ({
      ...pl,
      songIds: pl.songIds.filter((id) => id !== songId),
    }));
    setPlaylists(updatedPlaylists);
    await savePlaylists(updatedPlaylists);
  };

  // --- Playlist Actions ---
  const createPlaylist = async (name: string, description?: string): Promise<Playlist> => {
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name,
      description: description || 'Playlist personalizada',
      songIds: [],
      createdAt: Date.now(),
    };
    const updated = [...playlists, newPl];
    setPlaylists(updated);
    await savePlaylists(updated);
    return newPl;
  };

  const deletePlaylist = async (playlistId: string) => {
    const updated = playlists.filter((p) => p.id !== playlistId);
    setPlaylists(updated);
    await savePlaylists(updated);
  };

  const addSongToPlaylist = async (playlistId: string, songId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId && !p.songIds.includes(songId)) {
        return { ...p, songIds: [...p.songIds, songId] };
      }
      return p;
    });
    setPlaylists(updated);
    await savePlaylists(updated);
  };

  const removeSongFromPlaylist = async (playlistId: string, songId: string) => {
    const updated = playlists.map((p) => {
      if (p.id === playlistId) {
        return { ...p, songIds: p.songIds.filter((id) => id !== songId) };
      }
      return p;
    });
    setPlaylists(updated);
    await savePlaylists(updated);
  };

  // --- Download Engine ---
  const startDownload = async (
    urlOrId: string,
    streamUrl?: string,
    metadata?: { title?: string; artist?: string; thumbnail?: string; duration?: number },
    targetPlaylistId?: string
  ) => {
    const videoId = extractVideoId(urlOrId) || `yt_${Date.now()}`;
    const songId = `song_yt_${videoId}_${Date.now()}`;

    let metaTitle = metadata?.title;
    let metaArtist = metadata?.artist;
    let metaThumb = metadata?.thumbnail;

    const isPlaceholderTitle = (t?: string) => {
      if (!t) return true;
      const lower = t.toLowerCase().trim();
      return (
        lower === 'vídeo detectado' ||
        lower === 'video detectado' ||
        lower === 'youtube' ||
        lower === 'carregando título...' ||
        lower === 'carregando titulo...' ||
        lower === 'música do youtube' ||
        lower === 'musica do youtube' ||
        lower.startsWith('youtube áudio (')
      );
    };

    const isPlaceholderArtist = (a?: string) => {
      if (!a) return true;
      const lower = a.toLowerCase().trim();
      return lower === 'youtube' || lower === 'youtube artista' || lower === 'desconhecido';
    };

    if (isPlaceholderTitle(metaTitle) || isPlaceholderArtist(metaArtist) || !metaThumb) {
      const fetched = await fetchYouTubeMetadata(videoId);
      if (isPlaceholderTitle(metaTitle)) metaTitle = fetched.title;
      if (isPlaceholderArtist(metaArtist)) metaArtist = fetched.artist;
      if (!metaThumb) metaThumb = fetched.thumbnail;
    }

    let finalStreamUrl = streamUrl ? cleanAudioStreamUrl(streamUrl) : '';
    let isMp3Format = false;

    // If streamUrl was not provided or empty, resolve directly using the built-in engine
    if (!finalStreamUrl) {
      setActiveDownloads((prev) => ({
        ...prev,
        [songId]: {
          songId,
          videoId,
          title: metaTitle!,
          artist: metaArtist!,
          thumbnail: metaThumb!,
          progress: 5,
          bytesRead: 0,
          totalBytes: 0,
          status: 'downloading',
        },
      }));

      const resolved = await resolveYouTubeAudio(videoId, (percent) => {
        setActiveDownloads((prev) => {
          const item = prev[songId];
          if (!item) return prev;
          return {
            ...prev,
            [songId]: {
              ...item,
              progress: Math.max(item.progress, percent),
            },
          };
        });
      });

      if (resolved && resolved.streamUrl) {
        finalStreamUrl = resolved.streamUrl;
        isMp3Format = resolved.format === 'mp3' || finalStreamUrl.includes('.mp3') || finalStreamUrl.includes('/mp3');
        if (resolved.title && isPlaceholderTitle(metaTitle)) {
          metaTitle = resolved.title;
        }
        if (resolved.artist && isPlaceholderArtist(metaArtist)) {
          metaArtist = resolved.artist;
        }
      } else {
        setActiveDownloads((prev) => {
          const copy = { ...prev };
          delete copy[songId];
          return copy;
        });
        Alert.alert(
          'Download Não Concluído',
          'Não foi possível extrair o áudio deste vídeo com o motor embutido. Verifique o link e tente novamente.'
        );
        return;
      }
    } else {
      isMp3Format = finalStreamUrl.includes('.mp3') || finalStreamUrl.includes('/mp3');
    }

    // Add or update active downloads
    setActiveDownloads((prev) => ({
      ...prev,
      [songId]: {
        songId,
        videoId,
        title: metaTitle!,
        artist: metaArtist!,
        thumbnail: metaThumb!,
        progress: prev[songId]?.progress || 10,
        bytesRead: 0,
        totalBytes: 0,
        status: 'downloading',
      },
    }));

    try {
      const safeTitle = (metaTitle || 'Musica').replace(/[^a-zA-Z0-9]/g, '_');
      const safeArtist = (metaArtist || 'Artista').replace(/[^a-zA-Z0-9]/g, '_');
      const ext = isMp3Format ? 'mp3' : 'm4a';
      const fileName = `${safeArtist}_${safeTitle}_${videoId}.${ext}`;
      const result = await audioEngine.downloadAudio(
        finalStreamUrl,
        songId,
        fileName,
        metaTitle!,
        metaArtist!
      );

      const exactDuration = (result.duration && result.duration > 0)
        ? result.duration
        : (metadata?.duration && metadata.duration > 0 ? metadata.duration : 0);

      // Create new Song object
      const newSong: Song = {
        id: songId,
        videoId,
        title: metaTitle!,
        artist: metaArtist!,
        thumbnail: metaThumb!,
        url: result.fileUri,
        streamUrl: finalStreamUrl,
        duration: exactDuration,
        fileSize: result.fileSize,
        isDownloaded: true,
        addedAt: Date.now(),
        source: 'youtube',
        isFavorite: false,
      };

      setSongs((prevSongs) => {
        const next = [newSong, ...prevSongs];
        saveSongs(next);
        return next;
      });

      // If target playlist was chosen, add directly to it!
      if (targetPlaylistId) {
        setPlaylists((prevPlaylists) => {
          const updated = prevPlaylists.map((pl) => {
            if (pl.id === targetPlaylistId && !pl.songIds.includes(songId)) {
              return { ...pl, songIds: [...pl.songIds, songId] };
            }
            return pl;
          });
          savePlaylists(updated);
          return updated;
        });
      }

      // Update download status to completed and remove after 3s
      setActiveDownloads((prev) => ({
        ...prev,
        [songId]: {
          ...prev[songId],
          progress: 100,
          status: 'completed',
        },
      }));

      setTimeout(() => {
        setActiveDownloads((prev) => {
          const clone = { ...prev };
          delete clone[songId];
          return clone;
        });
      }, 4000);

      Alert.alert(
        'Música Baixada com Sucesso! 🎵',
        targetPlaylistId
          ? `"${newSong.title}" foi baixada e adicionada à sua Playlist!`
          : `"${newSong.title}" foi adicionada à sua Prateleira Principal.`
      );
    } catch (e: any) {
      console.error('Download error:', e);
      setActiveDownloads((prev) => ({
        ...prev,
        [songId]: {
          ...prev[songId],
          status: 'error',
          error: e?.message || 'Falha no download',
        },
      }));
      Alert.alert('Erro no Download', e?.message || 'Não foi possível baixar o áudio deste vídeo.');
    }
  };

  const cancelDownload = async (songId: string) => {
    await audioEngine.cancelDownload(songId);
    setActiveDownloads((prev) => {
      const clone = { ...prev };
      delete clone[songId];
      return clone;
    });
  };

  const openPlayerModal = useCallback(() => setIsPlayerModalVisible(true), []);
  const closePlayerModal = useCallback(() => setIsPlayerModalVisible(false), []);

  const contextValue = useMemo<MusicContextType>(
    () => ({
      songs,
      playlists,
      currentSong,
      playbackState,
      isPlaying: playbackState === 'PLAYING',
      position,
      duration,
      isShuffle,
      repeatMode,
      activeDownloads,
      isPlayerModalVisible,
      activeQueue,
      playSong,
      togglePlayPause,
      seekTo,
      nextSong,
      previousSong,
      toggleShuffle,
      toggleRepeat,
      toggleFavorite,
      deleteSong,
      createPlaylist,
      deletePlaylist,
      addSongToPlaylist,
      removeSongFromPlaylist,
      startDownload,
      cancelDownload,
      openPlayerModal,
      closePlayerModal,
    }),
    [
      songs,
      playlists,
      currentSong,
      playbackState,
      position,
      duration,
      isShuffle,
      repeatMode,
      activeDownloads,
      isPlayerModalVisible,
      activeQueue,
      openPlayerModal,
      closePlayerModal,
    ]
  );

  return (
    <MusicContext.Provider value={contextValue}>
      {children}
    </MusicContext.Provider>
  );
};

export function useMusic() {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}
