package com.quran.automotive

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import org.json.JSONObject
import java.util.Locale

data class NativePlaybackState(
    val playing: Boolean,
    val surah: Int,
    val ayah: Int,
    val positionMs: Long,
    val durationMs: Long,
)

class QuranPlaybackService : MediaSessionService() {
    companion object {
        var instance: QuranPlaybackService? = null
            private set
        private var pendingListener: ((NativePlaybackState) -> Unit)? = null

        fun setPendingListener(listener: (NativePlaybackState) -> Unit) {
            pendingListener = listener
            instance?.setEventListener(listener)
        }
    }

    private lateinit var player: ExoPlayer
    private lateinit var mediaSession: MediaSession
    private val handler = Handler(Looper.getMainLooper())
    private val timingData = mutableMapOf<Int, Map<Int, AyahRange>>()
    private var currentSurah = 1
    private var currentAyah = 1
    private var pendingSeekMs: Long? = null
    private var eventListener: ((NativePlaybackState) -> Unit)? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
        loadTimingData()
        player = ExoPlayer.Builder(this).build().apply {
            addListener(object : Player.Listener {
                override fun onIsPlayingChanged(isPlaying: Boolean) = emitState()
                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_READY) applyPendingSeek()
                    emitState()
                }
            })
        }
        mediaSession = MediaSession.Builder(this, player).build()
        pendingListener?.let(::setEventListener)
        handler.post(positionPoller)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession = mediaSession

    override fun onDestroy() {
        handler.removeCallbacks(positionPoller)
        eventListener = null
        mediaSession.release()
        player.release()
        instance = null
        super.onDestroy()
    }

    fun setEventListener(listener: ((NativePlaybackState) -> Unit)?) {
        eventListener = listener
        emitState()
    }

    fun playAyah(surah: Int, ayah: Int) {
        val range = timingData[surah]?.get(ayah) ?: return
        currentSurah = surah
        currentAyah = ayah
        pendingSeekMs = range.startMs
        val mediaId = surah.toString()
        if (player.currentMediaItem?.mediaId == mediaId) {
            player.seekTo(range.startMs)
            player.play()
            emitState()
            return
        }

        val audioPath = String.format(Locale.US, "asset:///public/assets/audio/%03d.mp3", surah)
        val mediaItem = MediaItem.Builder().setUri(audioPath).setMediaId(mediaId).build()
        player.setMediaItem(mediaItem)
        player.prepare()
        player.seekTo(range.startMs)
        player.play()
        emitState()
    }

    fun pause() = player.pause()

    fun resume() = player.play()

    fun nextAyah() {
        val next = currentAyah + 1
        if (timingData[currentSurah]?.containsKey(next) == true) playAyah(currentSurah, next)
    }

    fun previousAyah() {
        val previous = (currentAyah - 1).coerceAtLeast(1)
        if (timingData[currentSurah]?.containsKey(previous) == true) playAyah(currentSurah, previous)
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs.coerceAtLeast(0))
        emitState()
    }

    fun state() = NativePlaybackState(
        player.isPlaying,
        currentSurah,
        currentAyah,
        player.currentPosition,
        player.duration.coerceAtLeast(0),
    )

    private val positionPoller = object : Runnable {
        override fun run() {
            val position = player.currentPosition
            val pendingStart = pendingSeekMs
            if (pendingStart != null && position < pendingStart) {
                handler.postDelayed(this, 250)
                return
            }
            pendingSeekMs = null
            val ayah = timingData[currentSurah]?.entries
                ?.sortedBy { it.key }
                ?.firstOrNull { position >= it.value.startMs && position < it.value.endMs }
                ?.key
            if (ayah != null && ayah != currentAyah) {
                currentAyah = ayah
                emitState()
            }
            handler.postDelayed(this, 250)
        }
    }

    private fun emitState() {
        eventListener?.invoke(state())
    }

    private fun applyPendingSeek() {
        pendingSeekMs?.let { player.seekTo(it); player.play() }
    }

    private fun loadTimingData() {
        val json = assets.open("public/data/badrAlTurkiTimings.json").use { it.readBytes().toString(Charsets.UTF_8) }
        val surahs = JSONObject(json)
        for (surahKey in surahs.keys()) {
            val ayahs = surahs.getJSONObject(surahKey)
            val ranges = mutableMapOf<Int, AyahRange>()
            for (ayahKey in ayahs.keys()) {
                val range = ayahs.getJSONObject(ayahKey)
                ranges[ayahKey.toInt()] = AyahRange(range.getLong("startMs"), range.getLong("endMs"))
            }
            timingData[surahKey.toInt()] = ranges
        }
    }
}

data class AyahRange(val startMs: Long, val endMs: Long)
