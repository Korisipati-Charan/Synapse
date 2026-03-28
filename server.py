import json
import asyncio
import torch
import numpy as np
import joblib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

# ============================================================================
# 1. SERVER CONFIGURATION & CORS
# ============================================================================
app = FastAPI(title="Synapse V2V Neural Core")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# 2. AI MODEL INITIALIZATION (LOADED INTO VRAM ON BOOT)
# ============================================================================
print("[SYS] Booting AI Cores. Please wait...")

# --- 2A. Load the Language Model (TinyLlama) ---
try:
    llm_pipeline = pipeline(
        "text-generation", 
        model="TinyLlama/TinyLlama-1.1B-Chat-v1.0", 
        torch_dtype=torch.bfloat16, 
        device_map="auto" 
    )
    print("[SYS] TinyLlama Text Core: ONLINE")
except Exception as e:
    print(f"[CRITICAL] Failed to load LLM: {e}")
    llm_pipeline = None

# --- 2B. Load the HaGRID Gesture Model ---
try:
    gesture_model = joblib.load("hagrid_brain_v3_omega.pkl")
    print("[SYS] HaGRID Vision Core (v3 Omega): ONLINE")
except Exception as e:
    print(f"[WARNING] Failed to load hagrid_brain_v3_omega.pkl. Fallback math will be used. ({e})")
    gesture_model = None

# ============================================================================
# 3. GLOBAL MEMORY STATE (WITH ENGLISH-ONLY LOCK)
# ============================================================================
system_prompt = {
    "role": "system", 
    "content": "You are Synapse, a highly advanced, concise AI assistant. Respond directly and quickly. Do not use emojis. You must speak exclusively in English unless explicitly commanded otherwise by the user."
}
chat_history = [system_prompt]

is_generating = False 

# ============================================================================
# 4. HELPER FUNCTIONS
# ============================================================================
def generate_llm_response(user_text):
    """Runs the heavy PyTorch inference without blocking the WebSocket."""
    global chat_history, is_generating
    
    chat_history.append({"role": "user", "content": user_text})
    
    if not llm_pipeline:
        return "Warning: Language Model is currently offline."

    prompt = llm_pipeline.tokenizer.apply_chat_template(
        chat_history, tokenize=False, add_generation_prompt=True
    )

    is_generating = True
    
    outputs = llm_pipeline(
        prompt, 
        max_new_tokens=150, 
        do_sample=True, 
        temperature=0.7, 
        top_k=50, 
        top_p=0.95
    )
    
    is_generating = False
    
    full_output = outputs[0]["generated_text"]
    response = full_output.split("<|assistant|>")[-1].strip()
    
    chat_history.append({"role": "assistant", "content": response})
    return response

# ============================================================================
# 5. WEBSOCKET ROUTER (THE NEURAL LINK)
# ============================================================================
@app.websocket("/ws/predict")
async def websocket_endpoint(websocket: WebSocket):
    global chat_history, is_generating
    
    await websocket.accept()
    print("\n[HCI] >>> Client connected to Neural Link. <<<")

    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            intent = payload.get("intent")

            # ---------------------------------------------------------
            # A. VOICE / TEXT COMMANDS
            # ---------------------------------------------------------
            if intent == "command":
                user_text = payload.get("text", "").strip()
                internet_active = payload.get("internetActive", False)
                tier_label = "OMNI" if internet_active else "REQUIEM"
                
                print(f"[{tier_label} USER] {user_text}")
                
                ai_response = await asyncio.to_thread(generate_llm_response, user_text)
                
                print(f"[{tier_label} AI] {ai_response}")
                
                await websocket.send_json({
                    "text": ai_response,
                    "tier": tier_label,
                    "status": "NOMINAL" 
                })

            # ---------------------------------------------------------
            # B. PASSIVE HAND GESTURE TRACKING
            # ---------------------------------------------------------
            elif intent == "check_gesture":
                landmarks = payload.get("landmarks", [])
                predicted_gesture = "SEARCHING..."
                
                if landmarks:
                    if gesture_model:
                        try:
                            row = []
                            for lm in landmarks:
                                row.extend([lm['x'], lm['y'], lm['z']])
                            
                            X_input = np.array([row])
                            prediction = gesture_model.predict(X_input)
                            predicted_gesture = str(prediction[0]).upper()
                        except Exception as e:
                            print(f"[VISION ERROR] Scikit-Learn inference failed: {e}")
                            predicted_gesture = "MODEL_ERROR"
                    else:
                        wrist_y = landmarks[0]['y']
                        middle_finger_y = landmarks[12]['y']
                        index_finger_y = landmarks[8]['y']
                        
                        if index_finger_y < wrist_y and middle_finger_y > wrist_y:
                            predicted_gesture = "POINTING"
                        elif middle_finger_y < wrist_y - 0.2:
                            predicted_gesture = "OPEN PALM"
                        else:
                            predicted_gesture = "FIST / RESTING"
                
                await websocket.send_json({
                    "gesture": predicted_gesture
                })

            # ---------------------------------------------------------
            # C. MEMORY PURGE
            # ---------------------------------------------------------
            elif intent == "purge_memory":
                print("[SYS] Hard Purge triggered. Wiping context memory.")
                chat_history = [system_prompt]
                
            # ---------------------------------------------------------
            # D. VOCAL OVERRIDE / HALT
            # ---------------------------------------------------------
            elif intent == "halt_generation":
                print("[CRITICAL] Halt command received. AI silenced.")
                is_generating = False

    except WebSocketDisconnect:
        print("[HCI] >>> Client disconnected from Neural Link. <<<")
    except Exception as e:
        print(f"[ERROR] Engine Failure: {str(e)}")

# To start the server: uvicorn server:app --host 0.0.0.0 --port 8000