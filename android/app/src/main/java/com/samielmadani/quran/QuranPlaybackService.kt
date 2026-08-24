package com.samielmadani.quran

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.DefaultMediaNotificationProvider
import androidx.media3.session.CommandButton
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService
import androidx.media3.session.MediaStyleNotificationHelper
import androidx.media3.session.SessionCommand
import androidx.media3.session.SessionResult
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture
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
        private const val MEDIA_REPEAT_KEY_CODE = 274
        private const val NOTIFICATION_CHANNEL_ID = "quran_playback"
        private const val NOTIFICATION_ID = 1001
        private const val ACTION_PLAY_PAUSE = "com.samielmadani.quran.PLAY_PAUSE"
        private const val ACTION_PREVIOUS = "com.samielmadani.quran.PREVIOUS"
        private const val ACTION_NEXT = "com.samielmadani.quran.NEXT"
        private val surahNames = listOf(
            "", "Al-Fatiha", "Al-Baqarah", "Aal-E-Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus", "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Ta-Ha", "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-Ankabut", "Ar-Rum", "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir", "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf", "Adh-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah", "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij", "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba", "An-Nazi'at", "Abasa", "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad", "Ash-Shams", "Al-Layl", "Ad-Duha", "Ash-Sharh", "At-Tin", "Al-Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-Adiyat", "Al-Qari'ah", "At-Takathur", "Al-Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr", "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas",
        )
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
    private val previousAyahCommand = SessionCommand("com.samielmadani.quran.PREVIOUS_AYAH", Bundle.EMPTY)
    private val nextAyahCommand = SessionCommand("com.samielmadani.quran.NEXT_AYAH", Bundle.EMPTY)
    private val handler = Handler(Looper.getMainLooper())
    private val statePreferences by lazy { getSharedPreferences("quran_playback", MODE_PRIVATE) }
    private val timingData = mutableMapOf<Int, Map<Int, AyahRange>>()
    private var currentSurah = 1
    private var currentAyah = 1
    private var pendingSeekMs: Long? = null
    private var eventListener: ((NativePlaybackState) -> Unit)? = null
    private var repeatSingle = false
    private var repeatMode = "continuous"
    var activeReciterId: String = "badr-al-turki"
        set(value) {
            field = value
            if (::player.isInitialized) {
                persistState()
                updateSessionMetadata()
            }
        }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        setMediaNotificationProvider(
            DefaultMediaNotificationProvider(this).apply {
                setSmallIcon(R.mipmap.ic_launcher)
            },
        )
        instance = this
        restorePersistedState()
        loadTimingData()
        player = ExoPlayer.Builder(this).build().apply {
            setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(C.USAGE_MEDIA)
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .build(),
                true,
            )
            setHandleAudioBecomingNoisy(true)
            addListener(object : Player.Listener {
                override fun onPlaybackStateChanged(playbackState: Int) {
                    if (playbackState == Player.STATE_READY) applyPendingSeek()
                    if (playbackState == Player.STATE_ENDED) {
                        if (repeatSingle) {
                            playAyah(currentSurah, currentAyah, 0L)
                        } else {
                            advanceToNextAyah()
                        }
                    }
                    emitState()
                }
                override fun onIsPlayingChanged(isPlaying: Boolean) {
                    emitState()
                }
            })
        }
        mediaSession = MediaSession.Builder(this, player)
            .setSessionActivity(activityPendingIntent())
            .setCustomLayout(
                listOf(
                    CommandButton.Builder(CommandButton.ICON_SKIP_BACK)
                        .setSessionCommand(previousAyahCommand)
                        .setDisplayName("Previous ayah")
                        .build(),
                    CommandButton.Builder(CommandButton.ICON_SKIP_FORWARD)
                        .setSessionCommand(nextAyahCommand)
                        .setDisplayName("Next ayah")
                        .build(),
                ),
            )
            .setCallback(object : MediaSession.Callback {
                override fun onConnect(
                    session: MediaSession,
                    controllerInfo: MediaSession.ControllerInfo,
                ): MediaSession.ConnectionResult {
                    val commands = MediaSession.ConnectionResult.DEFAULT_PLAYER_COMMANDS
                        .buildUpon()
                        .add(Player.COMMAND_SEEK_TO_NEXT)
                        .add(Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM)
                        .add(Player.COMMAND_SEEK_TO_PREVIOUS)
                        .add(Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM)
                        .build()
                    val sessionCommands = MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS
                        .buildUpon()
                        .add(previousAyahCommand)
                        .add(nextAyahCommand)
                        .build()
                    return MediaSession.ConnectionResult.accept(
                        sessionCommands,
                        commands,
                    )
                }

                override fun onCustomCommand(
                    session: MediaSession,
                    controllerInfo: MediaSession.ControllerInfo,
                    customCommand: SessionCommand,
                    args: Bundle,
                ): ListenableFuture<SessionResult> {
                    return when (customCommand) {
                        previousAyahCommand -> {
                            previousAyah()
                            Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
                        }
                        nextAyahCommand -> {
                            nextAyah()
                            Futures.immediateFuture(SessionResult(SessionResult.RESULT_SUCCESS))
                        }
                        else -> Futures.immediateFuture(SessionResult(SessionResult.RESULT_ERROR_NOT_SUPPORTED))
                    }
                }

                override fun onPlayerCommandRequest(
                    session: MediaSession,
                    controllerInfo: MediaSession.ControllerInfo,
                    playerCommand: Int,
                ): Int {
                    return when (playerCommand) {
                        Player.COMMAND_SEEK_TO_NEXT,
                        Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM -> {
                            nextAyah()
                            SessionResult.RESULT_SUCCESS
                        }
                        Player.COMMAND_SEEK_TO_PREVIOUS,
                        Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM -> {
                            previousAyah()
                            SessionResult.RESULT_SUCCESS
                        }
                        else -> SessionResult.RESULT_SUCCESS
                    }
                }

                override fun onMediaButtonEvent(
                    session: MediaSession,
                    controllerInfo: MediaSession.ControllerInfo,
                    intent: Intent,
                ): Boolean {
                    val keyEvent = intent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT) ?: return false
                    if (keyEvent.action != KeyEvent.ACTION_DOWN) return true

                    when (keyEvent.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY,
                        KeyEvent.KEYCODE_MEDIA_PAUSE,
                        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE -> {
                            if (player.isPlaying) pause() else resume()
                            return true
                        }
                        KeyEvent.KEYCODE_MEDIA_PREVIOUS -> {
                            previousAyah()
                            return true
                        }
                        KeyEvent.KEYCODE_MEDIA_NEXT -> {
                            nextAyah()
                            return true
                        }
                        MEDIA_REPEAT_KEY_CODE -> {
                            repeatSingle = !repeatSingle
                            return true
                        }
                    }
                    return false
                }
            })
            .build()
        pendingListener?.let(::setEventListener)
        handler.post(positionPoller)
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession = mediaSession

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_PLAY_PAUSE -> if (player.isPlaying) pause() else resume()
            ACTION_PREVIOUS -> previousAyah()
            ACTION_NEXT -> nextAyah()
            else -> return super.onStartCommand(intent, flags, startId)
        }
        return START_STICKY
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        if (!player.isPlaying) stopSelf()
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        handler.removeCallbacks(positionPoller)
        persistState()
        eventListener = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        mediaSession.release()
        player.release()
        instance = null
        super.onDestroy()
    }

    fun setEventListener(listener: ((NativePlaybackState) -> Unit)?) {
        eventListener = listener
        emitState()
    }

    fun playAyah(surah: Int, ayah: Int, positionMs: Long? = null) {
        val range = timingData[surah]?.get(ayah)
        currentSurah = surah
        currentAyah = ayah
        val startMs = positionMs ?: range?.startMs ?: 0L
        pendingSeekMs = startMs
        val mediaId = "${activeReciterId}_${surah}_ayah"

        if (player.currentMediaItem?.mediaId == mediaId) {
            player.seekTo(startMs)
            player.play()
            persistState()
            emitState()
            return
        }

        val mediaItem = resolveMediaItem(surah, ayah, mediaId)
        if (mediaItem == null) {
            emitState()
            return
        }

        player.setMediaItem(mediaItem)
        player.seekTo(startMs)
        player.prepare()
        player.play()
        persistState()
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
        val sourceSurah = surah
        val padded = String.format(Locale.US, "%03d.mp3", sourceSurah)
        val metadata = MediaMetadata.Builder()
            .setTitle("Surah $surah — Ayah $ayah")
            .setArtist(activeReciterId)
            .setAlbumTitle("The Holy Quran")
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
        val remoteUrl = getReciterUrl(activeReciterId, sourceSurah)
        return MediaItem.Builder()
            .setUri(Uri.parse(remoteUrl))
            .setMediaId(mediaId)
            .setMediaMetadata(metadata)
            .build()
    }

    fun pause() {
        player.pause()
        persistState()
    }

    fun resume() {
        if (player.currentMediaItem == null) {
            playAyah(currentSurah, currentAyah)
        } else {
            player.play()
        }
        persistState()
    }

    fun nextAyah() {
        advanceToNextAyah()
    }

    private fun nextSurah() {
        val nextSurah = currentSurah + 1
        if (nextSurah <= 114 && timingData[nextSurah] != null) {
            playAyah(nextSurah, 1)
        } else {
            player.pause()
            emitState()
        }
    }

    private fun previousSurah() {
        val previousSurah = currentSurah - 1
        if (previousSurah >= 1 && timingData[previousSurah] != null) {
            playAyah(previousSurah, 1)
        }
    }

    fun setRepeatMode(mode: String) {
        repeatMode = mode
        repeatSingle = mode == "repeat_single"
        statePreferences.edit().putString("repeatMode", mode).apply()
    }

    private fun advanceToNextAyah() {
        if (repeatMode == "off") {
            player.pause()
            emitState()
            return
        }
        if (repeatMode == "repeat_surah") {
            playAyah(currentSurah, 1, 0L)
            return
        }
        val next = currentAyah + 1
        if (timingData[currentSurah]?.containsKey(next) == true) {
            playAyah(currentSurah, next)
            return
        }

        val nextSurah = currentSurah + 1
        if (nextSurah <= 114 && timingData[nextSurah] != null) {
            playAyah(nextSurah, 1)
        } else {
            player.pause()
            emitState()
        }
    }

    fun previousAyah() {
        if (currentAyah > 1 && timingData[currentSurah]?.containsKey(currentAyah - 1) == true) {
            playAyah(currentSurah, currentAyah - 1)
            return
        }

        val previousSurah = currentSurah - 1
        if (previousSurah >= 1 && timingData[previousSurah] != null) {
            val lastAyah = timingData[previousSurah]!!.keys.filter { it > 0 }.maxOrNull()
            if (lastAyah != null) playAyah(previousSurah, lastAyah)
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
            }
            emitState()
            persistState()
            handler.postDelayed(this, 250)
        }
    }

    private fun emitState() {
        updateSessionMetadata()
        if (::mediaSession.isInitialized) publishNotification()
        eventListener?.invoke(state())
    }

    private fun createNotificationChannel() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            val channel = android.app.NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "Quran playback",
                android.app.NotificationManager.IMPORTANCE_LOW,
            ).apply {
                setSound(null, null)
                setShowBadge(false)
            }
            getSystemService(android.app.NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun publishNotification() {
        val playPauseIntent = servicePendingIntent(ACTION_PLAY_PAUSE, 1)
        val previousIntent = servicePendingIntent(ACTION_PREVIOUS, 2)
        val nextIntent = servicePendingIntent(ACTION_NEXT, 3)
        val metadata = sessionMetadata()
        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setLargeIcon(android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher))
            .setContentTitle(metadata.title)
            .setContentText(metadata.artist)
            .setContentIntent(activityPendingIntent())
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(player.isPlaying)
            .addAction(
                NotificationCompat.Action.Builder(
                    android.R.drawable.ic_media_rew,
                    "Previous",
                    previousIntent,
                ).build(),
            )
            .addAction(
                NotificationCompat.Action.Builder(
                    if (player.isPlaying) android.R.drawable.ic_media_pause else android.R.drawable.ic_media_play,
                    if (player.isPlaying) "Pause" else "Play",
                    playPauseIntent,
                ).build(),
            )
            .addAction(
                NotificationCompat.Action.Builder(
                    android.R.drawable.ic_media_ff,
                    "Next",
                    nextIntent,
                ).build(),
            )
            .apply {
                val durationMs = player.duration
                if (durationMs > 0L) {
                    setProgress(
                        durationMs.coerceAtMost(Int.MAX_VALUE.toLong()).toInt(),
                        player.currentPosition.coerceIn(0L, durationMs).coerceAtMost(Int.MAX_VALUE.toLong()).toInt(),
                        false,
                    )
                }
            }
            .setStyle(
                MediaStyleNotificationHelper.MediaStyle(mediaSession)
                    .setShowActionsInCompactView(0, 1, 2),
            )
            .build()

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
        NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
    }

    private fun activityPendingIntent(): android.app.PendingIntent {
        val intent = Intent(this, MainActivity::class.java)
        val flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT or
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0
        return android.app.PendingIntent.getActivity(this, 10, intent, flags)
    }

    private fun servicePendingIntent(action: String, requestCode: Int): android.app.PendingIntent {
        val intent = Intent(this, QuranPlaybackService::class.java).setAction(action)
        val flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT or
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) android.app.PendingIntent.FLAG_IMMUTABLE else 0
        return android.app.PendingIntent.getService(this, requestCode, intent, flags)
    }

    private fun updateSessionMetadata() {
        if (!::mediaSession.isInitialized) return
        val metadata = sessionMetadata()
        val item = player.currentMediaItem ?: return
        if (item.mediaMetadata.title != metadata.title ||
            item.mediaMetadata.artist != metadata.artist ||
            item.mediaMetadata.durationMs != metadata.durationMs ||
            item.mediaMetadata.artworkUri != metadata.artworkUri
        ) {
            player.replaceMediaItem(
                player.currentMediaItemIndex,
                item.buildUpon().setMediaMetadata(metadata).build(),
            )
        }
    }

    private fun sessionMetadata(): MediaMetadata = MediaMetadata.Builder()
        .setTitle("Surah ${surahName(currentSurah)}")
        .setArtist(reciterName(activeReciterId))
        .setAlbumTitle("The Holy Quran")
        .setDurationMs(player.duration.takeIf { it > 0L })
        .setArtworkUri(Uri.parse("android.resource://$packageName/${R.mipmap.ic_launcher}"))
        .build()

    private fun reciterName(reciterId: String): String = when (reciterId) {
        "badr-al-turki" -> "Badr Al-Turki"
        "mishari-alafasy" -> "Mishary Rashid Alafasy"
        "mahmoud-al-husary" -> "Mahmoud Khalil Al-Husary"
        "abdul-basit-murattal" -> "Abdul Basit Abdul Samad"
        "muhammad-siddiq-al-minshawi" -> "Muhammad Siddiq Al-Minshawi"
        else -> reciterId.replace('-', ' ').replaceFirstChar { it.uppercase(Locale.US) }
    }

    private fun surahName(surah: Int): String = surahNames.getOrElse(surah) { "No. $surah" }

    private fun persistState() {
        statePreferences.edit()
            .putInt("surah", currentSurah)
            .putInt("ayah", currentAyah)
            .putLong("positionMs", player.currentPosition.coerceAtLeast(0))
            .putString("reciterId", activeReciterId)
            .apply()
    }

    private fun restorePersistedState() {
        currentSurah = statePreferences.getInt("surah", 1)
        currentAyah = statePreferences.getInt("ayah", 1)
        activeReciterId = statePreferences.getString("reciterId", "badr-al-turki") ?: "badr-al-turki"
        pendingSeekMs = statePreferences.getLong("positionMs", 0L)
        repeatMode = statePreferences.getString("repeatMode", "continuous") ?: "continuous"
        repeatSingle = repeatMode == "repeat_single"
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
