import { useState, useEffect, useRef } from 'react';

export function useMusicPlayer(songs) {
  const [currentSongIndex, setCurrentSongIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef(new Audio());

  const currentSong = currentSongIndex!== null? songs[currentSongIndex] : null;
  const duration = audioRef.current.duration || 0;
  const currentTime = audioRef.currentTime || 0;

  useEffect(() => {
    const audio = audioRef.current;
    const updateProgress = () => setProgress((audio.currentTime / audio.duration) * 100 || 0);
    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  useEffect(() => {
    if (currentSong) {
      audioRef.current.src = currentSong.url;
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [currentSong]);

  const playSong = (song, index) => setCurrentSongIndex(index);
  const togglePlay = () => {
    if (isPlaying) audioRef.current.pause(); else audioRef.current.play();
    setIsPlaying(!isPlaying);
  };
  const next = () => setCurrentSongIndex((i) => (i + 1) % songs.length);
  const prev = () => setCurrentSongIndex((i) => (i - 1 + songs.length) % songs.length);
  const seek = (value) => { audioRef.currentTime = (value / 100) * audioRef.current.duration; };

  return { currentSong, isPlaying, progress, duration, currentTime, queue: songs, playSong, togglePlay, next, prev, seek };
}
