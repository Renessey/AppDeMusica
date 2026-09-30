import AsyncStorage from '@react-native-async-storage/async-storage';
import { Song, Playlist } from '../types';

const SONGS_KEY = '@AppMusic:songs_v1';
const PLAYLISTS_KEY = '@AppMusic:playlists_v1';

const INITIAL_SONGS: Song[] = [
  {
    id: 'demo_1',
    videoId: 'sample1',
    title: 'Neon Nights (Synthwave Drive)',
    artist: 'Cyber Grooves',
    thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    duration: 372,
    fileSize: 6120000,
    isDownloaded: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    source: 'demo',
    isFavorite: true,
  },
  {
    id: 'demo_2',
    videoId: 'sample2',
    title: 'Midnight Chill Lounge',
    artist: 'Lo-Fi Beats Collective',
    thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    duration: 423,
    fileSize: 7200000,
    isDownloaded: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 12,
    source: 'demo',
    isFavorite: false,
  },
  {
    id: 'demo_3',
    videoId: 'sample3',
    title: 'Electric Horizon (Deep Bass)',
    artist: 'Aura Soundscapes',
    thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    duration: 345,
    fileSize: 5800000,
    isDownloaded: true,
    addedAt: Date.now() - 1000 * 60 * 60 * 2,
    source: 'demo',
    isFavorite: true,
  },
];

const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: 'pl_favs',
    name: 'Favoritas ❤️',
    description: 'Suas músicas curtidas e mais tocadas',
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    songIds: ['demo_1', 'demo_3'],
    createdAt: Date.now() - 1000 * 60 * 60 * 48,
    isSystem: true,
  },
  {
    id: 'pl_synth',
    name: 'Eletrônica & Vibes ✨',
    description: 'Para focar, dirigir ou relaxar',
    coverUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
    songIds: ['demo_1', 'demo_2'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    isSystem: false,
  },
];

export async function loadSongs(): Promise<Song[]> {
  try {
    const raw = await AsyncStorage.getItem(SONGS_KEY);
    if (!raw) {
      await saveSongs(INITIAL_SONGS);
      return INITIAL_SONGS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load songs:', e);
    return INITIAL_SONGS;
  }
}

export async function saveSongs(songs: Song[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SONGS_KEY, JSON.stringify(songs));
  } catch (e) {
    console.error('Failed to save songs:', e);
  }
}

export async function loadPlaylists(): Promise<Playlist[]> {
  try {
    const raw = await AsyncStorage.getItem(PLAYLISTS_KEY);
    if (!raw) {
      await savePlaylists(INITIAL_PLAYLISTS);
      return INITIAL_PLAYLISTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load playlists:', e);
    return INITIAL_PLAYLISTS;
  }
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  try {
    await AsyncStorage.setItem(PLAYLISTS_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.error('Failed to save playlists:', e);
  }
}
