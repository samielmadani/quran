package com.quran.automotive

import android.content.Intent
import androidx.core.content.ContextCompat
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject

@CapacitorPlugin(name = "QuranAudio")
class QuranAudioPlugin : Plugin() {
    @PluginMethod
    fun initialize(call: PluginCall) {
        ContextCompat.startForegroundService(context, Intent(context, QuranPlaybackService::class.java))
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
        call.resolve()
    }

    @PluginMethod
    fun playAyah(call: PluginCall) {
        val service = requireService(call) ?: return
        val surah = call.getInt("surah")
        val ayah = call.getInt("ayah")
        if (surah == null || ayah == null) {
            call.reject("surah and ayah are required")
            return
        }
        service.playAyah(surah, ayah)
        call.resolve()
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        requireService(call)?.pause()
        call.resolve()
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        requireService(call)?.resume()
        call.resolve()
    }

    @PluginMethod
    fun nextAyah(call: PluginCall) {
        requireService(call)?.nextAyah()
        call.resolve()
    }

    @PluginMethod
    fun previousAyah(call: PluginCall) {
        requireService(call)?.previousAyah()
        call.resolve()
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        val service = requireService(call) ?: return
        service.seekTo(call.getLong("positionMs") ?: 0L)
        call.resolve()
    }

    @PluginMethod
    fun getState(call: PluginCall) {
        val service = requireService(call) ?: return
        val state = service.state()
        call.resolve(JSObject().apply {
            put("playing", state.playing)
            put("surah", state.surah)
            put("ayah", state.ayah)
            put("positionMs", state.positionMs)
            put("durationMs", state.durationMs)
        })
    }

    private fun requireService(call: PluginCall): QuranPlaybackService? {
        val service = QuranPlaybackService.instance
        if (service == null) call.reject("Quran audio is not initialized")
        return service
    }
}
