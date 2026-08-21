package com.quran.automotive

import android.content.Context
import androidx.media3.session.MediaSession

class MediaSessionManager(context: Context) {
    private val session = MediaSession.Builder(context, null).build()

    fun release() {
        session.release()
    }
}
