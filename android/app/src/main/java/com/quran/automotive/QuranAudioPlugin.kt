package com.quran.automotive

import android.content.Intent
import android.os.Handler
import android.os.Looper
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject

@CapacitorPlugin(name = "QuranAudio")
class QuranAudioPlugin : Plugin() {
    private val mainHandler = Handler(Looper.getMainLooper())

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
        withService(call) { it.playAyah(surah, ayah) }
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
