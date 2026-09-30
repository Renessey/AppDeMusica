export interface YouTubeMetadata {
  videoId: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: number;
}

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle various YouTube URL formats (putting [?&]v= first so query params like ?si= work!)
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/,
    /(?:(?:watch)?\?v=)([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Intelligently cleans raw video titles and parses artist from title or channel name.
 */
export function cleanYouTubeTitleAndArtist(
  rawTitle: string,
  channelName?: string
): { title: string; artist: string } {
  let title = (rawTitle || '').replace(/\s*-\s*YouTube$/i, '').trim();
  let artist = (channelName || 'YouTube')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/VEVO$/i, '')
    .trim();

  // Strip common noisy video metadata tags in parentheses or brackets
  title = title
    .replace(
      /\s*[\(\[]\s*(official\s*(music\s*)?video|video\s*oficial|áudio\s*oficial|audio\s*oficial|official\s*audio|clipe\s*oficial|lyric\s*video|vídeo\s*oficial|4k(\s*(upgrade|remaster(ed)?))?|hd|remaster(ed)?|remasterizado|videoclipe|visualizer|legendado)\s*[\)\]]/gi,
      ''
    )
    .trim();

  // If title has "Artist - Song", separate them cleanly!
  const splitMatch = title.match(/\s+[-–—]\s+/);
  if (splitMatch) {
    const parts = title.split(splitMatch[0]);
    const potentialArtist = parts[0].trim();
    const potentialTitle = parts.slice(1).join(splitMatch[0]).trim();
    if (potentialArtist && potentialTitle) {
      artist = potentialArtist;
      title = potentialTitle;
    }
  }

  return {
    title: title || rawTitle || 'Música do YouTube',
    artist: artist || channelName || 'YouTube',
  };
}

/**
 * Removes range and chunk-limiting query parameters so the full audio file can be downloaded.
 */
export function cleanAudioStreamUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parts = rawUrl.split('?');
    if (parts.length < 2) return rawUrl;
    const base = parts[0];
    const query = parts.slice(1).join('?');
    const params = query.split('&');
    const kept: string[] = [];
    for (let i = 0; i < params.length; i++) {
      const pair = params[i];
      if (!pair) continue;
      const key = pair.split('=')[0];
      if (key !== 'range' && key !== 'rn' && key !== 'rbuf') {
        kept.push(pair);
      }
    }
    return kept.length > 0 ? base + '?' + kept.join('&') : base;
  } catch {
    return rawUrl;
  }
}

/**
 * Fetches authentic metadata using YouTube's official oEmbed service.
 */
export async function fetchYouTubeMetadata(videoId: string): Promise<YouTubeMetadata> {
  const defaultThumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      const cleaned = cleanYouTubeTitleAndArtist(data.title, data.author_name);
      return {
        videoId,
        title: cleaned.title,
        artist: cleaned.artist,
        thumbnail: data.thumbnail_url || defaultThumb,
      };
    }
  } catch (e) {
    console.warn('oEmbed fetch error, using fallback:', e);
  }

  return {
    videoId,
    title: `Música (${videoId})`,
    artist: 'YouTube Artista',
    thumbnail: defaultThumb,
  };
}

export interface ResolvedAudioResult {
  streamUrl: string;
  format: 'mp3' | 'm4a';
  title?: string;
  artist?: string;
  thumbnail?: string;
}

/**
 * Resolves a direct audio stream URL using the built-in online resolver engine.
 * Converts and extracts high-quality audio directly without requiring WebView playback.
 */
export async function resolveYouTubeAudio(
  videoId: string,
  onProgress?: (progressPercent: number) => void
): Promise<ResolvedAudioResult | null> {
  const endpoints = [
    'https://loader.to/ajax/download.php',
    'https://en.loader.to/ajax/download.php',
    'https://pt.loader.to/ajax/download.php',
  ];

  for (const endpoint of endpoints) {
    try {
      onProgress?.(8);
      const targetUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const startUrl = `${endpoint}?format=mp3&url=${encodeURIComponent(targetUrl)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      let res: Response;
      try {
        res = await fetch(startUrl, { signal: controller.signal });
      } catch {
        continue;
      } finally {
        clearTimeout(timeoutId);
      }

      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !data.id) continue;

      onProgress?.(15);
      const pollUrl =
        data.progress_url || `https://loader.to/ajax/progress.php?id=${data.id}`;

      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(() => r(true), 1100));

        // Smoothly advance progress during cloud conversion: 15% -> 35%
        const simulatedProgress = Math.min(35, 15 + Math.round((i / 15) * 20));
        onProgress?.(simulatedProgress);

        const pollController = new AbortController();
        const pollTimeout = setTimeout(() => pollController.abort(), 6000);
        let pRes: Response;
        try {
          pRes = await fetch(pollUrl, { signal: pollController.signal });
        } catch {
          continue;
        } finally {
          clearTimeout(pollTimeout);
        }

        if (!pRes.ok) continue;
        const pData = await pRes.json();

        if (pData.download_url && pData.download_url.length > 5) {
          onProgress?.(40);
          const rawTitle = data.title || pData.title || '';
          const cleaned = rawTitle ? cleanYouTubeTitleAndArtist(rawTitle) : null;
          return {
            streamUrl: pData.download_url,
            format: 'mp3',
            title: cleaned?.title,
            artist: cleaned?.artist,
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          };
        }

        if (
          pData.success === 0 &&
          pData.text &&
          pData.text.toLowerCase().includes('error')
        ) {
          break;
        }
      }
    } catch (e) {
      console.warn('Direct audio resolve attempt failed:', endpoint, e);
    }
  }

  return null;
}


/**
 * JavaScript injected into m.youtube.com WebView.
 * Hooks fetch and XHR, catches both adaptive audio (itag 140, 251, 250, 249, etc.)
 * and progressive audio streams (itag 18, 22), extracts robust video IDs even with ?si=,
 * and exposes window.__REQUEST_AUDIO_STREAM(vid).
 */
export const YOUTUBE_INJECTED_JS = `
(function() {
  if (window.__YT_MUSIC_INJECTED__) return;
  window.__YT_MUSIC_INJECTED__ = true;

  // Unregister ServiceWorkers so they cannot bypass page fetch/XHR
  try {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function(regs) {
        for (var i = 0; i < (regs || []).length; i++) {
          regs[i].unregister();
        }
      });
    }
  } catch (e) {}

  var pendingMsgs = [];
  function postMsg(data) {
    try {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        while (pendingMsgs.length > 0) {
          var p = pendingMsgs.shift();
          window.ReactNativeWebView.postMessage(JSON.stringify(p));
        }
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      } else {
        pendingMsgs.push(data);
      }
    } catch (e) {}
  }

  // Periodic flush for pending messages
  setInterval(function() {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage && pendingMsgs.length > 0) {
      while (pendingMsgs.length > 0) {
        var p = pendingMsgs.shift();
        window.ReactNativeWebView.postMessage(JSON.stringify(p));
      }
    }
  }, 250);

  var foundStreams = {}; // pure audio
  var foundAnyStreams = {}; // fallback progressive streams (itag 18, 22)
  var lastReportedVideoId = '';
  var lastReportedTitle = '';

  function cleanStreamUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      var parts = rawUrl.split('?');
      if (parts.length < 2) return rawUrl;
      var base = parts[0];
      var query = parts.slice(1).join('?');
      var params = query.split('&');
      var kept = [];
      for (var i = 0; i < params.length; i++) {
        var pair = params[i];
        if (!pair) continue;
        var key = pair.split('=')[0];
        if (key !== 'range' && key !== 'rn' && key !== 'rbuf') {
          kept.push(pair);
        }
      }
      return kept.length > 0 ? base + '?' + kept.join('&') : base;
    } catch (e) {
      return rawUrl;
    }
  }

  function extractVid(u) {
    if (!u || typeof u !== 'string') return '';
    var m1 = u.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (m1 && m1[1]) return m1[1];
    var m2 = u.match(/(?:shorts\/|youtu\\.be\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (m2 && m2[1]) return m2[1];
    return '';
  }

  function getCurrentVideoId() {
    var vid = extractVid(location.href);
    if (vid) return vid;

    try {
      var p = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (p && p.getVideoData) {
        var d = p.getVideoData();
        if (d && d.video_id) return d.video_id;
      }
    } catch (e) {}

    try {
      if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
        var id = window.ytInitialPlayerResponse.videoDetails.videoId;
        if (id) return id;
      }
    } catch (e) {}

    try {
      var v = document.querySelector('video');
      if (v && v.src) {
        var vVid = extractVid(v.src);
        if (vVid) return vVid;
      }
    } catch (e) {}

    return lastReportedVideoId || '';
  }

  function classifyPlaybackUrl(url) {
    if (typeof url !== 'string' || url.indexOf('videoplayback') === -1) return null;

    // Pure audio itags
    var audioItags = ['itag=140', 'itag=251', 'itag=250', 'itag=249', 'itag=139', 'itag=171', 'itag=599', 'itag=600'];
    for (var i = 0; i < audioItags.length; i++) {
      if (url.indexOf(audioItags[i]) !== -1) return 'audio_pure';
    }
    if (
      url.indexOf('mime=audio') !== -1 ||
      url.indexOf('mime%2Faudio') !== -1 ||
      url.indexOf('audio%2F') !== -1 ||
      url.indexOf('audio/mp4') !== -1 ||
      url.indexOf('audio/webm') !== -1
    ) {
      return 'audio_pure';
    }

    // Progressive format (MP4 with 360p/720p video AND full stereo audio)
    if (url.indexOf('itag=18') !== -1 || url.indexOf('itag=22') !== -1) {
      return 'audio_progressive';
    }

    // Video-only itags to ignore
    var videoOnlyItags = ['itag=133', 'itag=134', 'itag=135', 'itag=136', 'itag=137', 'itag=160', 'itag=242', 'itag=243', 'itag=244', 'itag=247', 'itag=248', 'itag=278', 'itag=313'];
    for (var j = 0; j < videoOnlyItags.length; j++) {
      if (url.indexOf(videoOnlyItags[j]) !== -1) return 'video_only';
    }

    return 'candidate';
  }

  function getPageMetadata() {
    var vid = getCurrentVideoId();
    if (!vid) return null;

    var title = '';
    var artist = '';

    try {
      if (window.ytInitialPlayerResponse && window.ytInitialPlayerResponse.videoDetails) {
        var details = window.ytInitialPlayerResponse.videoDetails;
        if (details.videoId === vid) {
          title = details.title || '';
          artist = details.author || '';
        }
      }
    } catch (e) {}

    if (!title) {
      var h1 = document.querySelector('h1.title') || 
               document.querySelector('ytm-slim-video-metadata-section-renderer .title') ||
               document.querySelector('.slim-video-metadata-title') ||
               document.querySelector('h2.media-item-headline');
      if (h1 && h1.textContent) {
        title = h1.textContent.trim();
      }
    }

    if (!artist) {
      var channelEl = document.querySelector('ytm-slim-owner-renderer .sub-headline') ||
                      document.querySelector('.channel-name') ||
                      document.querySelector('.slim-owner-channel-name');
      if (channelEl && channelEl.textContent) {
        artist = channelEl.textContent.trim();
      }
    }

    if (!title && document.title && document.title.toLowerCase() !== 'youtube') {
      title = document.title.replace(' - YouTube', '').trim();
    }

    return {
      videoId: vid,
      title: title || '',
      artist: artist || '',
      thumbnail: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg'
    };
  }

  function notifyStreamFound(vid, cleanUrl) {
    if (!cleanUrl) return;
    var effectiveVid = vid || getCurrentVideoId();
    if (!effectiveVid) return;

    var meta = getPageMetadata() || {};
    postMsg({
      type: 'STREAM_FOUND',
      videoId: effectiveVid,
      streamUrl: cleanUrl,
      title: meta.title,
      artist: meta.artist,
      thumbnail: meta.thumbnail || ('https://i.ytimg.com/vi/' + effectiveVid + '/hqdefault.jpg')
    });
  }

  function handleInterceptedUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    var classification = classifyPlaybackUrl(rawUrl);
    if (!classification || classification === 'video_only') return;

    var vid = getCurrentVideoId();
    var clean = cleanStreamUrl(rawUrl);
    if (!clean) return;

    if (classification === 'audio_pure') {
      if (vid) foundStreams[vid] = clean;
      notifyStreamFound(vid, clean);
    } else if (classification === 'audio_progressive' || classification === 'candidate') {
      if (vid) foundAnyStreams[vid] = clean;
      if (!vid || !foundStreams[vid]) {
        notifyStreamFound(vid, clean);
      }
    }
  }

  // Intercept XHR
  var origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    try {
      if (typeof url === 'string') {
        handleInterceptedUrl(url);
      }
    } catch (e) {}
    return origXhrOpen.apply(this, arguments);
  };

  // Intercept fetch
  var origFetch = window.fetch;
  window.fetch = function() {
    try {
      var args = arguments;
      var targetUrl = '';
      if (typeof args[0] === 'string') {
        targetUrl = args[0];
      } else if (args[0] && typeof args[0].url === 'string') {
        targetUrl = args[0].url;
      } else if (args[0] && typeof args[0].href === 'string') {
        targetUrl = args[0].href;
      }
      if (targetUrl) {
        handleInterceptedUrl(targetUrl);
      }
    } catch (e) {}
    return origFetch.apply(this, arguments);
  };

  // Request audio stream on demand
  window.__REQUEST_AUDIO_STREAM = function(requestedVid) {
    var vid = requestedVid || getCurrentVideoId();
    if (vid) {
      if (foundStreams[vid]) {
        notifyStreamFound(vid, foundStreams[vid]);
        return;
      }
      if (foundAnyStreams[vid]) {
        notifyStreamFound(vid, foundAnyStreams[vid]);
        return;
      }
    }

    // Trigger video playback to force buffering
    try {
      var v = document.querySelector('video');
      if (v) {
        var p = v.play();
        if (p && p.catch) p.catch(function(){});
      }
      var player = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      if (player && player.playVideo) {
        player.playVideo();
      }
    } catch (e) {}
  };

  // Hook HTMLMediaElement play
  var origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function() {
    try {
      var src = this.src || this.currentSrc;
      if (src) {
        handleInterceptedUrl(src);
      }
    } catch (e) {}
    return origPlay.apply(this, arguments);
  };

  // Hook video element events
  function hookVideoEvents() {
    var v = document.querySelector('video');
    if (v && !v.__yt_music_hooked__) {
      v.__yt_music_hooked__ = true;
      var trigger = function() {
        var vid = getCurrentVideoId();
        var best = (vid && foundStreams[vid]) || (vid && foundAnyStreams[vid]);
        if (best) {
          notifyStreamFound(vid, best);
        } else {
          var src = v.src || v.currentSrc;
          if (src) handleInterceptedUrl(src);
        }
      };
      v.addEventListener('play', trigger);
      v.addEventListener('playing', trigger);
      v.addEventListener('timeupdate', trigger);
    }
  }

  // Periodic inspector for SPA navigation and DOM title changes
  function checkState() {
    hookVideoEvents();

    var vid = getCurrentVideoId();
    if (!vid) return;

    var meta = getPageMetadata();
    var title = meta ? meta.title : '';

    var isTitleValid = title && title.toLowerCase() !== 'youtube' && title.indexOf('Carregando') === -1;
    var isNewVideo = vid !== lastReportedVideoId;
    var isTitleUpdated = isTitleValid && title !== lastReportedTitle;

    if (isNewVideo || isTitleUpdated) {
      lastReportedVideoId = vid;
      if (isTitleValid) lastReportedTitle = title;

      var v = document.querySelector('video');
      var vDur = (v && v.duration && !isNaN(v.duration) && v.duration > 0) ? Math.round(v.duration) : 0;

      postMsg({
        type: 'VIDEO_DETECTED',
        videoId: vid,
        url: location.href,
        title: title || 'Vídeo Detectado',
        artist: (meta && meta.artist) || 'YouTube',
        thumbnail: 'https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg',
        streamUrl: foundStreams[vid] || foundAnyStreams[vid] || undefined,
        duration: vDur || undefined
      });
    }
  }

  setInterval(checkState, 400);
  checkState();

  window.addEventListener('yt-navigate-finish', checkState);
  window.addEventListener('popstate', checkState);
})();
true;
`;
