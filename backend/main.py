from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from emotion import process_emotion
from gaze import process_gaze

app = FastAPI()

# ✅ Add CORS settings here
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Allow your Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/detect-emotion")
async def detect_emotion(file: UploadFile = File(...)):
    return await process_emotion(file)

@app.post("/gaze-coordinates")
async def gaaze_coordinates(file: UploadFile = File(...)):
    return await process_gaze(file)
