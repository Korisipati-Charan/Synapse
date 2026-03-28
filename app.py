import streamlit as st
from streamlit_webrtc import webrtc_streamer, VideoProcessorBase
import av, cv2, joblib, os, time, threading, queue
import pandas as pd
import mediapipe as mp
import pyttsx3

# --- 1. STATE & QUEUES ---
if 'memory_log' not in st.session_state:
    st.session_state.memory_log = []

speech_queue = queue.Queue()
memory_queue = queue.Queue()

def speech_worker():
    import pythoncom
    pythoncom.CoInitialize()
    
    while True:
        text = speech_queue.get()
        if text is None: break
        
        engine = pyttsx3.init()
        engine.setProperty('rate', 150)
        engine.say(text)
        engine.runAndWait()
        
        speech_queue.task_done()

threading.Thread(target=speech_worker, daemon=True).start()

# --- 2. DICTIONARIES ---
GESTURE_MAP = {
    '0': "Okay", '1': "Peace", '2': "Thumbs Up", '4': "Thumbs Down",
    '5': "Call Me", '8': "Rock On", '10': "Fist", '11': "Stop",
    '12': "Live Long", '15': "I Love You", '16': "Point Up",
    '17': "Point Down", '18': "Point Left"
}

PHRASE_MAP = {
    '0': "Everything is okay!", '1': "Bye bye! Peace out.", 
    '2': "Great job!", '5': "Call me later!", '15': "I love you too!"
}

# --- 3. ML SETUP ---
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(max_num_hands=1, model_complexity=0, min_detection_confidence=0.5)
mp_draw = mp.solutions.drawing_utils

@st.cache_resource
def load_model():
    return joblib.load("gesture_model.pkl") if os.path.exists("gesture_model.pkl") else None

model = load_model()

# --- 4. VIDEO PROCESSING ---
class GestureProcessor(VideoProcessorBase):
    def __init__(self):
        self.last_spoken_code = None
        self.gesture_start_time = 0
        self.current_code = "None"
        self.current_text = "Waiting..."

    def recv(self, frame: av.VideoFrame) -> av.VideoFrame:
        img = cv2.flip(frame.to_ndarray(format="bgr24"), 1)
        small_img = cv2.resize(img, (320, 240))
        results = hands.process(cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB))
        
        code = "None"
        text = "No Hand"
        
        if results.multi_hand_landmarks and model:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_draw.draw_landmarks(img, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                base_x = hand_landmarks.landmark[0].x
                base_y = hand_landmarks.landmark[0].y
                base_z = hand_landmarks.landmark[0].z
                
                landmarks = []
                for lm in hand_landmarks.landmark:
                    landmarks.extend([lm.x - base_x, lm.y - base_y, lm.z - base_z])
                
                try:
                    code = str(model.predict(pd.DataFrame([landmarks]))[0]).strip()
                    text = GESTURE_MAP.get(code, f"Unknown ({code})")
                except:
                    pass

        # --- SMART TRIGGER ---
        if code != "None" and code != self.last_spoken_code:
            if self.current_code != code:
                self.gesture_start_time = time.time()
                self.current_code = code
            elif time.time() - self.gesture_start_time > 1.5:
                phrase = PHRASE_MAP.get(code, text) 
                speech_queue.put(phrase)
                memory_queue.put(text)
                self.last_spoken_code = code 
                
        elif code == "None":
            self.last_spoken_code = None
            self.current_code = "None"

        self.current_text = text
        cv2.putText(img, f"Gesture: {text}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        return av.VideoFrame.from_ndarray(img, format="bgr24")

# --- 5. UI ---
st.set_page_config(page_title="Animesta AI", layout="centered")
st.title("🌟 Animesta: Infinite Live Mode")

if model is None:
    st.error("❌ 'gesture_model.pkl' not found! Run train.py first.")
    st.stop()

ctx = webrtc_streamer(
    key="animesta-cam",
    video_processor_factory=GestureProcessor,
    rtc_configuration={"iceServers": [{"urls": ["stun:stun.l.google.com:19302"]}]},
    media_stream_constraints={"video": True, "audio": False},
)

st.write("---")
st.subheader("🧠 Live Session Memory")
memory_box = st.empty()

# --- 6. THE STREAMLIT INFINITE LOOP ---
if ctx.state.playing:
    # 1. Unpack any new gestures from the background thread
    while not memory_queue.empty():
        new_gesture = memory_queue.get()
        if len(st.session_state.memory_log) == 0 or st.session_state.memory_log[-1] != new_gesture:
            st.session_state.memory_log.append(new_gesture)
    
    # 2. Draw the memory log on the screen
    if len(st.session_state.memory_log) > 0:
        memory_box.markdown(f"### **{' ➔ '.join(st.session_state.memory_log)}**")
    else:
        memory_box.write("*Waiting for first gesture...*")
        
    # 3. Wait half a second, then tell Streamlit to restart the page! 
    time.sleep(0.5)
    st.rerun()