package com.quran.automotive

import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors

@CapacitorPlugin(name = "QuranAudio")
class QuranAudioPlugin : Plugin() {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val downloadExecutor = Executors.newFixedThreadPool(3)

    @PluginMethod
    fun initialize(call: PluginCall) {
        QuranPlaybackService.setPendingListener { state ->
            val event = JSObject()
            event.put("surah", state.surah)
            event.put("ayah", state.ayah)
            event.put("playing", state.playing)
            event.put("positionMs", state.positionMs)
            event.put("durationMs", state.durationMs)
            notifyListeners("playbackStateChanged", event)
            notifyListeners("ayahChanged", event)
        }
        context.startService(Intent(context, QuranPlaybackService::class.java))
        waitForService(call)
    }

    @PluginMethod
    fun playAyah(call: PluginCall) {
        val surah = call.getInt("surah")
        val ayah = call.getInt("ayah")
        if (surah == null || ayah == null) {
            call.reject("surah and ayah are required")
            return
        }
        val positionMs = call.getLong("positionMs")
        withService(call) { it.playAyah(surah, ayah, positionMs) }
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        withService(call) { it.pause() }
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        withService(call) { it.resume() }
    }

    @PluginMethod
    fun nextAyah(call: PluginCall) {
        withService(call) { it.nextAyah() }
    }

    @PluginMethod
    fun previousAyah(call: PluginCall) {
        withService(call) { it.previousAyah() }
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val positionMs = call.getLong("positionMs") ?: 0L
        withService(call) { it.seekTo(positionMs) }
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        mainHandler.post {
            val service = requireService(call) ?: return@post
            try {
                val state = service.state()
                call.resolve(JSObject().apply {
                    put("playing", state.playing)
                    put("surah", state.surah)
                    put("ayah", state.ayah)
                    put("positionMs", state.positionMs)
                    put("durationMs", state.durationMs)
                })
            } catch (error: Exception) {
                call.reject("Unable to read Quran playback state", error)
            }
        }
    }

    @PluginMethod
    fun setActiveReciter(call: PluginCall) {
        val reciterId = call.getString("reciterId")
        if (reciterId.isNullOrEmpty()) {
            call.reject("reciterId is required")
            return
        }
        withService(call) { service ->
            service.activeReciterId = reciterId
        }
    }

    @PluginMethod
    fun getActiveReciter(call: PluginCall) {
        val service = QuranPlaybackService.instance
        val active = service?.activeReciterId ?: "badr-al-turki"
        call.resolve(JSObject().apply {
            put("reciterId", active)
        })
    }

    @PluginMethod
    fun setTimingData(call: PluginCall) {
        val timingsJson = call.getString("timingsJson")
        if (timingsJson.isNullOrEmpty()) {
            call.reject("timingsJson is required")
            return
        }
        withService(call) { service ->
            service.setTimingJson(timingsJson)
        }
    }

    @PluginMethod
    fun getDownloadedSurahs(call: PluginCall) {
        val reciterId = call.getString("reciterId")
        if (reciterId.isNullOrEmpty()) {
            call.reject("reciterId is required")
            return
        }

        downloadExecutor.execute {
            try {
                val targetDir = File(context.filesDir, "reciters/$reciterId")
                val surahs = mutableListOf<Int>()
                if (targetDir.exists() && targetDir.isDirectory) {
                    val files = targetDir.listFiles() ?: emptyArray()
                    for (file in files) {
                        if (file.isFile && file.length() > 0 && file.name.endsWith(".mp3")) {
                            val baseName = file.name.removeSuffix(".mp3")
                            val num = baseName.toIntOrNull()
                            if (num != null && num in 1..114) {
                                surahs.add(num)
                            }
                        }
                    }
                }
                surahs.sort()

                mainHandler.post {
                    val array = JSArray()
                    for (s in surahs) {
                        array.put(s)
                    }
                    val result = JSObject()
                    result.put("surahs", array)
                    call.resolve(result)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    call.reject("Failed to list downloaded surahs", e)
                }
            }
        }
    }

    @PluginMethod
    fun downloadSurah(call: PluginCall) {
        val reciterId = call.getString("reciterId")
        val surah = call.getInt("surah")
        val urlString = call.getString("url")

        if (reciterId.isNullOrEmpty() || surah == null || urlString.isNullOrEmpty()) {
            call.reject("reciterId, surah, and url are required")
            return
        }

        downloadExecutor.execute {
            var connection: HttpURLConnection? = null
            try {
                val targetDir = File(context.filesDir, "reciters/$reciterId")
                if (!targetDir.exists()) {
                    targetDir.mkdirs()
                }

                val padded = String.format(Locale.US, "%03d.mp3", surah)
                val targetFile = File(targetDir, padded)
                val tempFile = File(targetDir, "$padded.tmp")

                val url = URL(urlString)
                connection = url.openConnection() as HttpURLConnection
                connection.connectTimeout = 15000
                connection.readTimeout = 30000
                connection.instanceFollowRedirects = true
                connection.connect()

                if (connection.responseCode !in 200..299) {
                    throw Exception("HTTP error ${connection.responseCode}: ${connection.responseMessage}")
                }

                connection.inputStream.use { input ->
                    FileOutputStream(tempFile).use { output ->
                        input.copyTo(output)
                    }
                }

                if (tempFile.exists() && tempFile.length() > 0) {
                    if (targetFile.exists()) {
                        targetFile.delete()
                    }
                    tempFile.renameTo(targetFile)
                } else {
                    throw Exception("Downloaded file is empty")
                }

                mainHandler.post {
                    val result = JSObject().apply {
                        put("success", true)
                        put("surah", surah)
                        put("bytes", targetFile.length())
                    }
                    call.resolve(result)
                }
            } catch (e: Exception) {
                mainHandler.post {
                    call.reject("Download failed for surah $surah: ${e.message}", e)
                }
            } finally {
                connection?.disconnect()
            }
        }
    }

    @PluginMethod
    fun deleteReciter(call: PluginCall) {
        val reciterId = call.getString("reciterId")
        if (reciterId.isNullOrEmpty()) {
            call.reject("reciterId is required")
            return
        }

        downloadExecutor.execute {
            try {
                val targetDir = File(context.filesDir, "reciters/$reciterId")
                if (targetDir.exists()) {
                    targetDir.deleteRecursively()
                }
                mainHandler.post {
                    call.resolve(JSObject().apply {
                        put("success", true)
                    })
                }
            } catch (e: Exception) {
                mainHandler.post {
                    call.reject("Failed to delete reciter: ${e.message}", e)
                }
            }
        }
    }

    private fun requireService(call: PluginCall): QuranPlaybackService? {
        val service = QuranPlaybackService.instance
        if (service == null) call.reject("Quran audio is not initialized")
        return service
    }

    private fun withService(call: PluginCall, action: (QuranPlaybackService) -> Unit) {
        mainHandler.post {
            val service = requireService(call) ?: return@post
            try {
                action(service)
                call.resolve()
            } catch (error: Exception) {
                call.reject("Quran audio operation failed", error)
            }
        }
    }

    private fun waitForService(call: PluginCall) {
        val handler = Handler(Looper.getMainLooper())
        var attempts = 0
        val check = object : Runnable {
            override fun run() {
                if (QuranPlaybackService.instance != null) {
                    call.resolve()
                    return
                }
                if (attempts++ >= 40) {
                    call.reject("Quran audio service failed to start")
                    return
                }
                handler.postDelayed(this, 50)
            }
        }
        handler.post(check)
    }
}
