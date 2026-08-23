package com.quran.automotive

import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import org.json.JSONObject
import java.io.File
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
    var activeReciterId: String = "badr-al-turki"

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
        val range = timingData[surah]?.get(ayah)
        currentSurah = surah
        currentAyah = ayah
        val startMs = range?.startMs ?: 0L
        pendingSeekMs = startMs
        val mediaId = "${activeReciterId}_$surah"

        if (player.currentMediaItem?.mediaId == mediaId) {
            player.seekTo(startMs)
            player.play()
            emitState()
            return
        }

        val mediaItem = resolveMediaItem(surah, ayah, mediaId)
        if (mediaItem == null) {
            emitState()
            return
        }

        player.setMediaItem(mediaItem)
        player.prepare()
        player.seekTo(startMs)
        player.play()
        emitState()
    }

    private fun getReciterUrl(reciterId: String, surah: Int): String {
        val padded = String.format(Locale.US, "%03d", surah)
        return when (reciterId) {
            "mishari-alafasy" -> "https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/$surah.mp3"
            "mahmoud-al-husary" -> "https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/$surah.mp3"
            "abdul-basit-murattal" -> "https://download.quranicaudio.com/qdc/abdul_baset/murattal/$surah.mp3"
            "muhammad-siddiq-al-minshawi" -> "https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/$surah.mp3"
            "maher-al-muaiqly" -> "https://server12.mp3quran.net/maher/$padded.mp3"
            "yasser-al-dosari" -> "https://server11.mp3quran.net/yasser/$padded.mp3"
            "saad-al-ghamdi" -> "https://server7.mp3quran.net/s_gmd/$padded.mp3"
            "abu-bakr-al-shatri" -> "https://download.quranicaudio.com/qdc/abu_bakr_shatri/murattal/$surah.mp3"
            "nasser-al-qatami" -> "https://server6.mp3quran.net/qtm/$padded.mp3"
            "abdullah-awad-al-juhany" -> "https://server13.mp3quran.net/jhn/$padded.mp3"
            "abdul-rahman-al-sudais" -> "https://download.quranicaudio.com/qdc/abdurrahmaan_as_sudais/murattal/$surah.mp3"
            "fares-abbad" -> "https://server8.mp3quran.net/frs_a/$padded.mp3"
            "ahmed-al-ajmi" -> "https://server10.mp3quran.net/ajm/$padded.mp3"
            else -> "https://server10.mp3quran.net/bader/Rewayat-Hafs-A-n-Assem/$padded.mp3"
        }
    }

    private fun resolveMediaItem(surah: Int, ayah: Int, mediaId: String): MediaItem? {
        val padded = String.format(Locale.US, "%03d.mp3", surah)
        val metadata = MediaMetadata.Builder()
            .setTitle("Surah $surah — Ayah $ayah")
            .setArtist(activeReciterId)
            .setAlbumTitle("The Holy Quran — القرآن الكريم")
            .build()
        
        // 1. Check internal filesDir
        val internalFile = File(filesDir, "reciters/$activeReciterId/$padded")
        if (internalFile.exists() && internalFile.length() > 0) {
            return MediaItem.Builder()
                .setUri(Uri.fromFile(internalFile))
                .setMediaId(mediaId)
                .setMediaMetadata(metadata)
                .build()
        }

        // 2. Check external files dir
        val externalDir = getExternalFilesDir(null)
        if (externalDir != null) {
            val externalFile = File(externalDir, "reciters/$activeReciterId/$padded")
            if (externalFile.exists() && externalFile.length() > 0) {
                return MediaItem.Builder()
                    .setUri(Uri.fromFile(externalFile))
                    .setMediaId(mediaId)
                    .setMediaMetadata(metadata)
                    .build()
            }
        }

        // 3. Fallback to remote streaming URL
        val remoteUrl = getReciterUrl(activeReciterId, surah)
        return MediaItem.Builder()
            .setUri(Uri.parse(remoteUrl))
            .setMediaId(mediaId)
            .setMediaMetadata(metadata)
            .build()
    }

    fun pause() = player.pause()

    fun resume() {
        if (player.currentMediaItem == null) {
            playAyah(currentSurah, currentAyah)
        } else {
            player.play()
        }
    }

    fun nextAyah() {
        val next = currentAyah + 1
        if (timingData[currentSurah]?.containsKey(next) == true) {
            playAyah(currentSurah, next)
        }
    }

    fun previousAyah() {
        val previous = (currentAyah - 1).coerceAtLeast(1)
        if (timingData[currentSurah]?.containsKey(previous) == true) {
            playAyah(currentSurah, previous)
        }
    }

    fun seekTo(positionMs: Long) {
        player.seekTo(positionMs.coerceAtLeast(0))
        emitState()
    }

    fun setTimingJson(json: String) {
        try {
            timingData.clear()
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
        } catch (e: Exception) {
            e.printStackTrace()
        }
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
        try {
            val json = assets.open("public/data/badrAlTurkiTimings.json").use { it.readBytes().toString(Charsets.UTF_8) }
            setTimingJson(json)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}

data class AyahRange(val startMs: Long, val endMs: Long)
