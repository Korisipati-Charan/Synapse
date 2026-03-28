import asyncio
import joblib
import numpy as np
import torch
from collections import deque
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline, logging

# Silence the Hugging Face generation warnings
logging.set_verbosity_error()

app = FastAPI()

# Allow React frontend to connect seamlessly
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"]
)

class SynapseCore:
    def __init__(self):
        print("\n" + "="*60)
        print("[BOOT] SYNAPSE HCI: NEURAL ENGINE ONLINE")
        print("="*60)
        
        # Hardware target (Will load into VRAM)
        self.device = "cuda:0" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.bfloat16 if self.device == "cuda:0" else torch.float32
        print(f"[SYSTEM] Hardware: {self.device.upper()} | Precision: {self.dtype}")
        
        # --- DSA OPTIMIZATION: O(1) Sliding Window Data Structures ---
        self.window_size = 10
        self.gesture_history = deque()
        self.gesture_freq = {} 
        self.current_stable_gesture = "SCANNING..."

        try:
            print("[LOAD] Mounting TinyLlama [Standard-Brain]...")
            self.tier1 = pipeline("text-generation", model="TinyLlama/TinyLlama-1.1B-Chat-v1.0", device=self.device, torch_dtype=self.dtype)
            
            print("[LOAD] Mounting Qwen 2.5 [Elevated-Brain]...")
            self.tier2 = pipeline("text-generation", model="Qwen/Qwen2.5-1.5B-Instruct", device=self.device, torch_dtype=self.dtype)
            
            print("[LOAD] Mounting HaGRID OMEGA Classifier...")
            self.gesture_model = joblib.load("hagrid_brain_v3_omega.pkl")
            
            self.labels = {
                0: 'CALL', 1: 'DISLIKE', 2: 'FIST', 3: 'FOUR', 4: 'LIKE', 5: 'MUTE', 
                6: 'OKAY', 7: 'ONE', 8: 'PALM', 9: 'PEACE', 10: 'PEACE INVERTED', 
                11: 'ROCK ON', 12: 'STOP', 13: 'STOP INVERTED', 14: 'THREE', 
                15: 'ALT THREE', 16: 'TWO UP', 17: 'TWO UP INVERTED'
            }
            print("[SUCCESS] All Systems Armed. Synapse Node Ready.\n")
        except Exception as e:
            print(f"[BOOT_ERROR] Critical System Failure: {e}")

    def process_gesture(self, landmarks):
        try:
            wrist = landmarks[0]
            dx = landmarks[9]['x'] - wrist['x']
            dy = landmarks[9]['y'] - wrist['y']
            hand_scale = np.sqrt(dx**2 + dy**2)
            if hand_scale == 0: hand_scale = 1.0

            feature_vector = []
            for lm in landmarks:
                feature_vector.extend([
                    (lm['x'] - wrist['x']) / hand_scale, 
                    (lm['y'] - wrist['y']) / hand_scale, 
                    (lm['z'] - wrist['z']) / hand_scale
                ])
            
            raw_idx = self.gesture_model.predict([feature_vector])[0]

            # --- DSA OPTIMIZATION: O(1) Rolling Hash Map ---
            if len(self.gesture_history) == self.window_size:
                removed_idx = self.gesture_history.popleft()
                self.gesture_freq[removed_idx] -= 1

            self.gesture_history.append(raw_idx)
            self.gesture_freq[raw_idx] = self.gesture_freq.get(raw_idx, 0) + 1

            mapped_name = self.labels.get(raw_idx, f"UNMAPPED_{raw_idx}")
            print(f"[TELEMETRY] Raw Model Output: {raw_idx} -> {mapped_name}    ", end="\r")

            # Update stable state if the current threshold is met
            if self.gesture_freq[raw_idx] >= 3:
                proper_name = self.labels.get(raw_idx, f"UNMAPPED_{raw_idx}")
                self.current_stable_gesture = proper_name.upper()
            
            return self.current_stable_gesture
            
        except Exception as e:
            return "SCANNING..."

    def purge_memory(self):
        # Instantly drop all queued gestures and reset the Hash Map
        self.gesture_history.clear()
        self.gesture_freq.clear()
        self.current_stable_gesture = "SCANNING..."
        print("\n[SYS] VRAM and Sensor buffers purged due to protocol shift.")

    async def process_intent(self, text, hci_active):
        needs_qwen = hci_active or len(text.split()) > 10 or any(w in text.lower() for w in ["explain", "code", "analyze"])
        
        model = self.tier2 if needs_qwen else self.tier1
        tier_label = "QWEN-CORE" if needs_qwen else "LLAMA-FAST"
        
        prompt = f"<|system|>\nYou are Synapse HCI. Be concise and technical.<|user|>\n{text}<|assistant|>\n"
        
        res = await asyncio.to_thread(
            model, prompt, max_new_tokens=100, return_full_text=False, do_sample=True, temperature=0.7
        )
        
        return {
            "text": res[0]['generated_text'].strip(), 
            "tier": tier_label,
            "status": "TRANSPOSED" if needs_qwen else "NORMAL"
        }

engine = SynapseCore()

# Background task to process LLM without blocking the gesture loop
async def handle_llm_request(websocket: WebSocket, text: str, hci_active: bool):
    try:
        response = await engine.process_intent(text, hci_active)
        await websocket.send_json(response)
        print(f"\n[SYS] Response routed via {response['tier']}.")
    except Exception as e:
        print(f"\n[CRITICAL ERROR] LLM Task Failed: {e}")

@app.websocket("/ws/predict")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("\n[NETWORK] HCI Terminal Linked.")
    
    try:
        while True:
            data = await websocket.receive_json()
            intent = data.get("intent")
            
            # Route 1: Gesture Processing (High-frequency, fast)
            if intent == "check_gesture" or "landmarks" in data:
                landmarks = data.get("landmarks")
                if landmarks:
                    gesture = engine.process_gesture(landmarks)
                    await websocket.send_json({"gesture": gesture})
                
            # Route 2: LLM Command (Low-frequency, slow)
            elif intent == "command" or "text" in data:
                user_text = data.get("text", "")
                hci_active = data.get("hciActive", False)
                print(f"\n[USER_VOICE] Incoming Command: '{user_text}'")
                
                # Background the LLM processing so the loop continues instantly
                asyncio.create_task(handle_llm_request(websocket, user_text, hci_active))
                
            # Route 3: Vocal Interruption
            elif intent == "halt_generation":
                print("\n[SYS] >> HALT COMMAND RECEIVED FROM FRONTEND <<")

            # Route 4: Hard Memory Purge
            elif intent == "purge_memory":
                engine.purge_memory()
                
    except WebSocketDisconnect:
        print("\n[NETWORK] HCI Terminal Disconnected.")
    except Exception as e:
        print(f"\n[NETWORK ERROR] {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)