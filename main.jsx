import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { useMusicPlayer } from './lib/useMusicPlayer.js';
import { useLyrics } from './useLyrics.js';
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';

const songs = [
  { title: 'Blinding Lights', artist: 'The Weeknd', url: '/songs/blinding-lights.mp3' },
  { title: 'Levitating', artist: 'Dua Lipa', url: '/songs/levitating.mp3' },
  { title: 'As It Was', artist: 'Harry Styles', url: '/songs/as-it-was.mp3' }
];

function App() {
  const { currentSong, isPlaying, progress, duration, currentTime, queue, playSong, togglePlay, next, prev, seek } = useMusicPlayer(songs);
  const { lyrics } = useLyrics(currentSong);
  const [showLyrics, setShowLyrics] = useState(false);

  useEffect(() => {
    AdMob.initialize({ requestTrackingAuthorization: true });
    AdMob.showBanner({ adId: 'ca-app-pub-3940256099942544/6300978111', adSize: BannerAdSize.BANNER, position: BannerAdPosition.BOTTOM_CENTER });
  }, []);

  const formatTime = (s) => {
    if (!s) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', minHeight: '100vh', color: 'white', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>✨ Glow Music</h1>
      {currentSong? (
        <div style={{ textAlign: 'center', marginTop: '40px' }}>
          <h2>{currentSong.title}</h2>
          <p style={{ opacity: 0.8 }}>{currentSong.artist}</p>
          <input type="range" value={progress} max="100" onChange={(e) => seek(e.target.value)} style={{ width: '100%', marginTop: '20px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
          <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
            <button onClick={prev} style={{ fontSize: '24px', background: 'none', border: 'none', color: 'white' }}>⏮</button>
            <button onClick={togglePlay} style={{ fontSize: '40px', background: 'none', border: 'none', color: 'white' }}>{isPlaying? '⏸' : '▶️'}</button>
            <button onClick={next} style={{ fontSize: '24px', background: 'none', border: 'none', color: 'white' }}>⏭</button>
          </div>
          <button onClick={() => setShowLyrics(!showLyrics)} style={{ marginTop: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', padding: '10px 20px', borderRadius: '20px', color: 'white' }}>{showLyrics? 'Ocultar letra' : 'Ver letra'}</button>
          {showLyrics && <pre style={{ whiteSpace: 'pre-wrap', marginTop: '20px', textAlign: 'left', background: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '10px' }}>{lyrics || 'Cargando...'}</pre>}
        </div>
      ) : (
        <div>
          <h2 style={{ marginTop: '40px' }}>Seleccioná una canción:</h2>
          {queue.map((s, i) => (<div key={i} onClick={() => playSong(s, i)} style={{ background: 'rgba(255,255,255,0.1)', margin: '10px 0', padding: '15px', borderRadius: '10px', cursor: 'pointer' }}><strong>{s.title}</strong> - {s.artist}</div>))}
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
