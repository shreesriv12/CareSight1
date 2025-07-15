"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Eye, Camera, Square, Circle, Triangle, Star, Heart, Diamond, Play, Pause, RotateCcw, Settings, Target, Zap } from 'lucide-react';

const LightweightGazeTracker = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [gazeData, setGazeData] = useState({ x: 0, y: 0 });
  const [showGazePoint, setShowGazePoint] = useState(true);
  const [cameraStatus, setCameraStatus] = useState('checking');
  const [faceDetected, setFaceDetected] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationPoints, setCalibrationPoints] = useState([]);
  const [debugInfo, setDebugInfo] = useState('');
  const [sensitivity, setSensitivity] = useState(1.0);
  const [performance, setPerformance] = useState({ fps: 0, latency: 0 });
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const gazeTimers = useRef({});
  const calibrationDataRef = useRef([]);
  const animationFrameRef = useRef(null);
  const streamRef = useRef(null);
  const lastFrameTime = useRef(0);
  const frameCount = useRef(0);
  const processingStartTime = useRef(0);
  
  const GAZE_THRESHOLD = 600; // Faster selection time
  const CALIBRATION_POINTS = [
    { x: 0.15, y: 0.15 }, { x: 0.5, y: 0.15 }, { x: 0.85, y: 0.15 },
    { x: 0.15, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.85, y: 0.5 },
    { x: 0.15, y: 0.85 }, { x: 0.5, y: 0.85 }, { x: 0.85, y: 0.85 }
  ];

  const options = [
    { id: 1, icon: Square, label: 'Square', color: 'bg-blue-500' },
    { id: 2, icon: Circle, label: 'Circle', color: 'bg-green-500' },
    { id: 3, icon: Triangle, label: 'Triangle', color: 'bg-red-500' },
    { id: 4, icon: Star, label: 'Star', color: 'bg-yellow-500' },
    { id: 5, icon: Heart, label: 'Heart', color: 'bg-pink-500' },
    { id: 6, icon: Diamond, label: 'Diamond', color: 'bg-purple-500' },
  ];

  // Performance monitoring
  useEffect(() => {
    const updatePerformance = () => {
      const now = Date.now();
      const elapsed = now - lastFrameTime.current;
      
      if (elapsed >= 1000) {
        const fps = Math.round((frameCount.current * 1000) / elapsed);
        setPerformance(prev => ({ ...prev, fps }));
        frameCount.current = 0;
        lastFrameTime.current = now;
      }
    };

    const interval = setInterval(updatePerformance, 100);
    return () => clearInterval(interval);
  }, []);

  const startCamera = async () => {
    try {
      setCameraStatus('requesting');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setCameraStatus('granted');
          setDebugInfo('Camera started - Lightweight tracking ready');
        };
      }
    } catch (error) {
      setCameraStatus('denied');
      setDebugInfo(`Camera error: ${error.message}`);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraStatus('stopped');
    setIsTracking(false);
    setFaceDetected(false);
  };

  const startTracking = async () => {
    if (cameraStatus !== 'granted') {
      await startCamera();
    }

    setIsTracking(true);
    setDebugInfo('Lightweight gaze tracking started');
    lastFrameTime.current = Date.now();
    frameCount.current = 0;
    processFrame();
  };

  const stopTracking = () => {
    setIsTracking(false);
    setFaceDetected(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setDebugInfo('Gaze tracking stopped');
  };

  const processFrame = () => {
    if (!isTracking || !videoRef.current || !canvasRef.current) return;

    processingStartTime.current = performance.now();
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0);
    
    // Simple face detection using geometric heuristics
    const faceRegion = detectFaceRegion(ctx, canvas.width, canvas.height);
    
    if (faceRegion) {
      setFaceDetected(true);
      
      // Fast eye detection
      const eyeData = detectEyes(ctx, faceRegion);
      
      if (eyeData) {
        const gazePoint = calculateGazeFromEyes(eyeData, faceRegion);
        
        if (gazePoint) {
          setGazeData(gazePoint);
          
          if (!isCalibrating) {
            checkGazeCollision(gazePoint.x, gazePoint.y);
          }
        }
        
        // Draw eye indicators
        drawEyeIndicators(ctx, eyeData);
      }
    } else {
      setFaceDetected(false);
    }
    
    // Update performance metrics
    const processingTime = performance.now() - processingStartTime.current;
    setPerformance(prev => ({ ...prev, latency: Math.round(processingTime) }));
    frameCount.current++;
    
    if (isTracking) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
  };

  const detectFaceRegion = (ctx, width, height) => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Simple skin color detection
      let minX = width, minY = height, maxX = 0, maxY = 0;
      let pixelCount = 0;
      
      for (let y = 0; y < height; y += 4) {
        for (let x = 0; x < width; x += 4) {
          const i = (y * width + x) * 4;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Simple skin color detection
          if (r > 95 && g > 40 && b > 20 && 
              r > g && r > b && 
              Math.abs(r - g) > 15 && 
              r - g > 15) {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
            pixelCount++;
          }
        }
      }
      
      // Check if we found enough skin pixels
      if (pixelCount > 500) {
        return {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          centerX: (minX + maxX) / 2,
          centerY: (minY + maxY) / 2
        };
      }
    } catch (error) {
      console.error('Face detection error:', error);
    }
    
    return null;
  };

  const detectEyes = (ctx, faceRegion) => {
    try {
      // Eye regions are typically in the upper third of the face
      const eyeRegionY = faceRegion.y + faceRegion.height * 0.2;
      const eyeRegionHeight = faceRegion.height * 0.3;
      
      const leftEyeX = faceRegion.x + faceRegion.width * 0.2;
      const rightEyeX = faceRegion.x + faceRegion.width * 0.6;
      const eyeWidth = faceRegion.width * 0.2;
      
      // Simple dark region detection for eyes
      const leftEye = findDarkRegion(ctx, leftEyeX, eyeRegionY, eyeWidth, eyeRegionHeight);
      const rightEye = findDarkRegion(ctx, rightEyeX, eyeRegionY, eyeWidth, eyeRegionHeight);
      
      if (leftEye && rightEye) {
        return {
          left: leftEye,
          right: rightEye,
          distance: Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
          )
        };
      }
    } catch (error) {
      console.error('Eye detection error:', error);
    }
    
    return null;
  };

  const findDarkRegion = (ctx, x, y, width, height) => {
    try {
      const imageData = ctx.getImageData(x, y, width, height);
      const data = imageData.data;
      
      let darkestX = x + width / 2;
      let darkestY = y + height / 2;
      let darkestValue = 255;
      
      for (let dy = 0; dy < height; dy += 2) {
        for (let dx = 0; dx < width; dx += 2) {
          const i = (dy * width + dx) * 4;
          const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          if (brightness < darkestValue) {
            darkestValue = brightness;
            darkestX = x + dx;
            darkestY = y + dy;
          }
        }
      }
      
      return {
        x: darkestX,
        y: darkestY,
        brightness: darkestValue
      };
    } catch (error) {
      return null;
    }
  };

  const calculateGazeFromEyes = (eyeData, faceRegion) => {
    try {
      const eyeCenterX = (eyeData.left.x + eyeData.right.x) / 2;
      const eyeCenterY = (eyeData.left.y + eyeData.right.y) / 2;
      
      // Calculate gaze direction based on eye position relative to face center
      const faceOffsetX = (eyeCenterX - faceRegion.centerX) / faceRegion.width;
      const faceOffsetY = (eyeCenterY - faceRegion.centerY) / faceRegion.height;
      
      // Map to screen coordinates with sensitivity adjustment
      const screenX = (0.5 + faceOffsetX * sensitivity) * window.innerWidth;
      const screenY = (0.5 + faceOffsetY * sensitivity) * window.innerHeight;
      
      return {
        x: Math.max(0, Math.min(window.innerWidth, screenX)),
        y: Math.max(0, Math.min(window.innerHeight, screenY))
      };
    } catch (error) {
      console.error('Gaze calculation error:', error);
      return null;
    }
  };

  const drawEyeIndicators = (ctx, eyeData) => {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    // Draw eye points
    ctx.beginPath();
    ctx.arc(eyeData.left.x, eyeData.left.y, 3, 0, 2 * Math.PI);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(eyeData.right.x, eyeData.right.y, 3, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw connection line
    ctx.beginPath();
    ctx.moveTo(eyeData.left.x, eyeData.left.y);
    ctx.lineTo(eyeData.right.x, eyeData.right.y);
    ctx.stroke();
  };

  const checkGazeCollision = (x, y) => {
    options.forEach(option => {
      const element = document.getElementById(`option-${option.id}`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const margin = 30; // Larger margin for easier selection
        
        const isInside = x >= (rect.left - margin) && 
                        x <= (rect.right + margin) && 
                        y >= (rect.top - margin) && 
                        y <= (rect.bottom + margin);
        
        if (isInside) {
          if (!gazeTimers.current[option.id]) {
            gazeTimers.current[option.id] = setTimeout(() => {
              setSelectedOption(option);
              setDebugInfo(`Selected: ${option.label}`);
              clearAllTimers();
            }, GAZE_THRESHOLD);
          }
        } else {
          if (gazeTimers.current[option.id]) {
            clearTimeout(gazeTimers.current[option.id]);
            delete gazeTimers.current[option.id];
          }
        }
      }
    });
  };

  const clearAllTimers = () => {
    Object.values(gazeTimers.current).forEach(timer => clearTimeout(timer));
    gazeTimers.current = {};
  };

  const startCalibration = () => {
    setIsCalibrating(true);
    setCalibrationPoints([]);
    calibrationDataRef.current = [];
    
    let currentPoint = 0;
    
    const showNextPoint = () => {
      if (currentPoint < CALIBRATION_POINTS.length) {
        setCalibrationPoints([CALIBRATION_POINTS[currentPoint]]);
        
        setTimeout(() => {
          calibrationDataRef.current.push({
            screen: CALIBRATION_POINTS[currentPoint],
            gaze: gazeData
          });
          
          currentPoint++;
          showNextPoint();
        }, 1500);
      } else {
        setIsCalibrating(false);
        setCalibrationPoints([]);
        setDebugInfo('Calibration completed');
      }
    };
    
    showNextPoint();
  };

  const resetSelection = () => {
    setSelectedOption(null);
    clearAllTimers();
    setDebugInfo('Selection reset');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'granted': return 'text-green-400';
      case 'denied': case 'stopped': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusDot = (status) => {
    switch (status) {
      case 'granted': return 'bg-green-500';
      case 'denied': case 'stopped': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Zap className="text-yellow-400" size={40} />
            Lightweight Gaze Tracker
          </h1>
          <p className="text-gray-300 text-lg mb-2">
            🔥 Ultra-fast geometric eye tracking (~{performance.fps} FPS)
          </p>
          <div className="flex justify-center gap-4 text-sm text-gray-400">
            <span>✅ Works Offline</span>
            <span>⚡ {performance.latency}ms latency</span>
            <span>🎯 No ML Models</span>
          </div>
        </div>

        {/* Performance Dashboard */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{performance.fps}</div>
              <div className="text-xs text-gray-400">FPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{performance.latency}ms</div>
              <div className="text-xs text-gray-400">Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{sensitivity.toFixed(1)}x</div>
              <div className="text-xs text-gray-400">Sensitivity</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">
                {faceDetected ? '✅' : '❌'}
              </div>
              <div className="text-xs text-gray-400">Face Detected</div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center gap-2 p-3 bg-black/20 rounded-lg">
              <Camera size={20} className="text-blue-400" />
              <span className="text-white">Camera:</span>
              <span className={`text-sm ${getStatusColor(cameraStatus)}`}>
                {cameraStatus.charAt(0).toUpperCase() + cameraStatus.slice(1)}
              </span>
              <div className={`w-3 h-3 rounded-full ${getStatusDot(cameraStatus)}`} />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-black/20 rounded-lg">
              <Eye size={20} className="text-green-400" />
              <span className="text-white">Eyes:</span>
              <span className={`text-sm ${faceDetected ? 'text-green-400' : 'text-red-400'}`}>
                {faceDetected ? 'Detected' : 'Searching...'}
              </span>
              <div className={`w-3 h-3 rounded-full ${faceDetected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-black/20 rounded-lg">
              <Zap size={20} className="text-yellow-400" />
              <span className="text-white">Tracking:</span>
              <span className={`text-sm ${isTracking ? 'text-green-400' : 'text-gray-400'}`}>
                {isTracking ? 'Active' : 'Inactive'}
              </span>
              <div className={`w-3 h-3 rounded-full ${isTracking ? 'bg-green-500' : 'bg-gray-500'}`} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mb-4">
            <button
              onClick={isTracking ? stopTracking : startTracking}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                isTracking 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isTracking ? <Pause size={16} /> : <Play size={16} />}
              {isTracking ? 'Stop' : 'Start'} Tracking
            </button>
            
            <button
              onClick={startCalibration}
              disabled={!isTracking || isCalibrating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Target size={16} />
              {isCalibrating ? 'Calibrating...' : 'Quick Calibrate'}
            </button>
            
            <button
              onClick={() => setShowGazePoint(!showGazePoint)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {showGazePoint ? 'Hide' : 'Show'} Gaze Point
            </button>
            
            <button
              onClick={resetSelection}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RotateCcw size={16} className="inline mr-2" />
              Reset
            </button>
          </div>

          <div className="flex items-center gap-4 justify-center">
            <label className="text-white text-sm flex items-center gap-2">
              <Settings size={16} />
              Sensitivity:
              <input
                type="range"
                min="0.3"
                max="2.0"
                step="0.1"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                className="w-32"
              />
              <span className="text-yellow-400 min-w-[3rem]">{sensitivity.toFixed(1)}x</span>
            </label>
          </div>

          {debugInfo && (
            <div className="mt-4 p-3 bg-black/40 rounded-lg text-green-400 text-sm text-center">
              {debugInfo}
            </div>
          )}
        </div>

        {/* Video Feed */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <video
              ref={videoRef}
              className="w-80 h-60 bg-black rounded-lg border-2 border-gray-600"
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-80 h-60 pointer-events-none rounded-lg"
              style={{ opacity: 0.8 }}
            />
            <div className="absolute bottom-2 left-2 bg-black/80 rounded px-2 py-1 text-xs text-white">
              {performance.fps} FPS • {performance.latency}ms
            </div>
          </div>
        </div>

        {/* Selection Options */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          {options.map((option) => {
            const IconComponent = option.icon;
            return (
              <div
                key={option.id}
                id={`option-${option.id}`}
                className={`
                  relative bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center
                  cursor-pointer transition-all duration-300 hover:scale-105
                  ${selectedOption?.id === option.id ? 'ring-4 ring-yellow-400 bg-white/20' : ''}
                `}
              >
                <div className={`w-16 h-16 ${option.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                  <IconComponent size={32} className="text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{option.label}</h3>
                <p className="text-gray-300 text-sm">Look here to select</p>
              </div>
            );
          })}
        </div>

        {/* Selected Option Display */}
        {selectedOption && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-6 text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-3">⚡ Fast Selection!</h2>
            <div className="flex items-center justify-center gap-4">
              <div className={`w-12 h-12 ${selectedOption.color} rounded-full flex items-center justify-center`}>
                <selectedOption.icon size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-black">{selectedOption.label}</span>
            </div>
          </div>
        )}

        {/* Calibration Points */}
        {calibrationPoints.map((point, index) => (
          <div
            key={index}
            className="fixed w-12 h-12 border-4 border-yellow-400 bg-yellow-400/20 rounded-full pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 animate-pulse flex items-center justify-center"
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`
            }}
          >
            <Target size={24} className="text-yellow-400" />
          </div>
        ))}

        {/* Gaze Point Indicator */}
        {showGazePoint && isTracking && faceDetected && (
          <div
            className="fixed w-4 h-4 bg-yellow-400 rounded-full pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 opacity-80 border-2 border-yellow-300 animate-pulse"
            style={{
              left: gazeData.x,
              top: gazeData.y
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LightweightGazeTracker;