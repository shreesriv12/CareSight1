import cv2
import numpy as np
import mediapipe as mp
from fastapi import UploadFile
from fastapi.responses import JSONResponse

# Initialize MediaPipe FaceMesh with refine_landmarks
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True
)

# Landmarks for left eye
LEFT_EYE_H = [33, 133]     # Eye corners (horizontal)
LEFT_EYE_V = [145, 159]    # Top and bottom eyelids
LEFT_IRIS = 468

# Landmarks for right eye
RIGHT_EYE_H = [362, 263]   # Eye corners (horizontal)
RIGHT_EYE_V = [374, 386]   # Top and bottom eyelids
RIGHT_IRIS = 473

def read_image(file: UploadFile) -> np.ndarray:
    contents = file.file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def get_gaze_coordinates(landmarks, image_w, image_h):
    """
    Get gaze coordinates by averaging both eyes with enhanced sensitivity.
    Returns (x, y) where:
    - x: 0.0 = looking left, 0.5 = center, 1.0 = looking right
    - y: 0.0 = looking up, 0.5 = center, 1.0 = looking down
    """
    try:
        # Get left eye gaze with enhanced landmarks
        left_iris = landmarks[LEFT_IRIS]
        # Use more precise eye corner landmarks
        left_eye_left_x = landmarks[33].x * image_w  # inner corner
        left_eye_right_x = landmarks[133].x * image_w  # outer corner
        left_iris_x = left_iris.x * image_w
        left_x_ratio = (left_iris_x - left_eye_left_x) / (left_eye_right_x - left_eye_left_x + 1e-6)
        
        # Enhanced vertical calculation using correct landmarks
        left_eye_top_y = landmarks[145].y * image_h     # upper eyelid
        left_eye_bottom_y = landmarks[159].y * image_h  # lower eyelid
        left_iris_y = left_iris.y * image_h
        left_y_ratio = (left_iris_y - left_eye_top_y) / (left_eye_bottom_y - left_eye_top_y + 1e-6)
        
        # Apply sensitivity enhancement
        left_x_ratio = enhance_sensitivity(left_x_ratio)
        left_y_ratio = enhance_sensitivity(left_y_ratio)
        
        # Get right eye gaze with enhanced landmarks
        right_iris = landmarks[RIGHT_IRIS]
        right_eye_left_x = landmarks[362].x * image_w  # inner corner
        right_eye_right_x = landmarks[263].x * image_w  # outer corner
        right_iris_x = right_iris.x * image_w
        right_x_ratio = (right_iris_x - right_eye_left_x) / (right_eye_right_x - right_eye_left_x + 1e-6)
        
        right_eye_top_y = landmarks[374].y * image_h     # upper eyelid
        right_eye_bottom_y = landmarks[386].y * image_h  # lower eyelid
        right_iris_y = right_iris.y * image_h
        right_y_ratio = (right_iris_y - right_eye_top_y) / (right_eye_bottom_y - right_eye_top_y + 1e-6)
        
        # Apply sensitivity enhancement
        right_x_ratio = enhance_sensitivity(right_x_ratio)
        right_y_ratio = enhance_sensitivity(right_y_ratio)
        
        # Average both eyes
        avg_x = (left_x_ratio + right_x_ratio) / 2
        avg_y = (left_y_ratio + right_y_ratio) / 2
        
        # Final clamping
        avg_x = min(max(avg_x, 0.0), 1.0)
        avg_y = min(max(avg_y, 0.0), 1.0)

        return round(avg_x, 3), round(avg_y, 3)
    except Exception as e:
        print("Error:", e)
        return None, None

def enhance_sensitivity(ratio):
    """
    Enhance sensitivity of gaze detection by applying a sigmoid-like transformation
    that amplifies differences from the center (0.5)
    """
    # Center the ratio around 0
    centered = (ratio - 0.5) * 2
    
    # Apply enhanced sensitivity curve
    enhanced = np.tanh(centered * 1.5) * 0.5 + 0.5
    
    return enhanced

async def process_gaze(file: UploadFile):
    """Process uploaded image and return gaze coordinates"""
    image = read_image(file)
    if image is None:
        return JSONResponse(content={"error": "Invalid image"}, status_code=400)

    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = face_mesh.process(image_rgb)

    if not results.multi_face_landmarks:
        return JSONResponse(content={"error": "No face detected"}, status_code=400)

    h, w, _ = image.shape
    landmarks = results.multi_face_landmarks[0].landmark
    x, y = get_gaze_coordinates(landmarks, w, h)

    if x is None or y is None:
        return JSONResponse(content={"error": "Failed to compute gaze coordinates"}, status_code=500)

    return JSONResponse(content={"x": x, "y": y})