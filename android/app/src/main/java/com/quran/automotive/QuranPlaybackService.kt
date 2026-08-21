package com.quran.automotive

import android.app.Service
import android.content.Intent
import android.os.IBinder

class QuranPlaybackService : Service() {
    override fun onBind(intent: Intent?): IBinder? = null
}
