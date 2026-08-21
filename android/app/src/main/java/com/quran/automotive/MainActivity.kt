package com.quran.automotive

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(QuranAudioPlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
