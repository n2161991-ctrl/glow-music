import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Network } from '@capacitor/network';
import * as cheerio from 'cheerio';

const GENIUS_TOKEN = 'PON_TU_TOKEN_AQUI';

export function useLyrics(song) {
  const [lyrics, setLyrics] = useState('');
  useEffect(() => {
    if (!song) return;
    const fetchLyrics = async () => {
      const key = `lyric_${song.artist}_${song.title}`;
      const cached = await Preferences.get({ key });
      if (cached.value) { setLyrics(cached.value); return; }
      const { connectionType } = await Network.getStatus();
      if (connectionType!== 'wifi') { setLyrics('Conéctate a WiFi'); return; }
      try {
        const search = await fetch(`https://api.genius.com/search?q=${song.artist} ${song.title}`, { headers: { 'Authorization': `Bearer ${GENIUS_TOKEN}` } });
        const url = (await search.json()).response.hits[0]?.result.url;
        if (!url) { setLyrics('Letra no disponible'); return; }
        const html = await (await fetch(url)).text();
        const lyricDiv = cheerio.load(html)('[data-lyrics-container="true"]').text().trim();
        setLyrics(lyricDiv || 'Letra no disponible');
        await Preferences.set({ key, value: lyricDiv });
      } catch { setLyrics('Error'); }
    };
    fetchLyrics();
  }, [song]);
  return { lyrics };
}
