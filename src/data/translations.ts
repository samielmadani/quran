export type AppLanguage = 'en' | 'ar';

export interface Translations {
  // App & General
  appTitle: string;
  close: string;
  done: string;
  edit: string;
  cancel: string;
  delete: string;
  change: string;
  search: string;
  moreOptions: string;
  quickControls: string;
  
  // Surah Header & Picker
  quranIndex: string;
  selectSurah: string;
  searchSurahPlaceholder: string;
  clearSearch: string;
  bookmarked: string;
  recentlyPlayed: string;
  noBookmarksYet: string;
  tapToBookmarkHint: string;
  ayahsCount: string;
  juz: string;
  
  // Continue Listening
  continueListening: string;
  resume: string;
  ayah: string;
  
  // Player Controls & Tooltips
  play: string;
  pause: string;
  previousAyah: string;
  nextAyah: string;
  autoplay: string;
  repeatAyah: string;
  repeatSurah: string;
  autoplayOff: string;
  settings: string;
  selectReciter: string;
  surahIndex: string;
  expandPlayer: string;
  
  // Settings
  settingsTitle: string;
  quickPreferences: string;
  language: string;
  english: string;
  arabic: string;
  reciter: string;
  player: string;
  pinnedControls: string;
  previousNextButtons: string;
  swapButtonDirections: string;
  sleepTimer: string;
  reading: string;
  showRecentlyPlayed: string;
  enableBookmarks: string;
  autoScroll: string;
  autoPlayOnLaunch: string;
  autoPlayOnLaunchDescription: string;
  translationMode: string;
  autoPlayOnSurahSelection: string;
  repeatMode: string;
  repeatOff: string;
  repeatOnce: string;
  repeatTwo: string;
  repeatThree: string;
  repeatFive: string;
  repeatInfinite: string;
  fontSize: string;
  
  // Sleep Timer Options
  timerOff: string;
  timer5min: string;
  timer15min: string;
  timer30min: string;
  timerEndOfAyah: string;
  timerEndOfSurah: string;
  
  // Font Size Presets
  fontTiny: string;
  fontExtraSmall: string;
  fontSmall: string;
  fontMedium: string;
  fontLarge: string;
  fontExtraLarge: string;
  fontHuge: string;
  fontMassive: string;

  // Reciters Modal
  audioAndRecitations: string;
  chooseReciter: string;
  searchReciterPlaceholder: string;
  activeReciter: string;
  currentlyActive: string;
  offlineReady: string;
  offlinePartial: string;
  streamAndOffline: string;
  downloadingPercent: string;
  downloadOfflineAudio: string;
  resumeDownload: string;
  cancelDownload: string;
  deleteDownload: string;
}

export const translations: Record<AppLanguage, Translations> = {
  en: {
    appTitle: 'The Holy Quran',
    close: 'Close',
    done: 'Done',
    edit: 'Edit',
    cancel: 'Cancel',
    delete: 'Delete',
    change: 'Change',
    search: 'Search',
    moreOptions: 'More Options',
    quickControls: 'Quick Controls',
    
    quranIndex: 'Quran Index',
    selectSurah: 'Select Surah (Chapter)',
    searchSurahPlaceholder: 'Search surah by name or number',
    clearSearch: 'Clear search',
    bookmarked: 'Bookmarked',
    recentlyPlayed: 'Recently Played',
    noBookmarksYet: 'No bookmarks yet. Tap Edit to add.',
    tapToBookmarkHint: 'Tap hearts below to bookmark surahs',
    ayahsCount: 'Ayahs (Verses)',
    juz: 'Juz',
    
    continueListening: 'Continue Listening',
    resume: 'RESUME',
    ayah: 'Ayah (Verse)',
    
    play: 'Play',
    pause: 'Pause',
    previousAyah: 'Previous ayah',
    nextAyah: 'Next ayah',
    autoplay: 'Auto',
    repeatAyah: '1×',
    repeatSurah: 'Surah (Chapter)',
    autoplayOff: 'Off',
    settings: 'Settings',
    selectReciter: 'Select reciter',
    surahIndex: 'Surah index',
    expandPlayer: 'Expand player',
    
    settingsTitle: 'Settings',
    quickPreferences: 'Quick Preferences',
    language: 'Language',
    english: 'English',
    arabic: 'العربية',
    reciter: 'Reciter',
    player: 'Player',
    pinnedControls: 'Pinned Controls',
    previousNextButtons: 'Previous / Next Buttons',
    swapButtonDirections: 'Swap Button Directions (RTL)',
    sleepTimer: 'Sleep Timer',
    reading: 'Reading',
    showRecentlyPlayed: 'Show Recently Played',
    enableBookmarks: 'Enable Bookmarks',
    autoScroll: 'Auto-scroll',
    autoPlayOnLaunch: 'Auto-play on app launch',
    autoPlayOnLaunchDescription: 'Automatically resume Quran playback when the native Android app launches.',
    translationMode: 'Translation Mode',
    autoPlayOnSurahSelection: 'Auto-play on surah selection',
    repeatMode: 'Auto Repeat',
    repeatOff: 'Off',
    repeatOnce: 'Once',
    repeatTwo: '2 times',
    repeatThree: '3 times',
    repeatFive: '5 times',
    repeatInfinite: 'Infinite',
    fontSize: 'Font Size',
    
    timerOff: 'Off',
    timer5min: '5 min',
    timer15min: '15 min',
    timer30min: '30 min',
    timerEndOfAyah: 'End of Ayah',
    timerEndOfSurah: 'End of Surah',
    
    fontTiny: 'Tiny',
    fontExtraSmall: 'X-Small',
    fontSmall: 'Small',
    fontMedium: 'Medium',
    fontLarge: 'Large',
    fontExtraLarge: 'X-Large',
    fontHuge: 'Huge',
    fontMassive: 'Massive',

    audioAndRecitations: 'Audio & Recitations',
    chooseReciter: 'Choose Reciter',
    searchReciterPlaceholder: 'Search reciter by name or style',
    activeReciter: 'Active Reciter',
    currentlyActive: 'Currently Active',
    offlineReady: 'Offline Ready',
    offlinePartial: 'Offline',
    streamAndOffline: 'Stream & Offline',
    downloadingPercent: 'Downloading',
    downloadOfflineAudio: 'Download Offline Audio',
    resumeDownload: 'Resume Download',
    cancelDownload: 'Cancel Download',
    deleteDownload: 'Delete Download',
  },
  ar: {
    appTitle: 'القرآن الكريم',
    close: 'إغلاق',
    done: 'تم',
    edit: 'تعديل',
    cancel: 'إلغاء',
    delete: 'حذف',
    change: 'تغيير',
    search: 'بحث',
    moreOptions: 'المزيد من الخيارات',
    quickControls: 'خيارات سريعة',
    
    quranIndex: 'فهرس القرآن',
    selectSurah: 'اختر السورة',
    searchSurahPlaceholder: 'ابحث بالاسم أو الرقم...',
    clearSearch: 'مسح البحث',
    bookmarked: 'المفضلة',
    recentlyPlayed: 'تم الاستماع مؤخراً',
    noBookmarksYet: 'لا توجد سور في المفضلة. اضغط تعديل للإضافة.',
    tapToBookmarkHint: 'اضغط على رمز القلب لإضافة السور للمفضلة',
    ayahsCount: 'آيات',
    juz: 'الجزء',
    
    continueListening: 'متابعة الاستماع',
    resume: 'استئناف',
    ayah: 'آية',
    
    play: 'تشغيل',
    pause: 'إيقاف مؤقت',
    previousAyah: 'الآية السابقة',
    nextAyah: 'الآية التالية',
    autoplay: 'تلقائي',
    repeatAyah: 'تكرار ١',
    repeatSurah: 'تكرار السورة',
    autoplayOff: 'إيقاف',
    settings: 'الإعدادات',
    selectReciter: 'اختيار القارئ',
    surahIndex: 'فهرس السور',
    expandPlayer: 'توسيع المشغل',
    
    settingsTitle: 'الإعدادات',
    quickPreferences: 'التفضيلات السريعة',
    language: 'اللغة',
    english: 'English',
    arabic: 'العربية',
    reciter: 'القارئ',
    player: 'المشغل',
    pinnedControls: 'تثبيت أزرار التحكم',
    previousNextButtons: 'أزرار الانتقال (السابق / التالي)',
    swapButtonDirections: 'عكس اتجاه الأزرار (RTL)',
    sleepTimer: 'مؤقت النوم',
    reading: 'القراءة',
    showRecentlyPlayed: 'عرض السور المستمع إليها مؤخراً',
    enableBookmarks: 'تفعيل المفضلة',
    autoScroll: 'التمرير التلقائي مع التلاوة',
    autoPlayOnLaunch: 'التشغيل التلقائي عند فتح التطبيق',
    autoPlayOnLaunchDescription: 'استئناف تلاوة القرآن تلقائياً عند فتح تطبيق أندرويد الأصلي.',
    translationMode: 'وضع الترجمة',
    autoPlayOnSurahSelection: 'التشغيل التلقائي عند اختيار السورة',
    repeatMode: 'التكرار التلقائي',
    repeatOff: 'إيقاف',
    repeatOnce: 'مرة واحدة',
    repeatTwo: 'مرتان',
    repeatThree: '٣ مرات',
    repeatFive: '٥ مرات',
    repeatInfinite: 'بلا نهاية',
    fontSize: 'حجم الخط',
    
    timerOff: 'إيقاف',
    timer5min: '٥ دقائق',
    timer15min: '١٥ دقيقة',
    timer30min: '٣٠ دقيقة',
    timerEndOfAyah: 'نهاية الآية',
    timerEndOfSurah: 'نهاية السورة',
    
    fontTiny: 'صغير جداً',
    fontExtraSmall: 'أصغر',
    fontSmall: 'صغير',
    fontMedium: 'متوسط',
    fontLarge: 'كبير',
    fontExtraLarge: 'كبير جداً',
    fontHuge: 'ضخم',
    fontMassive: 'أضخم',

    audioAndRecitations: 'التلاوات الصوتية',
    chooseReciter: 'اختر القارئ',
    searchReciterPlaceholder: 'ابحث عن قارئ بالاسم أو الرواية...',
    activeReciter: 'القارئ الحالي',
    currentlyActive: 'القارئ المختار',
    offlineReady: 'جاهز بدون إنترنت',
    offlinePartial: 'محمل جزئياً',
    streamAndOffline: 'بث وتحميل',
    downloadingPercent: 'جارِ التحميل',
    downloadOfflineAudio: 'تحميل للاستماع بدون إنترنت',
    resumeDownload: 'استئناف التحميل',
    cancelDownload: 'إلغاء التحميل',
    deleteDownload: 'حذف التحميل',
  },
};
