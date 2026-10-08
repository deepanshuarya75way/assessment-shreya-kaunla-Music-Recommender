import librosa
import matplotlib.pyplot as plt
import numpy as np
import librosa.display
import sqlite3 as sql
from tinytag import TinyTag
import os
import tensorflow as tf
import multiprocessing
DB_PATH = "sql_db.db"
MUSIC_FOLDER = os.path.join(r"/home/coder/workspace/assessment-shreya-kaunla-Music-Recommender","New folder")
l=[]
def run_scan():
    conn=sql.connect(DB_PATH, timeout=30.0)
    cursor=conn.cursor()
    cursor.execute("""Create table if not EXISTS tracks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT UNIQUE,
                title TEXT,
                artist TEXT,
                album TEXT,
                vector_data BLOB,
                cluster_id INTEGER );""")

    cursor.execute(f"""
        CREATE TABLE IF NOT EXISTS mood_labels(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL);""")
    cursor.execute("""CREATE TABLE IF NOT EXISTS track_mood_mappings(track_id INTEGER, label_id INTEGER, confidence_score REAL NOT NULL, 
        is_confident BOOLEAN NOT NULL CHECK(is_confident IN (0,1)), PRIMARY KEY(track_id, label_id),FOREIGN KEY (track_id) REFERENCES tracks (id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES mood_labels (id) ON DELETE CASCADE); """)
    for label in ["Focus", "Exercise", "Relaxing", "Melancholic","Energetic"]:
        cursor.execute("INSERT OR IGNORE INTO mood_labels(name) VALUES(?);", (label,))
    conn.commit()
    list=os.listdir(MUSIC_FOLDER)
    for i in list:
        if(i.endswith(".mp3")):
            path=os.path.join(MUSIC_FOLDER,i)
            l.append(path)
            
            tag=TinyTag.get(path)
            if(tag.title):
                title=tag.title
                
            else:
                k=i.split(".")
                title=k[0]
            if(tag.artist):
                artist=tag.artist.capitalize()

            
            else:
                
                artist="unkown artist"
            if(tag.album):
                album=tag.album
            
            else:
                
                album="unknown"
            cursor.execute(""" Insert or ignore 
                            Into tracks(file_path, title, artist, album)
                            values(?,?,?,?)""",(i,title, artist, album))
            
    conn.commit()  
    cursor.execute("select * from tracks")
    songs=cursor.fetchall()
    print(f"Scan complete. {len(songs)} tracks found in database.")
    conn.close()
def process(s):
    p, i=s
    path=os.path.join(MUSIC_FOLDER, i)
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(None, 128)),
        
        # The New Convolutional Layer
        tf.keras.layers.Conv1D(filters=32, kernel_size=3, activation='relu'),
        
        tf.keras.layers.GlobalAveragePooling1D(),
        tf.keras.layers.Dense(128, activation='linear')
    ])
    
    
    if os.path.isfile(path) and i.endswith(".mp3"):
        try:
            y, sr=librosa.load(path, sr=None, mono=True, dtype=np.float32)
            current_fft = 2048 if sr <= 22050 else 4048
            current_hop = 512 if sr <= 22050 else 1024
            matrix=librosa.feature.melspectrogram(y=y, sr=sr, n_fft=current_fft, hop_length=current_hop, n_mels=128, fmin=0.0, fmax=11025.0)
            clean=librosa.power_to_db(matrix, ref=np.max)
            
            clean_tensor=tf.expand_dims(clean.T, axis=0)
            output=model(clean_tensor)
            fingerprint=output.numpy().flatten()
            blob=fingerprint.tobytes()
            return blob,path
        except Exception as e:
            print(f"error {i}:{e}  ")
            return None


def mel():
    master=[]
    songs=[]
    tasks=[]
    broken=[]
    conn=sql.connect(DB_PATH, timeout=30.0)
    cursor=conn.cursor()
    cursor.execute("PRAGMA table_info(tracks)")
    k = cursor.fetchall()
    
    
    column_names = [row[1] for row in k]
    
    if "vector_data" not in column_names:
        cursor.execute(""" Alter table tracks add column vector_data BLOB
                """)
        conn.commit() 
    list=os.listdir(MUSIC_FOLDER)
    for i in list:
        if(i.endswith(".mp3")):
            songs.append(i)
    for i in songs:
        
        cursor.execute("SELECT file_path FROM tracks WHERE vector_data IS NOT NULL")
        done = cursor.fetchall()
        completed = {row[0] for row in done}
        if(i not in completed):
            try:
                tag=TinyTag.get(os.path.join(MUSIC_FOLDER,i))
                tasks.append((MUSIC_FOLDER,i))
            except Exception as e:
                broken.append((os.path.join(MUSIC_FOLDER,i),))
        
    with multiprocessing.Pool() as pool:
        result=pool.map(process,tasks)
    for i in result:
        if(i!=None):
            master.append(i)

           
    if master:
        
        
        print(f"Writing {len(master)} fingerprints to the database in bulk...")
        cursor.executemany("UPDATE tracks SET vector_data=? WHERE file_path=? ", master)
        
        conn.commit()
        
         
    if broken:
            cursor.executemany("delete from tracks where file_path=? ", broken)
            conn.commit()
    conn.close() 




def clustering():
    conn=sql.connect(DB_PATH)
    cursor=conn.cursor()  
    cursor.execute(""" Select vector_data  from tracks WHERE vector_data IS NOT NULL order by Random() limit 20
                   """)
    cent=cursor.fetchall()
    centroids=[]
    for i in cent:
        centroids.append(np.frombuffer(i[0], dtype=np.float32))
    cursor.execute(""" Select file_path, vector_data from tracks
                   WHERE vector_data IS NOT NULL """)
    vectors=cursor.fetchall()

    songs=[]
    for i in vectors:
        s=i[0]
        vec=np.frombuffer(i[1], dtype=np.float32)
        
        songs.append({"song": s, "vector": vec})
    conn.close()
    for r in range(15):
        clust = {i: [] for i in range(20)}
        
        for i in songs :   
            s_id=0
            min=float("inf")
            for id,cent in enumerate(centroids):
                
                dist=np.sqrt(np.sum((cent-i["vector"])**2))
                if(min>dist):
                    min=dist
                    s_id=id
            clust[s_id].append(i)
        new_cent=[]  
        for i in range(20):
            song_list=clust[i]
            
            if len(song_list)>0:
                arrays = [s["vector"] for s in song_list]
                nc=np.mean(arrays,axis=0)
                new_cent.append(nc)
            else:
                new_cent.append(centroids[i])
        centroids=new_cent
    conn = sql.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(tracks)")
    columns = [row[1] for row in cursor.fetchall()]
    if "cluster_id" not in columns:
        cursor.execute("ALTER TABLE tracks ADD COLUMN cluster_id INTEGER")
        conn.commit()
    lst=[]
    for i in range(20):
        lst2=clust[i]
        for j in lst2:
            lst.append((i,j["song"]))
    if lst:
        print(f"Saving {len(lst)} cluster assignments to SQLite...")
        cursor.executemany("UPDATE tracks SET cluster_id=? WHERE file_path=?", lst)
        conn.commit()
    conn.close()
if __name__ == "__main__":
    
    run_scan()
  
