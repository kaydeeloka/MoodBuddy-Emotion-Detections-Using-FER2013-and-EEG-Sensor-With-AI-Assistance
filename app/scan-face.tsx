import { API_ENDPOINTS, getApiUrl } from '@/config/local';
import { Ionicons } from '@expo/vector-icons';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FaceDetectionResult = {
  faces: { [key: string]: any }[];
};

export default function FaceScanScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [eegData, setEegData] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('front');
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const cameraRef = useRef<any>(null);

  // Fixed: Parse EEG data only when params.eegData changes
  useEffect(() => {
    if (params.eegData && typeof params.eegData === 'string') {
      try {
        const parsedEegData = JSON.parse(params.eegData);
        setEegData(parsedEegData);
        console.log('Received EEG data in facial scan:', parsedEegData);
      } catch (error) {
        console.error('Error parsing EEG data:', error);
        setEegData(null);
      }
    } else {
      setEegData(null);
    }
  }, [params.eegData]); // Only depend on eegData

  // Fixed: Request permission only once
  useEffect(() => {
    if (permission !== null && !permission.granted) {
      requestPermission();
    }
  }, [permission?.granted]); // Only when permission status changes

  // Fixed: Progress interval with proper cleanup
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isScanning) {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress((prevProgress) => {
          if (prevProgress >= 100) {
            return 100;
          }
          return prevProgress + 10;
        });
      }, 500);
    } else {
      setScanProgress(0);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isScanning]); // Only depend on isScanning

  // Fixed: Use useCallback to prevent recreation
  const predictEmotion = useCallback(async () => {
    if (!cameraRef.current) {
      Alert.alert('Camera Error', 'Camera is not ready. Please try again.');
      return;
    }

    if (isScanning) {
      return; // Prevent multiple simultaneous scans
    }

    try {
      console.log('Taking picture...');
      setIsScanning(true);
      setScanProgress(0);
      
      const photo = await cameraRef.current.takePictureAsync({ 
        base64: true,
        quality: 0.8,
        skipProcessing: true // Add this for better performance
      });
      
      console.log('Picture taken, sending to server...');

      const response = await fetch(getApiUrl(API_ENDPOINTS.FACE_ANALYSIS), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: photo.base64 }),
      });

      console.log('Response received, status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Response JSON:', data);

      const mood = data.prediction;

      if (!mood) {
        Alert.alert('Detection Failed', 'No emotion detected. Please ensure your face is clearly visible and try again.');
        return;
      }

      console.log('Navigating to scan-result with:', {
        mood,
        hasEegData: !!eegData
      });

      // Navigate to scan-result with both facial and EEG data
      router.push({
        pathname: '/scan-result',
        params: {
          mood: mood,
          eegData: params.eegData || null,
          facialCompleted: 'true',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Prediction failed:', error);
      
      let errorMessage = 'An unexpected error occurred during emotion detection.';
      
      if (error instanceof Error) {
        if (error.message.includes('Network')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('Server error')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Prediction Error', errorMessage);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  }, [isScanning, eegData, params.eegData, router]); // Add dependencies

  // Fixed: Memoize EEG status component
  const renderEEGStatus = useCallback(() => {
    if (eegData) {
      return (
        <View style={styles.eegStatusContainer}>
          <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
          <Text style={styles.eegStatusText}>EEG data ready</Text>
        </View>
      );
    }
    return (
      <View style={styles.eegStatusContainer}>
        <Ionicons name="information-circle" size={16} color="#FF9800" />
        <Text style={styles.eegStatusText}>No EEG data</Text>
      </View>
    );
  }, [eegData]); // Only re-render when eegData changes

  // Fixed: Memoize permission request handler
  const handlePermissionRequest = useCallback(() => {
    requestPermission();
  }, [requestPermission]);

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
        />
      ) : (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission is required.</Text>
          <TouchableOpacity 
            style={styles.permissionButton} 
            onPress={handlePermissionRequest}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* EEG Status Indicator */}
      <View style={styles.topOverlay}>
        {renderEEGStatus()}
      </View>

      <View style={styles.overlay}>
        {isScanning ? (
          <View style={styles.scanningContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.progressText}>Analyzing emotion... {scanProgress}%</Text>
            <Text style={styles.subProgressText}>Please keep your face in view</Text>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Text style={styles.instructionText}>
              Position your face in the camera and tap to scan
            </Text>
            <TouchableOpacity 
              style={styles.button} 
              onPress={predictEmotion}
              disabled={isScanning}
            >
              <Ionicons name="scan" size={20} color="#fff" />
              <Text style={styles.buttonText}>Scan Your Emotion</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#e88f8f',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 1,
  },
  eegStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  eegStatusText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 30,
    borderRadius: 20,
  },
  progressText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '600',
  },
  subProgressText: {
    color: '#ccc',
    marginTop: 5,
    fontSize: 12,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  button: {
    backgroundColor: '#e88f8f',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
