import React, { useEffect, useState, useRef } from 'react';
import Recommendations from './Recommendations.jsx'; 

function App() {
  const [songs, setSongs] = useState([]);
const [filteredSongs, setFilteredSongs] = useState([]);
const [searchQuery, setSearchQuery] = useState("");
const [currentSongIndex, setCurrentSongIndex] = useState(null);
const [isPopupExpanded, setIsPopupExpanded] = useState(false); 
const [activeTab, setActiveTab] = useState("all"); 
const [playbackMode, setPlaybackMode] = useState("playlist"); 



const [recommendationTracklist, setRecommendationTracklist] = useState([]); 
const [recTracklistIndex, setRecTracklistIndex] = useState(0);              
const [isPlaying, setIsPlaying] = useState(false);
const [trackProgress, setTrackProgress] = useState(0);
const [trackDuration, setTrackDuration] = useState(0);
const [queue, setQueue] = useState([]); 
const [expandedCategory, setExpandedCategory] = useState(null);





const audioRef = useRef(null);


const currentSong = playbackMode === "recommendation" && recommendationTracklist.length > 0
  ? recommendationTracklist[recTracklistIndex]
  : songs[currentSongIndex];

  
  useEffect(() => {
    fetch("http://localhost:8000/api/songs")
      .then((res) => res.json())
      .then((data) => {
        setSongs(data || []);
        setFilteredSongs(data || []);
      })
      .catch((err) => console.error("Error fetching library:", err));
  }, []);

  
useEffect(() => {
  if (audioRef.current && currentSong) {
    
    audioRef.current.load();
    
    
    if (isPlaying) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log("Browser playback paused until buffering completes.");
        });
      }
    }
  }
}, [currentSong]); 


const togglePlayPause = (e) => {
  if (e) e.stopPropagation(); 
  if (!audioRef.current || currentSongIndex === null) return;
  
  if (isPlaying) {
    audioRef.current.pause();
    setIsPlaying(false);
  } else {
    audioRef.current.play().catch(err => console.log(err));
    setIsPlaying(true);
  }
};


  


  
const playNext = (e) => {
  if (e) e.stopPropagation();

 
  if (playbackMode === "recommendation" && recommendationTracklist.length > 0) {
    if (recTracklistIndex < recommendationTracklist.length - 1) {
      setRecTracklistIndex(prev => prev + 1);
    } else {
      setRecTracklistIndex(0); 
    }
    setIsPlaying(true);
    return;
  }

  if (!songs || songs.length === 0) return;
  if (currentSongIndex === null || currentSongIndex === songs.length - 1) {
    setCurrentSongIndex(0);
  } else {
    setCurrentSongIndex(currentSongIndex + 1);
  }
  setIsPlaying(true);
};

const playPrevious = (e) => {
  if (e) e.stopPropagation();

  
  if (playbackMode === "recommendation" && recommendationTracklist.length > 0) {
    if (recTracklistIndex > 0) {
      setRecTracklistIndex(prev => prev - 1); 
    } else {
      setRecTracklistIndex(recommendationTracklist.length - 1); 
    }
    setIsPlaying(true);
    return;
  }

  
  if (!songs || songs.length === 0) return;
  if (currentSongIndex === null || currentSongIndex === 0) {
    setCurrentSongIndex(songs.length - 1);
  } else {
    setCurrentSongIndex(currentSongIndex - 1);
  }
  setIsPlaying(true);
};






  const groupByField = (field) => {
    return filteredSongs.reduce((groups, song) => {
      const key = song[field] || `Unknown ${field.charAt(0).toUpperCase() + field.slice(1)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(song);
      return groups;
    }, {});
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategory(expandedCategory === categoryName ? null : categoryName);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setTrackProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setTrackDuration(audioRef.current.duration);
  };

  const handleProgressBarChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setTrackProgress(newTime);
    }
  };

  const formatTimeSeconds = (timeInSeconds) => {
    if (isNaN(timeInSeconds)) return "0:00";
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <div style={{ padding: '30px', fontFamily: '"Segoe UI", Roboto, sans-serif', paddingBottom: '160px', backgroundColor: '#121212', color: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', fontWeight: '700', letterSpacing: '-1.5px', fontSize: '32px', marginBottom: '30px' }}>Music Hub Player</h1>
      
      {/* SEARCH BAR ELEMENT */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Search tracks, artists, albums..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '100%', maxWidth: '500px', padding: '14px 24px', borderRadius: '30px', border: 'none', backgroundColor: '#242424', color: '#fff', fontSize: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', outline: 'none' }}
        />
      </div>

      {/* TABS CONTROLLER */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '40px' }}>
        {["all", "artists", "albums"].map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setExpandedCategory(null); }}
            style={{
              padding: '10px 24px', borderRadius: '24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === tab ? '#1db954' : '#242424',
              color: '#fff', transition: '0.2s'
            }}
          >
            {tab === "all" ? "All Tracks" : tab === "artists" ? "Artists" : "Albums"}
          </button>
        ))}
      </div>

      {/* TRACK LIBRARY AREA */}
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {filteredSongs.length === 0 ? (
          <p style={{ color: '#aaa', textAlign: 'center' }}>No tracks match your query.</p>
        ) : activeTab === "all" ? (
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {filteredSongs.map((song) => {
              const actualIndex = songs.findIndex(s => s.id === song.id);
              return (
                <li key={song.id} style={{ display: 'flex', alignItems: 'center', margin: '12px 0', padding: '14px', borderRadius: '8px', backgroundColor: '#181818' }}>
                  <img src={`http://localhost:8000/api/cover/${encodeURIComponent(song.file_path)}`} alt="art" style={{ width: '50px', height: '50px', borderRadius: '6px', marginRight: '15px', objectFit: 'cover', background: '#282828' }} />
                  <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                    <strong style={{ display: 'block', fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.title}</strong>
                    <span style={{ fontSize: '14px', color: '#b3b3b3' }}>{song.artist} • {song.album}</span>
                  </div>
                  <button onClick={() => { setCurrentSongIndex(actualIndex); setIsPlaying(true); setIsPopupExpanded(true); }} style={{ padding: '8px 20px', cursor: 'pointer', backgroundColor: '#1db954', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>▶ Play</button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div>
            {Object.entries(groupByField(activeTab === "artists" ? "artist" : "album")).map(([categoryName, categorySongs]) => {
              const isOpen = expandedCategory === categoryName;
              return (
                <div key={categoryName} style={{ marginBottom: '12px', backgroundColor: '#181818', borderRadius: '8px', overflow: 'hidden' }}>
                  <div 
                    onClick={() => toggleCategory(categoryName)}
                    style={{ padding: '18px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', backgroundColor: isOpen ? '#202020' : '#181818' }}
                  >
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{activeTab === "artists" ? "🎙️" : "💿"} {categoryName}</span>
                    <span style={{ fontSize: '13px', color: '#b3b3b3' }}>{categorySongs.length} songs {isOpen ? '▲' : '▼'}</span>
                  </div>
                  {isOpen && (
                    <ul style={{ padding: '10px 20px', listStyle: 'none', margin: 0, backgroundColor: '#151515' }}>
                      {categorySongs.map((song) => {
                        const actualIndex = songs.findIndex(s => s.id === song.id);
                        return (
                          <li key={song.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #202020' }}>
                            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
                              <span style={{ fontSize: '15px', fontWeight: '600', display: 'block' }}>{song.title}</span>
                            </div>
                            <button onClick={() => { setCurrentSongIndex(actualIndex); setIsPopupExpanded(true); }} style={{ padding: '6px 16px', cursor: 'pointer', backgroundColor: 'transparent', color: '#1db954', border: '1px solid #1db954', borderRadius: '20px', fontWeight: 'bold' }}>Play</button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

            {/* FLOATING MUSIC HUB COMPACT CONTROLLER & MODAL SLIDER POPUP */}
      {/* FLOATING MUSIC HUB COMPACT CONTROLLER & MODAL SLIDER POPUP */}
{currentSong && (
 <>
   {/* 1. COMPACT BOTTOM BAR (Visible when collapsed) */}
   <div
     onClick={() => setIsPopupExpanded(true)}
     style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#181818', 
     borderTop: '1px solid #282828', padding: '12px 30px', display: 'flex', alignItems: 'center', 
     justifyContent: 'space-between', zIndex: 999, transform: isPopupExpanded ?
     'translateY(100px)' : 'translateY(0)', transition: 'transform 0.4s' }}
   >
     {/* Left: Metadata Details */}
     <div style={{ display: 'flex', alignItems: 'center', width: '30%' }}>
       <img
         src={`http://localhost:8000/api/cover/${encodeURIComponent(currentSong.file_path)}`}
         alt="cover" style={{ width: '50px', height: '50px', borderRadius: '4px', marginRight: '15px', objectFit: 'cover' }} 
       />
       <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
         <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{currentSong.title}</h4>
         <p style={{ margin: 0, fontSize: '12px', color: '#b3b3b3' }}>{currentSong.artist}</p>
       </div>
     </div>
     
     {/* Center Controls: Added Progress Slider Line & Centered Pause Button Layout */}
     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40%' }} onClick={(e) => e.stopPropagation()}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '6px' }}>
         <button onClick={playPrevious} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>⏮</button>
         
         {/* ⏸/▶ PLAYBACK CONTROLLER IN THE MIDDLE */}
         <button 
           onClick={togglePlayPause} 
           style={{ background: '#fff', border: 'none', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
         >
           {isPlaying ? <span style={{ color: '#000', fontSize: '11px' }}>⏸</span> : <span style={{ color: '#000', fontSize: '11px', marginLeft: '2px' }}>▶</span>}
         </button>

         <button onClick={playNext} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', cursor: 'pointer' }}>⏭</button>
       </div>

       {/* SLIM SYSTEM TIMELINE SLIDER */}
       <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '8px' }}>
         <span style={{ fontSize: '10px', color: '#b3b3b3' }}>{formatTimeSeconds(trackProgress)}</span>
         <input 
           type="range" min="0" max={trackDuration || 0} value={trackProgress} onChange={handleProgressBarChange}
           style={{ flex: 1, accentColor: '#1db954', height: '3px', cursor: 'pointer' }} 
         />
         <span style={{ fontSize: '10px', color: '#b3b3b3' }}>{formatTimeSeconds(trackDuration)}</span>
       </div>
     </div>

     {/* Hidden Audio element processing metadata configurations */}
     <audio 
       ref={audioRef}
       src={currentSong ? `http://localhost:8000/api/audio/${encodeURIComponent(currentSong.file_path)}` : ""}
       onEnded={() => playNext(null)} 
       onTimeUpdate={handleTimeUpdate} 
       onLoadedMetadata={handleLoadedMetadata} 
     />

     {/* Right: Active Mode Tracker Badge */}
     <div style={{ width: '30%', display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#1db954', fontWeight: 'bold' }}>
       {playbackMode === "recommendation" ? "✨ AI Vibe Mode" : "📋 Playlist Mode"}
     </div>
   </div>

   {/* 2. FULL SCREEN EXPANDED PLAYER POPUP */}
   <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background:
   'linear-gradient(to bottom, #1e3c72, #121212)', display: 'flex', flexDirection: 'column', 
   alignItems: 'center', justifyContent: 'flex-start', zIndex: 1000, padding: '4px 40px', overflowY:
   'auto', transform: isPopupExpanded ? 'translateY(0)' : 'translateY(100%)', transition:
   'transform 0.5s' }}>
     <button onClick={() => setIsPopupExpanded(false)} style={{ position: 'absolute', 
     top: '30px', left: '30px', background: 'rgba(255,255,255,0.1)', border: 'none', color:
     '#fff', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold' }}>
       ↓ Slide Down
     </button>
     
     <div style={{ position: 'relative', marginBottom: '20px', marginTop: '60px' }}>
       <img
         src={`http://localhost:8000/api/cover/${encodeURIComponent(currentSong.file_path)}`}
         alt="expanded art" style={{ width: '260px', height: '260px', borderRadius: '12px', objectFit: 'cover' }} 
       />
     </div>
     <h2 style={{ margin: '0 0 5px 0' }}>{currentSong.title}</h2>
     <p style={{ margin: '0 0 20px 0', color: '#b3b3b3' }}>{currentSong.artist}</p>

     {/* 🎛️ MODE SELECTOR TOGGLE CONTROLLER */}
<div style={{ display: 'flex', background: '#242424', borderRadius: '30px', padding: '4px', margin: '15px 0', width: '100%', maxWidth: '360px' }}>
  <button
    onClick={() => { 
      setPlaybackMode("playlist"); 
      setRecommendationTracklist([]); 
    }}
    style={{ flex: 1, padding: '10px', borderRadius: '24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: '0.3s', backgroundColor: playbackMode === "playlist" ? "#fff" : "transparent", color: playbackMode === "playlist" ? "#000" : "#b3b3b3" }}
  >
    📋 Normal Playlist
  </button>
  <button
    onClick={async () => {
      setPlaybackMode("recommendation");
      
      const baseSong = songs[currentSongIndex];
      if (!baseSong) return;

      try {
        const response = await fetch('http://localhost:8000/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file_path: baseSong.file_path }),
        });

        if (response.ok) {
          const json = await response.json();
          const rawRecs = json.sdata || (Array.isArray(json) ? json : null);
          
          if (rawRecs && rawRecs.length > 0) {
        
            const sessionTracks = rawRecs.map(rec => {
              return songs.find(s => s.file_path === rec.file_name || s.file_path.endsWith(rec.file_name));
            }).filter(Boolean);

            if (sessionTracks.length > 0) {
              
              setRecommendationTracklist([baseSong, ...sessionTracks]);
              setRecTracklistIndex(0); 
              setIsPlaying(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed to build AI cluster queue tracklist session:", err);
      }
    }}
    style={{ flex: 1, padding: '10px', borderRadius: '24px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: '0.3s', backgroundColor: playbackMode === "recommendation" ? "#1db954" : "transparent", color: playbackMode === "recommendation" ? "#fff" : "#b3b3b3" }}
  >
    ✨ AI Recommendation Vibe
  </button>
</div>


     {/* EXPANDED FULL SYSTEM PROGRESS TIMELINE DISPLAY */}
     <div style={{ width: '100%', maxWidth: '400px', margin: '15px 0' }}>
       <input type="range" min="0" max={trackDuration || 0} value={trackProgress} onChange={handleProgressBarChange} style={{ width: '100%', accentColor: '#1db954', cursor: 'pointer', height: '4px' }} />
       <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#b3b3b3', marginTop: '6px' }}>
         <span>{formatTimeSeconds(trackProgress)}</span>
         <span>{formatTimeSeconds(trackDuration)}</span>
       </div>
     </div>

     {/* EXPANDED SYSTEM NAVIGATION ROW WITH PAUSE BUTTON IN THE MIDDLE */}
     <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '30px' }}>
       <button onClick={playPrevious} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer' }}>⏮</button>
       
       <button 
         onClick={togglePlayPause} 
         style={{ background: '#fff', border: 'none', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
       >
         {isPlaying ? <span style={{ color: '#000', fontSize: '18px' }}>⏸</span> : <span style={{ color: '#000', fontSize: '18px', marginLeft: '3px' }}>▶</span>}
       </button>

       <button onClick={playNext} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer' }}>⏭</button>
     </div>

     {/* RECOMMENDATIONS INJECTION MOUNT TAG */}
     <div style={{ width: '100%', maxWidth: '500px', background: 'rgba(0,0,0,0.5)', borderRadius: '16px', padding: '10px', marginBottom: '20px' }}>
       <Recommendations
         currentTrackPath={currentSong.file_path}
         recommendationTracklist={recommendationTracklist}
         recTracklistIndex={recTracklistIndex}
         songs={songs}
         setCurrentSongIndex={setCurrentSongIndex}
         setQueue={setQueue}
         playbackMode={playbackMode}
       />
     </div>
   </div>
 </>
)}

      
    </div>
  );
}


function TrackRow({song,actualIndex,setCurrentSongIndex,setIsPlaying, setIsPopupExpanded}){
  const [labels,setLabels]=useState([]);
  useEffect(()=>{
    fetch('http://localhost:8000/api/songs/${song.id}/labels')
    .then((res)=> res.json())
    .then((data)=>setLabels(data||[]))
    .catch((err)=>console.error(`Error loading labels for song ${song.id}:`, err));
  },[song.id]);
  return(
    
      <li key={song.id} style={{ display: 'flex', flexDirection:'column', alignItems: 'center', margin: '12px 0', padding: '14px', borderRadius: '8px', backgroundColor: '#181818' }}>
        <img src={`http://localhost:8000/api/cover/${encodeURIComponent(song.file_path)}`} alt="art" style={{ width: '50px', height: '50px', borderRadius: '6px', marginRight: '15px', objectFit: 'cover', background: '#282828' }} />
        <div style={{ flexGrow: 1, overflow: 'hidden' }}>
          <strong style={{ display: 'block', fontSize: '16px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{song.title}</strong>
          <span style={{ fontSize: '14px', color: '#b3b3b3' }}>{song.artist} • {song.album}</span>
        </div>
        <button onClick={() => { setCurrentSongIndex(actualIndex); setIsPlaying(true); setIsPopupExpanded(true); }} style={{ padding: '8px 20px', cursor: 'pointer', backgroundColor: '#1db954', color: '#fff', border: 'none', borderRadius: '20px', fontWeight: 'bold' }}>▶ Play</button>
        <div style={{display:'flex', gap:'6px', marginTop:'10px'}}>
          {labels.map((lbl,idx)=>(
            <span key={idx} style={{fontSize:'11px',padding:'2px 8px', borderRadius:'12px', backgroundColor: '#1db954', color: '#fff'}}>
              {lbl.name}{lbl.confident? '✨' : '?'}
            </span>
          ))}
        </div>
      </li>
            
  )
}
export default App;

