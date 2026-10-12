package com.appmusic

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileInputStream

class AudioPlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private var currentSongId: String? = null
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null
    private var isPrepared = false

    override fun getName(): String = "AudioPlayerModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        } catch (t: Throwable) {
            Log.e("AudioPlayerModule", "Failed to send event: $eventName", t)
        }
    }

    private fun startProgressUpdates() {
        stopProgressUpdates()
        val handler = Handler(Looper.getMainLooper())
        progressHandler = handler
        val runnable = object : Runnable {
            override fun run() {
                try {
                    mediaPlayer?.let { player ->
                        if (isPrepared && player.isPlaying) {
                            val params = Arguments.createMap().apply {
                                putString("songId", currentSongId)
                                putInt("position", player.currentPosition)
                                putInt("duration", player.duration)
                            }
                            sendEvent("onPlaybackProgress", params)
                        }
                    }
                } catch (e: Exception) {
                    // Ignore state errors during async transitions
                }
                progressHandler?.postDelayed(this, 400)
            }
        }
        progressRunnable = runnable
        handler.post(runnable)
    }

    private fun stopProgressUpdates() {
        try {
            progressRunnable?.let { progressHandler?.removeCallbacks(it) }
        } catch (_: Exception) {}
        progressHandler = null
        progressRunnable = null
    }

    @ReactMethod
    fun play(urlOrPath: String, songId: String, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                stopProgressUpdates()
                mediaPlayer?.let {
                    try {
                        if (it.isPlaying) it.stop()
                    } catch (_: Exception) {}
                    try {
                        it.release()
                    } catch (_: Exception) {}
                }
                mediaPlayer = null
                isPrepared = false
                currentSongId = songId

                val cleanSource = if (urlOrPath.startsWith("file://")) {
                    try {
                        val parsed = Uri.parse(urlOrPath)
                        parsed.path ?: urlOrPath.substring(7)
                    } catch (_: Exception) {
                        urlOrPath.substring(7)
                    }
                } else {
                    urlOrPath
                }

                val player = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    try {
                        setWakeMode(reactContext.applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
                    } catch (_: Exception) {}

                    val localFile = File(cleanSource)
                    if (localFile.exists()) {
                        FileInputStream(localFile).use { fis ->
                            setDataSource(fis.fd)
                        }
                    } else if (cleanSource.startsWith("content://")) {
                        reactContext.contentResolver.openFileDescriptor(Uri.parse(cleanSource), "r")?.use { pfd ->
                            setDataSource(pfd.fileDescriptor)
                        }
                    } else {
                        setDataSource(cleanSource)
                    }

                    setOnPreparedListener { mp ->
                        try {
                            isPrepared = true
                            mp.start()
                            startProgressUpdates()
                            val stateParams = Arguments.createMap().apply {
                                putString("state", "PLAYING")
                                putString("songId", songId)
                                putInt("duration", mp.duration)
                                putInt("position", 0)
                            }
                            sendEvent("onPlaybackStateChange", stateParams)
                        } catch (t: Throwable) {
                            Log.e("AudioPlayerModule", "Error onPrepared", t)
                        }
                    }

                    setOnCompletionListener {
                        try {
                            stopProgressUpdates()
                            isPrepared = false

                            val stateParams = Arguments.createMap().apply {
                                putString("state", "COMPLETED")
                                putString("songId", songId)
                            }
                            sendEvent("onPlaybackStateChange", stateParams)

                            // CRITICAL: Must use a fresh WritableMap instance because stateParams was already consumed by the bridge
                            val completeParams = Arguments.createMap().apply {
                                putString("songId", songId)
                            }
                            sendEvent("onPlaybackComplete", completeParams)
                        } catch (t: Throwable) {
                            Log.e("AudioPlayerModule", "Error onCompletion", t)
                        }
                    }

                    setOnErrorListener { _, what, extra ->
                        try {
                            stopProgressUpdates()
                            isPrepared = false
                            val errParams = Arguments.createMap().apply {
                                putString("songId", songId)
                                putString("error", "Playback error: what=$what, extra=$extra")
                            }
                            sendEvent("onPlaybackError", errParams)
                        } catch (t: Throwable) {
                            Log.e("AudioPlayerModule", "Error onError", t)
                        }
                        true
                    }
                }

                mediaPlayer = player
                val bufferParams = Arguments.createMap().apply {
                    putString("state", "BUFFERING")
                    putString("songId", songId)
                }
                sendEvent("onPlaybackStateChange", bufferParams)
                player.prepareAsync()
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e("AudioPlayerModule", "play error: ${e.message}", e)
                promise.reject("PLAY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                mediaPlayer?.let {
                    if (isPrepared && it.isPlaying) {
                        it.pause()
                        stopProgressUpdates()
                        val stateParams = Arguments.createMap().apply {
                            putString("state", "PAUSED")
                            putString("songId", currentSongId)
                            putInt("position", it.currentPosition)
                            putInt("duration", it.duration)
                        }
                        sendEvent("onPlaybackStateChange", stateParams)
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("PAUSE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun resume(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                mediaPlayer?.let {
                    if (isPrepared && !it.isPlaying) {
                        it.start()
                        startProgressUpdates()
                        val stateParams = Arguments.createMap().apply {
                            putString("state", "PLAYING")
                            putString("songId", currentSongId)
                            putInt("position", it.currentPosition)
                            putInt("duration", it.duration)
                        }
                        sendEvent("onPlaybackStateChange", stateParams)
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("RESUME_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun stop(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                stopProgressUpdates()
                mediaPlayer?.let {
                    try {
                        if (it.isPlaying) it.stop()
                    } catch (_: Exception) {}
                    try {
                        it.release()
                    } catch (_: Exception) {}
                }
                mediaPlayer = null
                isPrepared = false
                val stateParams = Arguments.createMap().apply {
                    putString("state", "STOPPED")
                    putString("songId", currentSongId)
                }
                sendEvent("onPlaybackStateChange", stateParams)
                currentSongId = null
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("STOP_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun seekTo(positionMs: Int, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                mediaPlayer?.let {
                    if (isPrepared) {
                        it.seekTo(positionMs)
                    }
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("SEEK_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getCurrentPosition(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                val pos = if (isPrepared) mediaPlayer?.currentPosition ?: 0 else 0
                val dur = if (isPrepared) mediaPlayer?.duration ?: 0 else 0
                val map = Arguments.createMap().apply {
                    putInt("position", pos)
                    putInt("duration", dur)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                val map = Arguments.createMap().apply {
                    putInt("position", 0)
                    putInt("duration", 0)
                }
                promise.resolve(map)
            }
        }
    }

    @ReactMethod
    fun isPlaying(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                promise.resolve(if (isPrepared) mediaPlayer?.isPlaying ?: false else false)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @Suppress("DEPRECATION")
    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        stopProgressUpdates()
        try {
            mediaPlayer?.release()
        } catch (_: Exception) {}
        mediaPlayer = null
        isPrepared = false
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
