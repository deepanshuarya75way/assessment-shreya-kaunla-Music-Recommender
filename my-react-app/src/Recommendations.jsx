import React from 'react';

export default function Recommendations({ songs = [], playbackMode, recommendationTracklist = [], recTracklistIndex }) {
 
  const displayTracks = playbackMode === "recommendation" 
    ? recommendationTracklist.slice(recTracklistIndex + 1) 
    : [];

  return (
    <div style={{ padding: '15px', color: '#fff', fontFamily: 'sans-serif' }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
        <span>{playbackMode === "recommendation" ? "✨ AI Recommendation Queue" : "🎵 Recommendations Pool"}</span>
        {playbackMode === "recommendation" && (
          <span style={{ fontSize: '11px', color: '#1db954', backgroundColor: 'rgba(29,185,84,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
            {displayTracks.length} Songs Left
          </span>
        )}
      </h3>
      
      <ul style={{ listStyleType: 'none', paddingLeft: 0, margin: 0, maxHeight: '200px', overflowY: 'auto' }}>
        {playbackMode === "playlist" ? (
          <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', margin: '15px 0' }}>
            Switch over to <b>AI Recommendation Vibe</b> mode above to lock in a dynamic similar-vibe queue!
          </p>
        ) : displayTracks.length > 0 ? (
          displayTracks.map((track, i) => (
            <li 
              key={track.id || i} 
              style={{ padding: '10px', backgroundColor: '#181818', borderRadius: '6px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #282828' }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{track.title || "Unknown Title"}</div>
                <div style={{ fontSize: '12px', color: '#aaa' }}>{track.artist || "Unknown Artist"}</div>
              </div>
              <span style={{ fontSize: '11px', color: '#1db954', fontWeight: 'bold' }}>
                {i === 0 ? "🔥 Up Next" : `In ${i + 1} tracks`}
              </span>
            </li>
          ))
        ) : (
          <p style={{ color: '#aaa', fontSize: '13px', textAlign: 'center', margin: '15px 0' }}>
            You've reached the end of your recommendation vibe cycle!
          </p>
        )}
      </ul>
    </div>
  );
}
