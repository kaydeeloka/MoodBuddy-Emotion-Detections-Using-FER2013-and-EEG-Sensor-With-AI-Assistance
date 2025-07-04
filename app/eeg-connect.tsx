import { getApiUrl } from '@/config/local';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
const bandDescriptions = {
  theta: "Drowsiness, meditation",
  alpha: "Relaxation, creativity", 
  lowbeta: "Focus, alertness",
  highbeta: "Anxiety, engagement",
  gamma: "Information processing"
};

interface EEGBandData {
  band: string;
  percentage: number;
  description: string;
}

export default function EEGBandPowerVisualization() {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [averagedData, setAveragedData] = useState<EEGBandData[]>([]);
  const [connectLoading, setConnectLoading] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  // Connect Button Function
  const handleConnect = async () => {
    setStatus('Connecting...');
    setConnectLoading(true);
    
    try {
      const response = await fetch(getApiUrl('/eeg/connect'), { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.status === "connection started") {
        setStatus('Connection started. Please wait a few seconds.');
        setConnected(true);
      } else {
        setStatus('Unexpected response: ' + JSON.stringify(data));
      }
    } catch (error) {
      setStatus('Failed to connect: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setConnectLoading(false);
    }
  };

  // Start Analysis Function
  const handleStartAnalysis = async () => {
    setStatus('Starting EEG data collection...');
    setAnalyzing(true);
    setConnected(false);
    setCountdown(10);
    setAnalysisComplete(false);

    try {
      // Start data collection
      await fetch(getApiUrl('/eeg/start-collection'), { method: 'POST' });
      
      const collectedData: EEGBandData[][] = [];
      const duration = 10;
      let remaining = duration;

      // Countdown timer
      const timer = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) clearInterval(timer);
      }, 1000);

      // Collect data every second
      for (let i = 0; i < duration; i++) {
        try {
          const response = await fetch(getApiUrl('/eeg/bandpower'));
          if (response.ok) {
            const data = await response.json();
            collectedData.push(data);
          } else {
            console.warn("Non-OK response at step", i);
          }
        } catch (error) {
          console.warn("Fetch failed at step", i, error);
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Stop data collection after 10 seconds
      await fetch(getApiUrl('/eeg/stop-collection'), { method: 'POST' });
      console.log('EEG data collection stopped');

      clearInterval(timer);
      setCountdown(0);
      setStatus('EEG analysis complete! Ready for facial scan.');
      
      // Calculate and store data but don't display it
      const averaged = calculateAverages(collectedData);
      setAveragedData(averaged);
      setAnalysisComplete(true);
      
      setAnalyzing(false);
      setConnected(true);
      
    } catch (error) {
      console.error('Analysis error:', error);
      await fetch(getApiUrl('/eeg/stop-collection'), { method: 'POST' });
      setStatus('Analysis failed. Please try again.');
      setAnalyzing(false);
      setConnected(true);
    }
  };

  // Calculate averages function (keep for data processing)
  const calculateAverages = (dataList: EEGBandData[][]): EEGBandData[] => {
    const bandSums: { [key: string]: number } = {};
    const bandCounts: { [key: string]: number } = {};

    for (const snapshot of dataList) {
      for (const entry of snapshot) {
        const band = entry.band;
        const value = entry.percentage;
        bandSums[band] = (bandSums[band] || 0) + value;
        bandCounts[band] = (bandCounts[band] || 0) + 1;
      }
    }

    const averaged: EEGBandData[] = [];
    for (const band in bandSums) {
      averaged.push({
        band: band,
        percentage: +(bandSums[band] / bandCounts[band]).toFixed(2),
        description: bandDescriptions[band as keyof typeof bandDescriptions] || "No description"
      });
    }

    return averaged;
  };

  const proceedToFacialScan = () => {
    if (averagedData.length === 0) {
      Alert.alert('No Data', 'Please complete EEG analysis first');
      return;
    }

    const dominantBand = averagedData.reduce((max, current) => 
      current.percentage > max.percentage ? current : max
    );

    // Navigate to facial prediction with EEG data
    router.push({
      pathname: './scan-face',
      params: {
        eegData: JSON.stringify({
          dominant_band: dominantBand.band,
          band_powers: averagedData,
          analysis_timestamp: new Date().toISOString(),
          eeg_completed: 'true'
        })
      }
    });
  };

  const saveEEGResultToStorage = async (averagedData: EEGBandData[]) => {
  try {
    const dominantBand = averagedData.reduce((max, current) => 
      current.percentage > max.percentage ? current : max
    );
    
    const eegResult = {
      dominant_band: dominantBand.band,
      band_powers: averagedData.map(item => ({
        band: item.band,
        percentage: item.percentage / 100, // Convert to decimal for scan-result
        description: item.description
      })),
      analysis_timestamp: new Date().toISOString(),
      eeg_completed: true
    };
    
    await AsyncStorage.setItem('eeg_connect_result', JSON.stringify(eegResult));
    console.log('EEG result saved to AsyncStorage:', eegResult);
  } catch (error) {
    console.error('Error saving EEG result to AsyncStorage:', error);
  }
};

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
    
        {/* Control Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.button,
              styles.connectButton,
              (connected || connectLoading) && styles.disabledButton
            ]} 
            onPress={handleConnect} 
            disabled={connected || analyzing || connectLoading}
            activeOpacity={0.7}
          >
            {connectLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {connected ? 'Device Connected' : 'Connect EEG Device'}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.button,
              styles.analysisButton,
              (!connected || analyzing) && styles.disabledButton
            ]} 
            onPress={handleStartAnalysis} 
            disabled={!connected || analyzing}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {analyzing ? 'Analyzing...' : 'Start 15s Analysis'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Status Display */}
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
        
        {/* Countdown Display */}
        {countdown > 0 && (
          <View style={styles.countdownContainer}>
            <ActivityIndicator size="small" color="#E74C3C" />
            <Text style={styles.countdownText}>
              Time remaining: {countdown}s
            </Text>
          </View>
        )}

        {/* Analysis Complete - Show Facial Scan Button */}
        {analysisComplete && (
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>
              ✅ EEG Analysis Complete
            </Text>
            <Text style={styles.completionText}>
              Brain wave data has been collected and saved. Ready to proceed with facial emotion scanning.
            </Text>
            
            <TouchableOpacity 
              style={[styles.button, styles.proceedButton]}
              onPress={proceedToFacialScan}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>
                Continue to Facial Scan
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    textAlign: 'center',
  },
  buttonContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginTop:50,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    minHeight: 50,
  },
  connectButton: {
    backgroundColor: '#e88f8f', 
  },
  analysisButton: {
    backgroundColor: '#e88f8f',
  },
  proceedButton: {
    backgroundColor: '#8d0140',
    marginTop: 16,
    marginBottom: 0,
  },
  disabledButton: {
    backgroundColor: '#BDC3C7',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  statusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
  },
  statusText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#2C3E50',
    lineHeight: 24,
  },
  countdownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  countdownText: {
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#E74C3C',
    fontSize: 16,
  },
  completionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#D5EDDA',
  },
  completionTitle: {
    color: '#28A745',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  completionText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    color: '#2C3E50',
    marginBottom: 16,
  },
});
