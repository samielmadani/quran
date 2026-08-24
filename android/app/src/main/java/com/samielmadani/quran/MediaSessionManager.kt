package com.samielmadani.quran

import android.content.Context
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession

class MediaSessionManager(context: Context) {
    private val player = ExoPlayer.Builder(context).build()
    private val session = MediaSession.Builder(context, player).build()

    fun release() {
        session.release()
        player.release()
    }
}
