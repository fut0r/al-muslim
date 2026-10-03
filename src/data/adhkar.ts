/**
 * Adhkar from the Quran and the authentic Sunnah, with their sources.
 *
 * Quranic passages are not typed here: they reference surah and ayah numbers
 * and are read from the bundled Quran text, so they can never drift from it.
 */

export const ADHKAR_CATEGORY_IDS = ['morning', 'evening', 'sleep', 'afterPrayer', 'general'] as const;
export type AdhkarCategoryId = (typeof ADHKAR_CATEGORY_IDS)[number];

export interface QuranPassage {
  surah: number;
  from: number;
  to: number;
  /** Arabic and English name of the passage. */
  title: { ar: string; en: string };
}

export interface Dhikr {
  /** Stable identifier; progress is stored under it. */
  id: string;
  /** Arabic text, or a Quran passage to load. Exactly one of the two is set. */
  text?: string;
  quran?: QuranPassage;
  /** English meaning (not provided for Quran passages). */
  translation?: string;
  count: number;
  source: { ar: string; en: string };
}

export interface AdhkarCategory {
  id: AdhkarCategoryId;
  items: Dhikr[];
}

const SOURCES = {
  bukhari: { ar: 'البخاري', en: 'Al-Bukhari' },
  muslim: { ar: 'مسلم', en: 'Muslim' },
  agreed: { ar: 'البخاري ومسلم', en: 'Al-Bukhari and Muslim' },
  abuDawud: { ar: 'أبو داود', en: 'Abu Dawud' },
  tirmidhi: { ar: 'الترمذي', en: 'At-Tirmidhi' },
  abuDawudTirmidhi: { ar: 'أبو داود والترمذي', en: 'Abu Dawud and At-Tirmidhi' },
  abuDawudIbnMajah: { ar: 'أبو داود وابن ماجه', en: 'Abu Dawud and Ibn Majah' },
  abuDawudNasai: { ar: 'أبو داود والنسائي', en: "Abu Dawud and An-Nasa'i" },
  ibnMajah: { ar: 'ابن ماجه', en: 'Ibn Majah' },
  nasai: { ar: 'النسائي', en: "An-Nasa'i" },
  ahmad: { ar: 'أحمد', en: 'Ahmad' },
  hakim: { ar: 'الحاكم', en: 'Al-Hakim' },
  tabarani: { ar: 'الطبراني', en: 'At-Tabarani' },
} as const;

const AYAT_AL_KURSI: QuranPassage = {
  surah: 2,
  from: 255,
  to: 255,
  title: { ar: 'آية الكرسي', en: 'Ayat al-Kursi (Al-Baqarah 2:255)' },
};
const END_OF_BAQARAH: QuranPassage = {
  surah: 2,
  from: 285,
  to: 286,
  title: { ar: 'خواتيم سورة البقرة', en: 'The last two ayahs of Al-Baqarah (2:285–286)' },
};
const IKHLAS: QuranPassage = { surah: 112, from: 1, to: 4, title: { ar: 'سورة الإخلاص', en: 'Surah Al-Ikhlas' } };
const FALAQ: QuranPassage = { surah: 113, from: 1, to: 5, title: { ar: 'سورة الفلق', en: 'Surah Al-Falaq' } };
const NAS: QuranPassage = { surah: 114, from: 1, to: 6, title: { ar: 'سورة الناس', en: 'Surah An-Nas' } };

const TAHLIL =
  'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ';
const TAHLIL_EN =
  'None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things.';

const SAYYID_AL_ISTIGHFAR =
  'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ';
const SAYYID_AL_ISTIGHFAR_EN =
  'O Allah, You are my Lord; none has the right to be worshipped but You. You created me and I am Your servant, and I keep Your covenant and promise as best I can. I seek refuge in You from the evil of what I have done. I acknowledge Your favour upon me and I acknowledge my sin, so forgive me, for none forgives sins but You.';

const AFIYAH =
  'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي، وَعَنْ يَمِينِي وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي';
const AFIYAH_EN =
  'O Allah, I ask You for pardon and well-being in this world and the next. O Allah, I ask You for pardon and well-being in my religion, my worldly affairs, my family and my wealth. O Allah, conceal my faults and calm my fears. O Allah, protect me from before me and behind me, from my right and my left, and from above me, and I seek refuge in Your greatness from being struck down from beneath me.';

const BODY_WELLBEING =
  'اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَهَ إِلَّا أَنْتَ';
const BODY_WELLBEING_EN =
  'O Allah, grant me health in my body. O Allah, grant me health in my hearing. O Allah, grant me health in my sight. None has the right to be worshipped but You. O Allah, I seek refuge in You from disbelief and poverty, and I seek refuge in You from the punishment of the grave. None has the right to be worshipped but You.';

const BISMILLAH_PROTECTION =
  'بِسْمِ اللهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ';
const BISMILLAH_PROTECTION_EN =
  'In the name of Allah, with whose name nothing on earth or in heaven can cause harm, and He is the All-Hearing, the All-Knowing.';

const RADITU =
  'رَضِيتُ بِاللهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا';
const RADITU_EN =
  'I am pleased with Allah as my Lord, with Islam as my religion, and with Muhammad, peace and blessings be upon him, as my Prophet.';

const HASBIYA =
  'حَسْبِيَ اللهُ لَا إِلَهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ';
const HASBIYA_EN =
  'Allah is sufficient for me. None has the right to be worshipped but Him. In Him I put my trust, and He is the Lord of the mighty throne.';

const YA_HAYYU =
  'يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَى نَفْسِي طَرْفَةَ عَيْنٍ';
const YA_HAYYU_EN =
  'O Ever-Living, O Sustainer of all, by Your mercy I seek help. Set right all my affairs, and do not leave me to myself even for the blink of an eye.';

const SUBHAN_WA_BIHAMDIH = 'سُبْحَانَ اللهِ وَبِحَمْدِهِ';
const SUBHAN_WA_BIHAMDIH_EN = 'Glory be to Allah, and praise be to Him.';

const SALAH_ON_PROPHET = 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ';
const SALAH_ON_PROPHET_EN = 'O Allah, send blessings and peace upon our Prophet Muhammad.';

const ISTIGHFAR_TAWBAH = 'أَسْتَغْفِرُ اللهَ وَأَتُوبُ إِلَيْهِ';
const ISTIGHFAR_TAWBAH_EN = 'I seek the forgiveness of Allah and turn to Him in repentance.';

const morning: Dhikr[] = [
  { id: 'morning.kursi', quran: AYAT_AL_KURSI, count: 1, source: SOURCES.hakim },
  { id: 'morning.ikhlas', quran: IKHLAS, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'morning.falaq', quran: FALAQ, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'morning.nas', quran: NAS, count: 3, source: SOURCES.abuDawudTirmidhi },
  {
    id: 'morning.asbahna',
    text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    translation:
      'We have reached the morning, and the dominion belongs to Allah, and praise is for Allah. None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this day and the good of what follows it, and I seek refuge in You from the evil of this day and the evil of what follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
    count: 1,
    source: SOURCES.muslim,
  },
  {
    id: 'morning.bika-asbahna',
    text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ',
    translation:
      'O Allah, by You we reach the morning and by You we reach the evening, by You we live and by You we die, and to You is the resurrection.',
    count: 1,
    source: SOURCES.tirmidhi,
  },
  { id: 'morning.sayyid-istighfar', text: SAYYID_AL_ISTIGHFAR, translation: SAYYID_AL_ISTIGHFAR_EN, count: 1, source: SOURCES.bukhari },
  {
    id: 'morning.fitrah',
    text: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
    translation:
      'We have reached the morning upon the natural way of Islam, upon the word of sincerity, upon the religion of our Prophet Muhammad, peace and blessings be upon him, and upon the way of our father Ibrahim, who was upright, a Muslim, and was not of those who associate others with Allah.',
    count: 1,
    source: SOURCES.ahmad,
  },
  { id: 'morning.afiyah', text: AFIYAH, translation: AFIYAH_EN, count: 1, source: SOURCES.abuDawudIbnMajah },
  { id: 'morning.body', text: BODY_WELLBEING, translation: BODY_WELLBEING_EN, count: 3, source: SOURCES.abuDawud },
  { id: 'morning.bismillah', text: BISMILLAH_PROTECTION, translation: BISMILLAH_PROTECTION_EN, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'morning.raditu', text: RADITU, translation: RADITU_EN, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'morning.hasbiya', text: HASBIYA, translation: HASBIYA_EN, count: 7, source: SOURCES.abuDawud },
  { id: 'morning.ya-hayyu', text: YA_HAYYU, translation: YA_HAYYU_EN, count: 1, source: SOURCES.hakim },
  {
    id: 'morning.ilm',
    text: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا',
    translation: 'O Allah, I ask You for beneficial knowledge, good provision and deeds that are accepted.',
    count: 1,
    source: SOURCES.ibnMajah,
  },
  {
    id: 'morning.adada-khalqih',
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ',
    translation:
      'Glory be to Allah, and praise be to Him: as many times as the number of His creation, as much as pleases Him, as heavy as His throne, and as much as the ink of His words.',
    count: 3,
    source: SOURCES.muslim,
  },
  { id: 'morning.tahlil', text: TAHLIL, translation: TAHLIL_EN, count: 10, source: SOURCES.abuDawudIbnMajah },
  { id: 'morning.salah', text: SALAH_ON_PROPHET, translation: SALAH_ON_PROPHET_EN, count: 10, source: SOURCES.tabarani },
  { id: 'morning.subhan', text: SUBHAN_WA_BIHAMDIH, translation: SUBHAN_WA_BIHAMDIH_EN, count: 100, source: SOURCES.muslim },
  { id: 'morning.istighfar', text: ISTIGHFAR_TAWBAH, translation: ISTIGHFAR_TAWBAH_EN, count: 100, source: SOURCES.agreed },
];

const evening: Dhikr[] = [
  { id: 'evening.kursi', quran: AYAT_AL_KURSI, count: 1, source: SOURCES.hakim },
  { id: 'evening.ikhlas', quran: IKHLAS, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'evening.falaq', quran: FALAQ, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'evening.nas', quran: NAS, count: 3, source: SOURCES.abuDawudTirmidhi },
  {
    id: 'evening.amsayna',
    text: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ',
    translation:
      'We have reached the evening, and the dominion belongs to Allah, and praise is for Allah. None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things. My Lord, I ask You for the good of this night and the good of what follows it, and I seek refuge in You from the evil of this night and the evil of what follows it. My Lord, I seek refuge in You from laziness and the misery of old age. My Lord, I seek refuge in You from punishment in the Fire and punishment in the grave.',
    count: 1,
    source: SOURCES.muslim,
  },
  {
    id: 'evening.bika-amsayna',
    text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ',
    translation:
      'O Allah, by You we reach the evening and by You we reach the morning, by You we live and by You we die, and to You is the final return.',
    count: 1,
    source: SOURCES.tirmidhi,
  },
  { id: 'evening.sayyid-istighfar', text: SAYYID_AL_ISTIGHFAR, translation: SAYYID_AL_ISTIGHFAR_EN, count: 1, source: SOURCES.bukhari },
  {
    id: 'evening.fitrah',
    text: 'أَمْسَيْنَا عَلَى فِطْرَةِ الْإِسْلَامِ، وَعَلَى كَلِمَةِ الْإِخْلَاصِ، وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ، وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ',
    translation:
      'We have reached the evening upon the natural way of Islam, upon the word of sincerity, upon the religion of our Prophet Muhammad, peace and blessings be upon him, and upon the way of our father Ibrahim, who was upright, a Muslim, and was not of those who associate others with Allah.',
    count: 1,
    source: SOURCES.ahmad,
  },
  { id: 'evening.afiyah', text: AFIYAH, translation: AFIYAH_EN, count: 1, source: SOURCES.abuDawudIbnMajah },
  { id: 'evening.body', text: BODY_WELLBEING, translation: BODY_WELLBEING_EN, count: 3, source: SOURCES.abuDawud },
  { id: 'evening.bismillah', text: BISMILLAH_PROTECTION, translation: BISMILLAH_PROTECTION_EN, count: 3, source: SOURCES.abuDawudTirmidhi },
  {
    id: 'evening.kalimat',
    text: 'أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
    translation: 'I seek refuge in the perfect words of Allah from the evil of what He has created.',
    count: 3,
    source: SOURCES.muslim,
  },
  { id: 'evening.raditu', text: RADITU, translation: RADITU_EN, count: 3, source: SOURCES.abuDawudTirmidhi },
  { id: 'evening.hasbiya', text: HASBIYA, translation: HASBIYA_EN, count: 7, source: SOURCES.abuDawud },
  { id: 'evening.ya-hayyu', text: YA_HAYYU, translation: YA_HAYYU_EN, count: 1, source: SOURCES.hakim },
  { id: 'evening.tahlil', text: TAHLIL, translation: TAHLIL_EN, count: 10, source: SOURCES.abuDawudIbnMajah },
  { id: 'evening.salah', text: SALAH_ON_PROPHET, translation: SALAH_ON_PROPHET_EN, count: 10, source: SOURCES.tabarani },
  { id: 'evening.subhan', text: SUBHAN_WA_BIHAMDIH, translation: SUBHAN_WA_BIHAMDIH_EN, count: 100, source: SOURCES.muslim },
];

const sleep: Dhikr[] = [
  {
    id: 'sleep.bismika',
    text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا',
    translation: 'In Your name, O Allah, I die and I live.',
    count: 1,
    source: SOURCES.bukhari,
  },
  { id: 'sleep.kursi', quran: AYAT_AL_KURSI, count: 1, source: SOURCES.bukhari },
  { id: 'sleep.baqarah', quran: END_OF_BAQARAH, count: 1, source: SOURCES.agreed },
  { id: 'sleep.ikhlas', quran: IKHLAS, count: 3, source: SOURCES.bukhari },
  { id: 'sleep.falaq', quran: FALAQ, count: 3, source: SOURCES.bukhari },
  { id: 'sleep.nas', quran: NAS, count: 3, source: SOURCES.bukhari },
  {
    id: 'sleep.janbi',
    text: 'بِاسْمِكَ رَبِّي وَضَعْتُ جَنْبِي، وَبِكَ أَرْفَعُهُ، فَإِنْ أَمْسَكْتَ نَفْسِي فَارْحَمْهَا، وَإِنْ أَرْسَلْتَهَا فَاحْفَظْهَا بِمَا تَحْفَظُ بِهِ عِبَادَكَ الصَّالِحِينَ',
    translation:
      'In Your name, my Lord, I lay my side down, and by You I raise it. If You take my soul, have mercy on it, and if You send it back, protect it as You protect Your righteous servants.',
    count: 1,
    source: SOURCES.agreed,
  },
  {
    id: 'sleep.qini',
    text: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ',
    translation: 'O Allah, protect me from Your punishment on the day You resurrect Your servants.',
    count: 3,
    source: SOURCES.abuDawudTirmidhi,
  },
  { id: 'sleep.subhanallah', text: 'سُبْحَانَ اللهِ', translation: 'Glory be to Allah.', count: 33, source: SOURCES.agreed },
  { id: 'sleep.alhamdulillah', text: 'الْحَمْدُ لِلَّهِ', translation: 'Praise be to Allah.', count: 33, source: SOURCES.agreed },
  { id: 'sleep.allahuakbar', text: 'اللهُ أَكْبَرُ', translation: 'Allah is the Greatest.', count: 34, source: SOURCES.agreed },
  {
    id: 'sleep.aslamtu',
    text: 'اللَّهُمَّ أَسْلَمْتُ نَفْسِي إِلَيْكَ، وَفَوَّضْتُ أَمْرِي إِلَيْكَ، وَوَجَّهْتُ وَجْهِي إِلَيْكَ، وَأَلْجَأْتُ ظَهْرِي إِلَيْكَ، رَغْبَةً وَرَهْبَةً إِلَيْكَ، لَا مَلْجَأَ وَلَا مَنْجَا مِنْكَ إِلَّا إِلَيْكَ، آمَنْتُ بِكِتَابِكَ الَّذِي أَنْزَلْتَ، وَبِنَبِيِّكَ الَّذِي أَرْسَلْتَ',
    translation:
      'O Allah, I have submitted myself to You, entrusted my affairs to You, turned my face to You and relied completely on You, in hope and in fear of You. There is no refuge and no escape from You except to You. I believe in Your Book which You have revealed and in Your Prophet whom You have sent.',
    count: 1,
    source: SOURCES.agreed,
  },
];

const afterPrayer: Dhikr[] = [
  { id: 'after.istighfar', text: 'أَسْتَغْفِرُ اللهَ', translation: 'I seek the forgiveness of Allah.', count: 3, source: SOURCES.muslim },
  {
    id: 'after.salam',
    text: 'اللَّهُمَّ أَنْتَ السَّلَامُ، وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ',
    translation: 'O Allah, You are Peace and from You comes peace. Blessed are You, O Possessor of majesty and honour.',
    count: 1,
    source: SOURCES.muslim,
  },
  {
    id: 'after.la-mani',
    text: 'لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ',
    translation:
      'None has the right to be worshipped but Allah alone, with no partner. His is the dominion and His is the praise, and He is able to do all things. O Allah, none can withhold what You give and none can give what You withhold, and the wealth of the wealthy does not avail them against You.',
    count: 1,
    source: SOURCES.agreed,
  },
  { id: 'after.subhanallah', text: 'سُبْحَانَ اللهِ', translation: 'Glory be to Allah.', count: 33, source: SOURCES.muslim },
  { id: 'after.alhamdulillah', text: 'الْحَمْدُ لِلَّهِ', translation: 'Praise be to Allah.', count: 33, source: SOURCES.muslim },
  { id: 'after.allahuakbar', text: 'اللهُ أَكْبَرُ', translation: 'Allah is the Greatest.', count: 33, source: SOURCES.muslim },
  { id: 'after.tahlil', text: TAHLIL, translation: TAHLIL_EN, count: 1, source: SOURCES.muslim },
  { id: 'after.kursi', quran: AYAT_AL_KURSI, count: 1, source: SOURCES.nasai },
  { id: 'after.ikhlas', quran: IKHLAS, count: 1, source: SOURCES.abuDawudNasai },
  { id: 'after.falaq', quran: FALAQ, count: 1, source: SOURCES.abuDawudNasai },
  { id: 'after.nas', quran: NAS, count: 1, source: SOURCES.abuDawudNasai },
  {
    id: 'after.ainni',
    text: 'اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ',
    translation: 'O Allah, help me to remember You, to thank You, and to worship You well.',
    count: 1,
    source: SOURCES.abuDawudNasai,
  },
];

const general: Dhikr[] = [
  { id: 'general.subhan', text: SUBHAN_WA_BIHAMDIH, translation: SUBHAN_WA_BIHAMDIH_EN, count: 100, source: SOURCES.agreed },
  { id: 'general.tahlil', text: TAHLIL, translation: TAHLIL_EN, count: 100, source: SOURCES.agreed },
  { id: 'general.istighfar', text: ISTIGHFAR_TAWBAH, translation: ISTIGHFAR_TAWBAH_EN, count: 100, source: SOURCES.agreed },
  {
    id: 'general.kalimatan',
    text: 'سُبْحَانَ اللهِ وَبِحَمْدِهِ، سُبْحَانَ اللهِ الْعَظِيمِ',
    translation: 'Glory be to Allah, and praise be to Him. Glory be to Allah, the Almighty.',
    count: 1,
    source: SOURCES.agreed,
  },
  {
    id: 'general.baqiyat',
    text: 'سُبْحَانَ اللهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللهُ، وَاللهُ أَكْبَرُ',
    translation:
      'Glory be to Allah, praise be to Allah, none has the right to be worshipped but Allah, and Allah is the Greatest.',
    count: 1,
    source: SOURCES.muslim,
  },
  {
    id: 'general.hawqalah',
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ',
    translation: 'There is no might and no power except with Allah.',
    count: 1,
    source: SOURCES.agreed,
  },
  {
    id: 'general.ibrahimiyyah',
    text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ، اللَّهُمَّ بَارِكْ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ',
    translation:
      'O Allah, send prayers upon Muhammad and the family of Muhammad, as You sent prayers upon Ibrahim and the family of Ibrahim. You are Praiseworthy, Glorious. O Allah, bless Muhammad and the family of Muhammad, as You blessed Ibrahim and the family of Ibrahim. You are Praiseworthy, Glorious.',
    count: 10,
    source: SOURCES.bukhari,
  },
  {
    id: 'general.dhun-nun',
    text: 'لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
    translation: 'None has the right to be worshipped but You. Glory be to You. Indeed, I have been among the wrongdoers.',
    count: 1,
    source: SOURCES.tirmidhi,
  },
];

export const ADHKAR: Record<AdhkarCategoryId, AdhkarCategory> = {
  morning: { id: 'morning', items: morning },
  evening: { id: 'evening', items: evening },
  sleep: { id: 'sleep', items: sleep },
  afterPrayer: { id: 'afterPrayer', items: afterPrayer },
  general: { id: 'general', items: general },
};

export function isAdhkarCategoryId(value: unknown): value is AdhkarCategoryId {
  return typeof value === 'string' && (ADHKAR_CATEGORY_IDS as readonly string[]).includes(value);
}
