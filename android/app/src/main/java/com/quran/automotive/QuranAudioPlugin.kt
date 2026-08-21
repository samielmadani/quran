package com.quran.automotive

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "QuranAudio")
class QuranAudioPlugin : Plugin() {
    @PluginMethod
    fun initialize(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun playAyah(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun pause(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun resume(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun nextAyah(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun previousAyah(call: PluginCall) {
        call.resolve()
    }

    @PluginMethod
    fun seekTo(call: PluginCall) {
        call.resolve()
    }
}
