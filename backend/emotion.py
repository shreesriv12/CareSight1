# emotion.py
import cv2
import numpy as np
from fastapi import UploadFile
from fastapi.responses import JSONResponse
from tensorflow.keras.models import load_model

# Load model once at module level with compatibility fix
try:
    model = load_model("emotion_model.h5", compile=False)
    print("Model loaded successfully without compilation")
except Exception as e:
    print(f"Error loading model: {e}")
    # If the above fails, try with custom objects
    from tensorflow.keras.optimizers import Adam
    model = load_model("emotion_model.h5", 
                      custom_objects={'Adam': Adam}, 
                      compile=False)
    print("Model loaded with custom objects")

emotion_labels = ['angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral']

# Load face cascade for face detection
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

def preprocess_image(image: np.ndarray, target_size=(64, 64)) -> np.ndarray:
    """
    Preprocess image for emotion prediction
    Args:
        image: Input image (BGR format)
        target_size: Target size for the model (width, height)
    Returns:
        Preprocessed image ready for model prediction
    """
    # Convert to grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Detect faces
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    
    if len(faces) == 0:
        # If no face detected, use the entire image
        face_roi = gray
    else:
        # Use the first detected face
        x, y, w, h = faces[0]
        face_roi = gray[y:y+h, x:x+w]
    
    # Resize to target size
    face_resized = cv2.resize(face_roi, target_size)
    
    # Normalize pixel values
    face_normalized = face_resized.astype("float32") / 255.0
    
    # Reshape for model input
    face_final = face_normalized.reshape(1, target_size[0], target_size[1], 1)
    
    return face_final

def predict_emotion(image: np.ndarray) -> dict:
    """
    Predict emotion from image
    Args:
        image: Input image (BGR format)
    Returns:
        Dictionary containing predicted emotion and confidence scores
    """
    # Model expects 64x64 input based on the error message
    target_size = (64, 64)
    
    processed_image = preprocess_image(image, target_size)
    
    # Make prediction
    prediction = model.predict(processed_image, verbose=0)
    
    # Get class probabilities
    class_probabilities = prediction[0]
    
    # Get predicted class
    predicted_class = np.argmax(class_probabilities)
    predicted_emotion = emotion_labels[predicted_class]
    confidence = float(class_probabilities[predicted_class])
    
    # Create result dictionary with all probabilities
    result = {
        "predicted_emotion": predicted_emotion,
        "confidence": confidence,
        "all_probabilities": {
            emotion_labels[i]: float(class_probabilities[i]) 
            for i in range(len(emotion_labels))
        }
    }
    
    return result

def read_image(file: UploadFile) -> np.ndarray:
    """Read image from uploaded file"""
    contents = file.file.read()
    np_arr = np.frombuffer(contents, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return image

async def process_emotion(file: UploadFile):
    """Process uploaded image and return emotion prediction"""
    try:
        image = read_image(file)
        
        if image is None:
            return JSONResponse(
                content={"error": "Could not decode image"}, 
                status_code=400
            )
        
        result = predict_emotion(image)
        return JSONResponse(content=result)
        
    except Exception as e:
        return JSONResponse(
            content={"error": f"Error processing image: {str(e)}"}, 
            status_code=500
        )

# Debug function to check model input shape
def check_model_info():
    """Print model information for debugging"""
    print(f"Model input shape: {model.input_shape}")
    print(f"Model output shape: {model.output_shape}")
    print(f"Expected emotion labels: {emotion_labels}")

# Call this once to verify your model configuration
# check_model_info()