from mutagen.mp3 import MP3
from mutagen.id3 import ID3, APIC
import os
import numpy as np
from pydantic import BaseModel
import sqlite3 as sql
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, FileResponse, RedirectResponse
import urllib.parse

from scan import run_scan, mel, clustering

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(r"/home/coder/workspace/assessment-shreya-kaunla-Music-Recommender/backend","sql_db.db")
MUSIC_FOLDER = os.path.join(r"/home/coder/workspace/assessment-shreya-kaunla-Music-Recommender","New folder")

@app.on_event("startup")
def startup_scan():
    try:
        # Step 1: Always scan the directory for new tracks first (Runs fast, does not re-extract features)
        print("📁 Step 1: Syncing directory for new track metadata...")
        run_scan()
        
        # Connect to see if any music file needs feature processing
        conn = sql.connect(DB_PATH, timeout=30.0)
        cursor = conn.cursor()
        
        # Look for tracks where the neural network fingerprint is missing
        cursor.execute("SELECT COUNT(*) FROM tracks WHERE vector_data IS NULL")
        unprocessed_count = cursor.fetchone()[0]
        
        # Look for tracks where the cluster ID hasn't been assigned yet
        cursor.execute("SELECT COUNT(*) FROM tracks WHERE cluster_id IS NULL")
        unclustered_count = cursor.fetchone()[0]
        conn.close()

        # Step 2: CONDITIONAL FEATURE EXTRACTION (mel)
        if unprocessed_count > 0:
            print(f"🎵 Step 2: Found {unprocessed_count} new track(s). Processing audio matrices...")
            mel()
        else:
            print("✅ Step 2: All audio fingerprints match database records. Skipping extraction cache.")

        # Step 3: CONDITIONAL K-MEANS RE-CLUSTERING
        if unclustered_count > 0 or unprocessed_count > 0:
            print("✨ Step 3: Recalculating AI vector neighborhood profiles...")
            clustering()
        else:
            print("✅ Step 3: Cluster grid stable. Skipping K-Means calculation loop.")
        
        print("🎉 Web app server ready for incoming requests!")
        
    except Exception as e:
        print(f"⚠️ Indexing pipeline bypassed due to environment layout adjustments: {e}")

@app.get("/api/songs")
def get_all_songs():
    conn = sql.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT id, file_path, title, artist, album FROM tracks")
    rows = cursor.fetchall()
    conn.close()

    songs_list = []
    for row in rows:
        
        songs_list.append({
            "id": row[0],
            "file_path": row[1],  
            "title": row[2],
            "artist": row[3],
            "album": row[4]
        })
    return songs_list


@app.get("/api/audio/{filename:path}")
def stream_audio(filename: str):
    
    decoded_filename = urllib.parse.unquote(filename)
    
    
    full_audio_path = os.path.join(MUSIC_FOLDER, os.path.basename(decoded_filename))
    
    if not os.path.exists(full_audio_path):
        raise HTTPException(status_code=404, detail=f"Audio file not found at: {full_audio_path}")
    return FileResponse(full_audio_path, media_type="audio/mpeg", filename=os.path.basename(decoded_filename))


@app.get("/api/cover/{filename:path}")
def get_cover_art(filename: str):
    
    decoded_path = urllib.parse.unquote(filename)
    
    
    if os.path.isabs(decoded_path):
        full_audio_path = decoded_path
    else:
        
        full_audio_path = os.path.join(MUSIC_FOLDER, os.path.basename(decoded_path))
    
    
    print(f"Targeting metadata extraction at: {full_audio_path}")
    
    if not os.path.exists(full_audio_path):
        
        return RedirectResponse(url="https://unsplash.com")
    
    try:
        
        audio = MP3(full_audio_path, ID3=ID3)
        
        
        if audio.tags:
            for tag in audio.tags.values():
                if isinstance(tag, APIC):
                    
                    return Response(content=tag.data, media_type=tag.mime)
                    
    except Exception as e:
        print(f"Metadata extraction bypass for {filename}: {e}")
    
    
    return RedirectResponse(url="https://unsplash.com")


class RecommendationRequest(BaseModel):
    file_path: str
def recommender(target):
    s=os.path.basename(target)

    conn=sql.connect(DB_PATH)
    cursor=conn.cursor()
    cursor.execute("""
        SELECT vector_data, cluster_id FROM tracks 
        WHERE file_path = ? OR file_path = ? OR file_path LIKE ?
    """, (target, s, f"%{s}"))
    t=cursor.fetchone() 
    vector,cluster=t
    target_array=np.frombuffer(vector, dtype=np.float32)
    
    cursor.execute("""
        SELECT file_path, vector_data FROM tracks 
        WHERE cluster_id = ? AND file_path != ? AND file_path != ? AND vector_data IS NOT NULL
    """, (cluster, target, s))
    list=cursor.fetchall()
    conn.close()
    
    if not list:
        print("No other songs found inside this cluster bucket neighborhood yet.")
        return []
    recommendation_queue=[]
    for i in list:
        match, match_vector=i
        array=np.frombuffer(match_vector, dtype=np.float32)
        distance = np.sqrt(np.sum((target_array - array) ** 2))
        recommendation_queue.append({"path": os.path.join(MUSIC_FOLDER,match), "score": distance})
    recommendation_queue.sort(key=lambda x: x["score"])
    top_20_matches = recommendation_queue[:20]
    return top_20_matches




@app.post("/api/recommendations")
# Inside Main.py -> @app.post("/api/recommendations")
@app.post("/api/recommendations")
def get_music_recommendations(request: RecommendationRequest):
    real_disk_path = os.path.join(MUSIC_FOLDER, request.file_path)
    
    if not os.path.exists(real_disk_path):
        raise HTTPException(status_code=404, detail=f"Target audio file path not found: {real_disk_path}")
    
    try:
        raw_results = recommender(real_disk_path)
        formatted_results = []
        
        for rank, track in enumerate(raw_results, start=1):
            # Extract pure filename to cross-reference cleanly with React state properties
            clean_name = os.path.basename(track["path"])
            
            formatted_results.append({
                "rank": rank,
                "file_name": clean_name,
                "full_path": track["path"], # Kept for safety
                "score": float(track["score"]) 
            })
        
        return {"status": "success", "sdata": formatted_results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")
from pydantic import BaseModel
from fastapi import HTTPException
class Recalculations(BaseModel):
    track_ids:list[int]

def init_mood_tables():
   conn=sql.connect(DB_PATH)
    cursor=conn.cursor()
    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS mood_labels(id INTEGER PRIMARY KEY AUTOINCREMET, name TEXT UNIQUE NOT NULL);""")
        cursor.execute("""CREATE TABLE IF NOT EXISTS track_mood_mappings(track_id INTEGER, label_id INTEGER, confidence_score REAL NOT NULL, 
        is_confident BOOLEAN NOT NULL CHECK(is_confident IN (0,1)), PRIMARY KEY(track_id, label_id)); """)
        for label in ["Focus", "Exercise", "Relaxi"]