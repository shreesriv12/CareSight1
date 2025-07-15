"use client";

import { useState, useRef, useCallback, useEffect } from 'react';

export default function EmotionPage() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [autoCapture, setAutoCapture] = useState(true);
  const [lastCaptureTime, setLastCaptureTime] = useState(0);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const faceDetectionRef = useRef(null);

  // Face detection using canvas analysis
  const detectFace = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isStreaming) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for basic face detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple face detection based on skin color detection
    let skinPixels = 0;
    const totalPixels = data.length / 4;
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Basic skin color detection
      if (r > 95 && g > 40 && b > 20 && 
          Math.max(r, g, b) - Math.min(r, g, b) > 15 && 
          Math.abs(r - g) > 15 && r > g && r > b) {
        skinPixels++;
      }
    }

    const skinPercentage = (skinPixels / totalPixels) * 100;
    const faceDetected = skinPercentage > 2;

    setFaceDetected(faceDetected);

    // Auto capture if face is detected and auto capture is enabled
    if (faceDetected && autoCapture && !loading) {
      const now = Date.now();
      if (now - lastCaptureTime > 3000) {
        setLastCaptureTime(now);
        capturePhoto();
      }
    }
  }, [isStreaming, autoCapture, loading, lastCaptureTime]);

  // Face detection loop
  useEffect(() => {
    if (isStreaming && autoCapture) {
      faceDetectionRef.current = setInterval(detectFace, 100);
    } else {
      if (faceDetectionRef.current) {
        clearInterval(faceDetectionRef.current);
      }
    }

    return () => {
      if (faceDetectionRef.current) {
        clearInterval(faceDetectionRef.current);
      }
    };
  }, [isStreaming, autoCapture, detectFace]);

  // Cleanup stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (faceDetectionRef.current) {
        clearInterval(faceDetectionRef.current);
      }
    };
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      setError(null);
      setCameraError(null);
      
      // Guard clause: ensure video ref exists
      if (!videoRef.current) {
        setCameraError('Video element not ready. Please try again.');
        return;
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user' 
        } 
      });
      
      videoRef.current.srcObject = stream;
      streamRef.current = stream;
      
      // Wait for video to be ready
      videoRef.current.onloadedmetadata = () => {
        setIsStreaming(true);
        
        // Force video to play
        videoRef.current.play().catch(e => {
          console.error('Video play error:', e);
        });
      };
      
    } catch (err) {
      console.error('Camera error:', err);
      
      let errorMessage = 'Error accessing camera: ' + err.message;
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera found. Please ensure a camera is connected.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera constraints cannot be satisfied.';
      }
      
      setCameraError(errorMessage);
    }
  }, []);

  // Stop camera stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsStreaming(false);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setFaceDetected(false);
  }, []);

  // Capture photo from video stream
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas (flip horizontally for selfie effect)
    context.scale(-1, 1);
    context.drawImage(video, -canvas.width, 0);
    context.scale(-1, 1);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (blob) {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage(imageUrl);
        
        // Send to backend for emotion detection
        await analyzeEmotion(blob);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  // Send image to backend for emotion analysis
  const analyzeEmotion = async (imageBlob) => {
    setLoading(true);
    setError(null);
    setPrediction(null);

    try {
      const formData = new FormData();
      formData.append('file', imageBlob, 'capture.jpg');

      const response = await fetch('http://localhost:8000/detect-emotion', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setPrediction(result);
      
      // Add to history
      const historyItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        emotion: result.predicted_emotion,
        confidence: result.confidence,
        imageUrl: capturedImage || URL.createObjectURL(imageBlob)
      };
      setAnalysisHistory(prev => [historyItem, ...prev.slice(0, 4)]);
      
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Error analyzing emotion. Please ensure the backend server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.');
      return;
    }

    // Display the uploaded image
    const imageUrl = URL.createObjectURL(file);
    setCapturedImage(imageUrl);

    // Send to backend for analysis
    await analyzeEmotion(file);
  };

  // Clear results
  const clearResults = () => {
    setCapturedImage(null);
    setPrediction(null);
    setError(null);
  };

  // Get emotion emoji
  const getEmotionEmoji = (emotion) => {
    const emojiMap = {
      happy: '😊',
      sad: '😢',
      angry: '😠',
      fear: '😨',
      surprise: '😮',
      disgust: '🤢',
      neutral: '😐'
    };
    return emojiMap[emotion?.toLowerCase()] || '😐';
  };

  // Get confidence color
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            🎭 Auto Emotion Detection
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Automatic emotion analysis when face is detected
          </p>
        </div>

        {/* Video Stream Status */}
        <div className="text-center mb-4">
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
            isStreaming 
              ? 'bg-green-500/90 text-white' 
              : 'bg-gray-500/90 text-white'
          }`}>
            {isStreaming ? '🎥 Camera Active' : '📷 Camera Inactive'}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center mb-8">
          {!isStreaming ? (
            <button 
              onClick={startCamera} 
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg flex items-center gap-2 hover:scale-105"
            >
              📹 Start Camera
            </button>
          ) : (
            <div className="flex gap-4 items-center">
              <button 
                onClick={capturePhoto} 
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg flex items-center gap-2 hover:scale-105"
              >
                📸 Manual Capture
              </button>
              <button 
                onClick={stopCamera} 
                className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg flex items-center gap-2 hover:scale-105"
              >
                🛑 Stop Camera
              </button>
              <label className="flex items-center gap-2 text-white font-medium">
                <input 
                  type="checkbox" 
                  checked={autoCapture} 
                  onChange={(e) => setAutoCapture(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                🤖 Auto Capture
              </label>
            </div>
          )}
        </div>

        {/* Face Detection Status */}
        {isStreaming && (
          <div className="text-center mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium ${
              faceDetected 
                ? 'bg-green-500/90 text-white' 
                : 'bg-red-500/90 text-white'
            }`}>
              {faceDetected ? '✅ Face Detected' : '❌ No Face Detected'}
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="text-center mb-8">
          <label className="block text-white text-lg mb-3 font-medium">
            📤 Or upload an image:
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="bg-white/90 backdrop-blur-sm border-2 border-white/20 rounded-lg px-4 py-2 cursor-pointer hover:bg-white transition-all duration-200 hover:scale-105"
          />
        </div>

        {/* Camera Error Display */}
        {cameraError && (
          <div className="bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg mb-8 text-center max-w-2xl mx-auto shadow-lg">
            <p className="font-medium">📹 {cameraError}</p>
          </div>
        )}

        {/* Media Container */}
        <div className="flex flex-col items-center gap-8 mb-8">
          {/* Video Stream */}
          <div className={`relative border-4 border-white/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm ${
            !isStreaming ? 'hidden' : ''
          }`}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full max-w-2xl h-auto object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              🔴 LIVE
            </div>
            {faceDetected && (
              <div className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                👤 FACE DETECTED
              </div>
            )}
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-lg font-medium">
                  🔍 Analyzing...
                </div>
              </div>
            )}
          </div>

          {/* Captured Image */}
          {capturedImage && (
            <div className="text-center">
              <h3 className="text-white text-xl font-semibold mb-4">📷 Last Captured Image</h3>
              <img 
                src={capturedImage} 
                alt="Captured" 
                className="max-w-md max-h-80 border-4 border-white/20 rounded-2xl shadow-2xl object-cover backdrop-blur-sm"
              />
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center text-white mb-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mb-4"></div>
            <p className="text-lg font-medium">🔍 Analyzing emotion...</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/90 backdrop-blur-sm text-white p-4 rounded-lg mb-8 text-center max-w-2xl mx-auto shadow-lg">
            <p className="font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Prediction Results */}
        {prediction && (
          <div className="bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl max-w-2xl mx-auto mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🎯 Emotion Analysis Results
            </h3>
            
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">
                {getEmotionEmoji(prediction.predicted_emotion)}
              </div>
              <h4 className="text-2xl font-semibold text-gray-700 mb-2">
                <span className="text-blue-600 capitalize">
                  {prediction.predicted_emotion}
                </span>
              </h4>
              <p className="text-gray-600 text-lg">
                Confidence: <span className={`font-bold ${getConfidenceColor(prediction.confidence)}`}>
                  {(prediction.confidence * 100).toFixed(1)}%
                </span>
              </p>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-4">📊 All Probabilities:</h4>
              <div className="space-y-3">
                {Object.entries(prediction.all_probabilities)
                  .sort(([,a], [,b]) => b - a)
                  .map(([emotion, prob]) => (
                  <div key={emotion} className="flex items-center gap-4">
                    <span className="text-2xl">{getEmotionEmoji(emotion)}</span>
                    <span className="font-medium text-gray-700 capitalize min-w-20">
                      {emotion}:
                    </span>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
                        style={{ width: `${prob * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gray-600 min-w-12 text-right">
                      {(prob * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Analysis History */}
        {analysisHistory.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto mb-8">
            <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">
              📚 Recent Analysis History
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {analysisHistory.map((item) => (
                <div key={item.id} className="bg-white/80 p-4 rounded-lg shadow-md">
                  <div className="text-center mb-2">
                    <div className="text-3xl mb-1">{getEmotionEmoji(item.emotion)}</div>
                    <div className="font-semibold text-gray-700 capitalize">{item.emotion}</div>
                    <div className={`text-sm font-medium ${getConfidenceColor(item.confidence)}`}>
                      {(item.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {item.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clear Results Button */}
        {(capturedImage || prediction) && (
          <div className="text-center">
            <button 
              onClick={clearResults} 
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-all duration-200 text-lg flex items-center gap-2 mx-auto hover:scale-105"
            >
              🗑️ Clear Results
            </button>
          </div>
        )}

        {/* Hidden canvas for image capture and face detection */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}