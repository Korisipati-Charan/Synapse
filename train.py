import os
import cv2
import mediapipe as mp
import numpy as np
import joblib
import time
import requests
from requests.auth import HTTPBasicAuth
import zipfile
import shutil
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor

# ==============================================================================
# 1. SYSTEM CONFIGURATION - OMEGA OVERRIDE
# ==============================================================================
KAGGLE_DATASET = "innominate817/hagrid-classification-512p-127k" 
EXTRACT_DIR = "hagrid_payload"
MODEL_NAME = "hagrid_brain_v3_omega.pkl" # The final master model
LIMIT_PER_CLASS = 8000 # Consumes 100% of the dataset

def setup_environment():
    print("\n[1/5] VERIFYING DATASET INTEGRITY...")
    if not os.path.exists(EXTRACT_DIR):
        api_url = f"https://www.kaggle.com/api/v1/datasets/download/{KAGGLE_DATASET}"
        
        # Hardcoded Credentials
        auth = HTTPBasicAuth('charan09032006', 'KGAT_5e3dd4196484457156d6f0a036e104d9')
        response = requests.get(api_url, auth=auth, stream=True)
        
        if response.status_code != 200:
            print(f"[CRITICAL] Connection refused. Status Code: {response.status_code}")
            return False
            
        total_size = int(response.headers.get('content-length', 0))
        zip_path = "hagrid_temp_archive.zip"
        
        print("") 
        with open(zip_path, 'wb') as file, tqdm(
            desc="  -> HaGRID Payload", total=total_size, unit='B', 
            unit_scale=True, unit_divisor=1024, bar_format="{l_bar}{bar:40}{r_bar}", colour="green"
        ) as bar:
            for chunk in response.iter_content(chunk_size=1024*1024):
                if chunk:
                    file.write(chunk)
                    bar.update(len(chunk))
                    
        print("\n  -> Download complete. Extracting images...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(EXTRACT_DIR)
        os.remove(zip_path) 
        
    print("[SUCCESS] Environment Stabilized.")
    return True

# --- WINDOWS MULTI-CORE WORKER ---
def process_single_image(task):
    img_path, class_id = task
    
    with mp.solutions.hands.Hands(static_image_mode=True, max_num_hands=1, min_detection_confidence=0.5) as hands:
        image = cv2.imread(img_path)
        if image is None: return None
        
        image = cv2.resize(image, (128, 128))
        results = hands.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        
        if results.multi_hand_landmarks:
            landmarks = results.multi_hand_landmarks[0].landmark
            wrist = landmarks[0]
            scale = np.sqrt((landmarks[9].x - wrist.x)**2 + (landmarks[9].y - wrist.y)**2) or 1.0
            
            vector = []
            for lm in landmarks:
                vector.extend([(lm.x - wrist.x)/scale, (lm.y - wrist.y)/scale, (lm.z - wrist.z)/scale])
            return (vector, class_id)
    return None

def run_extraction():
    print("\n[2/5] ENGAGING TOTAL CONSUMPTION EXTRACTION...")
    paths_and_labels = []
    class_map = {}
    c_id = 0
    
    for root, _, files in os.walk(EXTRACT_DIR):
        imgs = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        if not imgs: continue
        
        folder = os.path.basename(root)
        if folder not in class_map:
            class_map[folder] = c_id
            c_id += 1
            
        for f in imgs[:LIMIT_PER_CLASS]:
            paths_and_labels.append((os.path.join(root, f), class_map[folder]))

    start_time = time.time()
    X, y = [], []
    
    print(f"  -> Spawning {os.cpu_count()} CPU Workers for {len(paths_and_labels)} images...")
    with ThreadPoolExecutor(max_workers=os.cpu_count()) as executor:
        results = list(tqdm(executor.map(process_single_image, paths_and_labels), total=len(paths_and_labels), desc="  -> Extracting Skeletons", colour="blue"))

    for r in results:
        if r is not None:
            X.append(r[0])
            y.append(r[1])

    print(f"\n[SUCCESS] Extracted {len(X)} valid skeletons in {time.time() - start_time:.2f}s")
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32), class_map

def run_training(X, y):
    print("\n[3/5] COMPILING OMEGA-STATE DECISION TREES...")
    try:
        from cuml.ensemble import RandomForestClassifier as cuRF
        print("  -> RAPIDS DETECTED: Utilizing CUDA Cores for Training.")
        model = cuRF(n_estimators=500, max_depth=45)
    except ImportError:
        from sklearn.ensemble import RandomForestClassifier as cuRF
        print("  -> RAPIDS NOT FOUND: Utilizing 100% CPU Parallelization.")
        model = cuRF(n_estimators=500, max_depth=45, n_jobs=-1, random_state=42)

    t0 = time.time()
    model.fit(X, y)
    print(f"[SUCCESS] Omega Model Compiled in {time.time() - t0:.2f}s")
    
    joblib.dump(model, MODEL_NAME, compress=1)
    print(f"[4/5] Brain Exported: {MODEL_NAME}")

def cleanup():
    print("\n[5/5] EXECUTING SECURE PURGE...")
    if os.path.exists(EXTRACT_DIR):
        shutil.rmtree(EXTRACT_DIR)
    print("="*60)
    print(f"[SYSTEM READY] Update server.py to use {MODEL_NAME}")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        if setup_environment():
            features, targets, mapping = run_extraction()
            if len(features) > 0:
                run_training(features, targets)
                print(f"\n--- HA-GRID LABEL DICTIONARY (Copy to server.py) ---")
                print(mapping)
                cleanup()
            else:
                print("[CRITICAL] No data extracted. Check dataset.")
    except Exception as e:
        print(f"\n[CRITICAL ERROR] Pipeline failed: {e}")