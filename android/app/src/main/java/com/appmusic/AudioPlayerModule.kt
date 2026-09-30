package com.appmusic

import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Handler
import android.os.Looper
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AudioPlayerModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var mediaPlayer: MediaPlayer? = null
    private var currentSongId: String? = null
    private var progressHandler: Handler? = null
    private var progressRunnable: Runnable? = null
    private var isPrepared = false

    override fun getName(): String = "AudioPlayerModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }

    private fun startProgressUpdates() {
        stopProgressUpdates()
        progressHandler = Handler(Looper.getMainLooper())
        progressRunnable = object : Runnable {
            override fun run() {
                mediaPlayer?.let { player ->
                    try {
                        if (player.isPlaying) {
                            val params = Arguments.createMap().apply {
                                putString("songId", currentSongId)
                                putInt("position", player.currentPosition)
                                putInt("duration", player.duration)
                            }
                            sendEvent("onPlaybackProgress", params)
                        }
                    } catch (e: Exception) {
                        // ignore state errors during async transitions
                    }
                }
                progressHandler?.postDelayed(this, 400)
            }
        }
        progressHandler?.post(progressRunnable!!)
    }

    private fun stopProgressUpdates() {
        progressRunnable?.let { progressHandler?.removeCallbacks(it) }
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
                    it.release()
                }
                mediaPlayer = null
                isPrepared = false
                currentSongId = songId

                val cleanSource = if (urlOrPath.startsWith("file://")) {
                    urlOrPath.substring(7)
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
                    setDataSource(cleanSource)
                    setOnPreparedListener { mp ->
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
                    }
                    setOnCompletionListener {
                        stopProgressUpdates()
                        val stateParams = Arguments.createMap().apply {
                            putString("state", "COMPLETED")
                            putString("songId", songId)
                        }
                        sendEvent("onPlaybackStateChange", stateParams)
                        sendEvent("onPlaybackComplete", stateParams)
                    }
                    setOnErrorListener { _, what, extra ->
                        stopProgressUpdates()
                        val errParams = Arguments.createMap().apply {
                            putString("songId", songId)
                            putString("error", "Playback error: what=$what, extra=$extra")
                        }
                        sendEvent("onPlaybackError", errParams)
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
                promise.reject("PLAY_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun pause(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                mediaPlayer?.let {
                    if (it.isPlaying) {
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
                    if (!it.isPlaying && isPrepared) {
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
                    it.release()
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
                val pos = mediaPlayer?.currentPosition ?: 0
                val dur = mediaPlayer?.duration ?: 0
                val map = Arguments.createMap().apply {
                    putInt("position", pos)
                    putInt("duration", dur)
                }
                promise.resolve(map)
            } catch (e: Exception) {
                promise.reject("GET_POS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun isPlaying(promise: Promise) {
        UiThreadUtil.runOnUiThread {
            try {
                promise.resolve(mediaPlayer?.isPlaying ?: false)
            } catch (e: Exception) {
                promise.resolve(false)
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
