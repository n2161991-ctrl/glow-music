import { useState, useEffect } from 'react';
import { Network } from '@capacitor/network';

export function useLyrics(song) {
  const [lyrics, setLyrics] = useState('');

  useEffect(() => {
    if (!song) return;
    const fetchLyrics = async () => {
      const status = await Network.getStatus();
      if (!status.connected) {
        setLyrics('Sin conexión para cargar la letra');
        return;
      }
      setLyrics(`Letra de ${song.title}\n\nLa la...`);
    };
    fetchLyrics();
  }, );

  return { lyrics };
}
