import { useState, useEffect, useRef } from 'react';
import { AudioPlayer } from '@capacitor-community/audio';
import { Preferences } from '@capacitor/preferences';

export function useMusicPlayer(songs) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [queue, setQueue] = useState(songs || []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    AudioPlayer.addListener('status', async (status) => {
      if (status.duration) setDuration(status.duration);
      if (status.currentTime!== undefined) {
        setCurrentTime(status.currentTime);
        setProgress((status.currentTime / status.duration) * 100);
      }
      if (status.isPlaying!== undefined) setIsPlaying(status.isPlaying);
    });
    
    return () => AudioPlayer.removeAllListeners();
  }, []);

  const playSong = async (song, idx) => {
    setCurrentSong(song);
    setIndex(idx);
    await AudioPlayer.play({ assetId: song.url });
    await Preferences.set({ key: 'lastSong', value: JSON.stringify({ song, idx }) });
  };

  const togglePlay = async () => {
    if (isPlaying) await AudioPlayer.pause();
    else await AudioPlayer.resume();
  };

  const next = () => {
    const nextIdx = (index + 1) % queue.length;
    playSong(queue[nextIdx], nextIdx);
  };

  const prev = () => {
    const prevIdx = (index - 1 + queue.length) % queue.length;
    playSong(queue[prevIdx], prevIdx);
  };

  const seek = async (value) => {
    const time = (value / 100) * duration;
    await AudioPlayer.seekTo({ time });
  };

  return { currentSong, isPlaying, progress, duration, currentTime, queue, playSong, togglePlay, next, prev, seek };
}
