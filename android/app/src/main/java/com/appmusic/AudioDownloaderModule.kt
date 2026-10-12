package com.appmusic

import android.media.MediaMetadataRetriever
import android.os.Environment
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors

class AudioDownloaderModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val executor = Executors.newFixedThreadPool(3)
    private val activeDownloads = ConcurrentHashMap<String, HttpURLConnection>()

    override fun getName(): String = "AudioDownloaderModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        try {
            if (reactContext.hasActiveReactInstance()) {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            }
        } catch (_: Throwable) {}
    }

    @ReactMethod
    fun downloadAudio(
        streamUrl: String,
        songId: String,
        fileName: String,
        title: String,
        artist: String,
        promise: Promise
    ) {
        executor.execute {
            var connection: HttpURLConnection? = null
            var inputStream: InputStream? = null
            var outputStream: FileOutputStream? = null

            try {
                val musicDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
                    ?: File(reactContext.filesDir, "music")
                if (!musicDir.exists()) {
                    musicDir.mkdirs()
                }

                val safeName = fileName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                val finalFileName = if (safeName.endsWith(".m4a") || safeName.endsWith(".mp3") || safeName.endsWith(".webm")) {
                    safeName
                } else {
                    "$safeName.m4a"
                }

                val targetFile = File(musicDir, finalFileName)
                val tempFile = File(musicDir, "${finalFileName}.tmp")

                var currentUrl = streamUrl
                var redirectCount = 0
                var responseCode = -1

                while (redirectCount < 5) {
                    val url = URL(currentUrl)
                    connection = (url.openConnection() as HttpURLConnection).apply {
                        connectTimeout = 20000
                        readTimeout = 40000
                        instanceFollowRedirects = true
                        setRequestProperty(
                            "User-Agent",
                            "Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
                        )
                        setRequestProperty("Accept", "*/*")
                        setRequestProperty("Accept-Encoding", "identity")
                        setRequestProperty("Connection", "keep-alive")
                        if (currentUrl.contains("googlevideo.com")) {
                            setRequestProperty("Referer", "https://m.youtube.com/")
                            setRequestProperty("Origin", "https://m.youtube.com")
                        }
                    }

                    activeDownloads[songId] = connection
                    connection.connect()
                    responseCode = connection.responseCode

                    if (responseCode in 301..308) {
                        val location = connection.getHeaderField("Location")
                        if (!location.isNullOrEmpty()) {
                            connection.disconnect()
                            currentUrl = URL(URL(currentUrl), location).toString()
                            redirectCount++
                            continue
                        }
                    }
                    break
                }

                if (responseCode !in 200..299 || connection == null) {
                    throw Exception("HTTP Error: $responseCode ${connection?.responseMessage ?: ""}")
                }

                val activeConn = connection!!
                val totalBytes = activeConn.contentLengthLong
                val stream = activeConn.inputStream
                inputStream = stream
                val fileOut = FileOutputStream(tempFile)
                outputStream = fileOut

                val buffer = ByteArray(8192)
                var bytesRead: Int
                var totalRead: Long = 0
                var lastProgressUpdate: Long = 0

                while (stream.read(buffer).also { bytesRead = it } != -1) {
                    fileOut.write(buffer, 0, bytesRead)
                    totalRead += bytesRead

                    val now = System.currentTimeMillis()
                    if (now - lastProgressUpdate > 250) {
                        lastProgressUpdate = now
                        val effectiveTotal = if (totalBytes > 0) totalBytes else 4_500_000L
                        val progress = if (totalBytes > 0) {
                            ((totalRead * 100) / totalBytes).toInt().coerceIn(1, 99)
                        } else {
                            ((totalRead * 100) / effectiveTotal).toInt().coerceIn(5, 96)
                        }
                        val progressParams = Arguments.createMap().apply {
                            putString("songId", songId)
                            putInt("progress", progress)
                            putDouble("bytesRead", totalRead.toDouble())
                            putDouble("totalBytes", effectiveTotal.toDouble())
                        }
                        sendEvent("onDownloadProgress", progressParams)
                    }
                }

                fileOut.flush()
                fileOut.close()
                outputStream = null
                stream.close()
                inputStream = null

                if (targetFile.exists()) {
                    targetFile.delete()
                }
                tempFile.renameTo(targetFile)

                activeDownloads.remove(songId)

                val completeParams = Arguments.createMap().apply {
                    putString("songId", songId)
                    putInt("progress", 100)
                    putDouble("bytesRead", targetFile.length().toDouble())
                    putDouble("totalBytes", targetFile.length().toDouble())
                }
                sendEvent("onDownloadProgress", completeParams)

                var durationInSeconds = 0
                val retriever = MediaMetadataRetriever()
                try {
                    retriever.setDataSource(targetFile.absolutePath)
                    val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                    val durationMs = durationStr?.toLongOrNull() ?: 0L
                    durationInSeconds = (durationMs / 1000).toInt()
                } catch (_: Exception) {
                } finally {
                    try { retriever.release() } catch (_: Exception) {}
                }

                val resultMap = Arguments.createMap().apply {
                    putString("songId", songId)
                    putString("filePath", targetFile.absolutePath)
                    putString("fileUri", "file://${targetFile.absolutePath}")
                    putDouble("fileSize", targetFile.length().toDouble())
                    putInt("duration", durationInSeconds)
                }
                promise.resolve(resultMap)

            } catch (e: Exception) {
                activeDownloads.remove(songId)
                val errParams = Arguments.createMap().apply {
                    putString("songId", songId)
                    putString("error", e.message ?: "Falha no download")
                }
                sendEvent("onDownloadError", errParams)
                promise.reject("DOWNLOAD_ERROR", e.message, e)
            } finally {
                try { outputStream?.close() } catch (_: Exception) {}
                try { inputStream?.close() } catch (_: Exception) {}
                try { connection?.disconnect() } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun cancelDownload(songId: String, promise: Promise) {
        try {
            val conn = activeDownloads.remove(songId)
            conn?.disconnect()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun deleteAudioFile(filePath: String, promise: Promise) {
        try {
            val cleanPath = filePath.replace("file://", "")
            val file = File(cleanPath)
            if (file.exists()) {
                val deleted = file.delete()
                promise.resolve(deleted)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("DELETE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getMusicDir(promise: Promise) {
        try {
            val musicDir = reactContext.getExternalFilesDir(Environment.DIRECTORY_MUSIC)
                ?: File(reactContext.filesDir, "music")
            promise.resolve(musicDir.absolutePath)
        } catch (e: Exception) {
            promise.reject("DIR_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun getAudioDuration(filePathOrUri: String, promise: Promise) {
        executor.execute {
            val retriever = MediaMetadataRetriever()
            try {
                val cleanPath = if (filePathOrUri.startsWith("file://")) {
                    filePathOrUri.substring(7)
                } else {
                    filePathOrUri
                }
                retriever.setDataSource(cleanPath)
                val durationStr = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)
                val durationMs = durationStr?.toLongOrNull() ?: 0L
                val durationSec = (durationMs / 1000).toInt()
                promise.resolve(durationSec)
            } catch (e: Exception) {
                promise.resolve(0)
            } finally {
                try { retriever.release() } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
