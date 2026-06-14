import { useState, useCallback, useRef, useEffect } from "react";
import { SONGS as WEB_SONGS, SKINS } from "./musicData";
import { Capacitor } from '@capacitor/core';

const TRANSLATIONS = {
  es: {
    nowPlaying: "Reproduciendo", playlist: "Lista de Reproducción", skins: "Temas Visuales",
    welcome: "Siente el ritmo. 🎵", sleepTimer: "Modo Sueño",
    sleepAlert: "Modo Sueño activado: Música pausada. 💤", sleepSet: "La música se apagará en {m} minutos. 🌙"
  },
  en: {
    nowPlaying: "Now Playing", playlist: "Playlist", skins: "Visual Themes",
    welcome: "Feel the rhythm. 🎵", sleepTimer: "Sleep Timer",
    sleepAlert: "Sleep Timer activated: Music paused. 💤", sleepSet: "Music will turn off in {m} minutes. 🌙"
  },
  pt: {
    nowPlaying: "Reproduzindo", playlist: "Lista de Reprodução", skins: "Temas Visuais",
    welcome: "Sinta o ritmo. 🎵", sleepTimer: "Modo Sono",
    sleepAlert: "Modo Sono ativado: Música pausada. 💤", sleepSet: "A música vai desligar em {m} minutos. 🌙"
  }
};

let AdMob = null;
let Toast = null;
let App = null;
let Device = null;
let Media = null;

if (Capacitor.isNativePlatform()) {
  import('@capacitor-community/admob').then((mod) => {
    AdMob = mod.AdMob;
    initAdMobNativo();
  }).catch(err => console.log("Cargando AdMob..."));

  import('@capacitor/toast').then((mod) => { Toast = mod.Toast; });
  import('@capacitor/app').then((mod) => { App = mod.App; });
  import('@capacitor/device').then((mod) => { Device = mod.Device; });
  import('@capacitor-community/media').then((mod) => { Media = mod.Media; });
}

async function initAdMobNativo() {
  if (!AdMob) return;
  try {
    await AdMob.initialize({ requestTrackingAuthorization: true });
    await AdMob.showBanner({
      adId: 'ca-app-pub-1097827806569844/6501027410', 
      position: 'BOTTOM_CENTER',
      margin: 60,
      isTesting: false
    });
  } catch (e) {
    console.error("Error en Banner:", e);
  }
}

export default function useMusicPlayer() {
  const [songs, setSongs] = useState(WEB_SONGS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(75);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [skinId, setSkinId] = useState("neon-purple");
  const [favorites, setFavorites] = useState(new Set());
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSkins, setShowSkins] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [sleepTimeLeft, setSleepTimeLeft] = useState(null);
  const [language, setLanguage] = useState("es");

  const audioRef = useRef(null);
  const songChangeCount = useRef(0);
  const sleepTimerRef = useRef(null);

  useEffect(() => {
    async function scanLocalMusic() {
      if (!Media) return;
      try {
        const permission = await Media.requestPermissions();
        if (permission.albums !== 'granted') return;

        const result = await Media.getMedias({ quantity: 50, types: 'audio' });
        
        if (result.medias && result.medias.length > 0) {
          const localSongs = result.medias.map((file, idx) => ({
            id: `local-${idx}`,
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: "Archivo Local",
            album: "Memoria del Teléfono",
            duration: Math.floor(file.duration || 180),
            cover: "https://unsplash.com",
            src: Capacitor.convertFileSrc(file.identifier)
          }));

          setSongs([...WEB_SONGS, ...localSongs]);
        }
      } catch (err) {
        console.error("Error al escanear almacenamiento:", err);
      }
    }
    setTimeout(scanLocalMusic, 1500);
  }, []);

  useEffect(() => {
    async function detectDeviceLanguage() {
      if (Device) {
        const info = await Device.getLanguageCode();
        const code = info.value.split("-");
        if (TRANSLATIONS[code[0]]) {
          setLanguage(code[0]);
          if (Toast) Toast.show({ text: TRANSLATIONS[code[0]].welcome, duration: 'long', position: 'center' });
        }
      } else {
        if (Toast) Toast.show({ text: TRANSLATIONS.es.welcome, duration: 'long', position: 'center' });
      }
    }
    detectDeviceLanguage();
  }, []);

  const showFullscreenAd = useCallback(async () => {
    if (!AdMob) return;
    try {
      await AdMob.prepareInterstitial({
        adId: 'ca-app-pub-1097827806569844/6321939725', 
        isTesting: false
      });
      await AdMob.showInterstitial();
    } catch (error) {
      console.log("Anuncio retenido o cargando:", error);
    }
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    if (Capacitor.isNativePlatform()) {
      audio.setAttribute('playsinline', 'true');
    }
    audioRef.current = audio;

    audio.addEventListener("timeupdate", () => setProgress(Math.floor(audio.currentTime)));
    audio.addEventListener("loadedmetadata", () => setDuration(Math.floor(audio.duration)));
    audio.addEventListener("ended", () => handleEnded());

    const handleStateChange = () => {
      if (audio.paused !== !isPlaying) setIsPlaying(!audio.paused);
    };
    audio.addEventListener("play", handleStateChange);
    audio.addEventListener("pause", handleStateChange);

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [isPlaying]);

  useEffect(() => {
    if (sleepTimeLeft === null) return;
    if (sleepTimeLeft <= 0) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
      setSleepTimeLeft(null);
      if (Toast) Toast.show({ text: TRANSLATIONS[language].sleepAlert });
      return;
    }
    sleepTimerRef.current = setTimeout(() => {
      setSleepTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 60000);
    return () => clearTimeout(sleepTimerRef.current);
  }, [sleepTimeLeft, language]);

  const setSleepTimer = useCallback((minutes) => {
    clearTimeout(sleepTimerRef.current);
    if (minutes === 0) {
      setSleepTimeLeft(null);
    } else {
      setSleepTimeLeft(minutes);
      if (Toast) {
        const msg = TRANSLATIONS[language].sleepSet.replace("{m}", minutes);
        Toast.show({ text: msg });
      }
    }
  }, [language]);

  const shuffleRef = useRef(shuffle);
  const repeatRef = useRef(repeat);
  const currentIndexRef = useRef(currentIndex);
  const songsLengthRef = useRef(songs.length);
  
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { repeatRef.current = repeat; }, [repeat]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { songsLengthRef.current = songs.length; }, [songs]);

  const checkAdTriggers = useCallback(() => {
    songChangeCount.current += 1;
    if (songChangeCount.current >= 3) {
      songChangeCount.current = 0;
      showFullscreenAd();
    }
  }, [showFullscreenAd]);

  const handleEnded = useCallback(() => {
    const rep = repeatRef.current;
    const totalSongs = songsLengthRef.current;
    if (rep === "one") {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
      return;
    }
    setProgress(0);
    checkAdTriggers();

    if (shuffleRef.current) {
      let next;
      do { next = Math.floor(Math.random() * totalSongs); }
      while (next === currentIndexRef.current && totalSongs > 1);
      setCurrentIndex(next);
    } else if (rep === "all" || currentIndexRef.current < totalSongs - 1) {
      setCurrentIndex((i) => (i + 1) % totalSongs);
    } else {
      setIsPlaying(false);
    }
  }, [checkAdTriggers]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !songs[currentIndex]) return;
    audio.src = songs[currentIndex].src;
    audio.load();
    setProgress(0);
    if (isPlaying) audio.play().catch(() => {});
  }, [currentIndex, songs]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) audio.play().catch(() => setIsPlaying(false));
    else audio.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);

  const handleNext = useCallback(() => {
    setProgress(0);
    checkAdTriggers();
    const totalSongs = songs.length;
    if (shuffle) {
      let next;
      do { next = Math.floor(Math.random() * totalSongs); }
      while (next === currentIndex && totalSongs > 1);
      setCurrentIndex(next);
    } else {
      setCurrentIndex((i) => (i + 1) % totalSongs);
    }
    setIsPlaying(true);
  }, [shuffle, currentIndex, checkAdTriggers, songs.length]);

  const handlePrev = useCallback(() => {
    if (audioRef.current?.currentTime > 3) {
      audioRef.current.currentTime = 0;
      setProgress(0);
      return;
    }
    setProgress(0);
    const totalSongs = songs.length;
    setCurrentIndex((i) => (i - 1 + totalSongs) % totalSongs);
    setIsPlaying(true);
  }, [songs.length]);

  const seek = useCallback((seconds) => {
    setProgress(seconds);
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  return {
    currentSong: songs[currentIndex] || WEB_SONGS[0],
    currentSkin: SKINS.find((s) => s.id === skinId) || SKINS[0],
    currentIndex, isPlaying, progress,
    duration: duration || (songs[currentIndex] ? songs[currentIndex].duration : 180),
    volume, shuffle, repeat, skinId, favorites, showPlaylist, showSkins,
    isDarkMode, sleepTimeLeft,
    t: TRANSLATIONS[language],
    currentLanguage: language,
    togglePlay, handleNext, handlePrev,
    toggleShuffle: useCallback(() => setShuffle((s) => !s), []),
