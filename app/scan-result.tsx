import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CalendarDays, Home, MessageSquare } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiUrl } from '../config/local';
import { UserStorage } from '../constants/userStorage';

const { width } = Dimensions.get('window');

type BandPower = {
  band: string;
  percentage: number;
  description?: string;
};

type EegAnalysisData = {
  band_powers: BandPower[];
  dominant_band: string;
  analysis_timestamp: string;
};

type EEGData = {
  alpha: number;
  beta: number;
  theta: number;
  delta: number;
  gamma: number;
};

interface User {
  username: string;
  email: string;
  full_name: string;
}

// --- EEG Band Emotional State, Color, and Description Mappings ---
const bandEmotionalStates = {
  Alpha: 'Peaceful Contentment',
  Beta: 'Mental Agitation',
  Theta: 'Emotional Vulnerability',
  Delta: 'Subconscious Processing',
  Gamma: 'Intense Processing',
};

const eegBandColors = {
  Alpha: '#27AE60',
  Beta: '#F39C12',
  Theta: '#8E44AD',
  Delta: '#2D1B69',
  Gamma: '#E74C3C',
};

// Normalize band name (e.g., "alpha" -> "Alpha")
const normalizeBand = (band: string) =>
  band.charAt(0).toUpperCase() + band.slice(1).toLowerCase();

export default function ScanResultsScreen() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [eegAnalysisData, setEegAnalysisData] = useState<EegAnalysisData | null>(null);
  const [facialEmotion, setFacialEmotion] = useState('');
  const [eegData, setEegData] = useState<EEGData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [moodSaved, setMoodSaved] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  // Get detected mood from params
  const detectedMood = typeof params.mood === 'string' ? params.mood.toLowerCase() : 'happy';

  // Today's date formatting
  const today = new Date();
  const formattedDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  // Load user data once
  useEffect(() => {
    loadUserData();
  }, []);

  // Set facial emotion when mood param changes
  useEffect(() => {
    setFacialEmotion(detectedMood);
  }, [detectedMood]);

  // Parse EEG data when available
  useEffect(() => {
    if (params.eegData && typeof params.eegData === 'string') {
      try {
        const parsedEegData = JSON.parse(params.eegData);
        setEegAnalysisData(parsedEegData);
        console.log('EEG data in scan-result:', parsedEegData);
      } catch (error) {
        console.error('Error parsing EEG data in scan-result:', error);
        setEegAnalysisData(null);
      }
    } else {
      setEegAnalysisData(null);
    }
  }, [params.eegData]);

  // Perform analysis when all data is ready
  useEffect(() => {
    if (user && facialEmotion && !analysisResult) {
      performMoodAnalysis();
    }
  }, [user, facialEmotion, eegAnalysisData]);

  const loadUserData = async () => {
    try {
      const userData = await UserStorage.getUser();
      if (userData) {
        setUser({
          username: userData.username || userData.email || 'unknown',
          email: userData.email || '',
          full_name: userData.full_name || userData.username || 'User'
        });
      } else {
        Alert.alert('Error', 'Please login to save mood data');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const performMoodAnalysis = useCallback(async () => {
    if (loading && analysisResult) return; // Prevent multiple calls

    try {
      setLoading(true);
      
      // Try to get EEG result from AsyncStorage (set by eeg-connect page)
      let eegConnectResult = null;
      try {
        const storedResult = await AsyncStorage.getItem('eeg_connect_result');
        if (storedResult) {
          eegConnectResult = JSON.parse(storedResult);
          // Optionally clear after reading
          await AsyncStorage.removeItem('eeg_connect_result');
        }
      } catch (e) {
        console.warn('Could not get EEG result from eeg-connect:', e);
      }
      let eegForAnalysis: EEGData;
      if (eegConnectResult && eegConnectResult.band_powers) {
        setEegAnalysisData(eegConnectResult);
        eegForAnalysis = {
          alpha: eegConnectResult.band_powers.find((b: any) => b.band === 'alpha')?.percentage ?? 0.65,
          beta: eegConnectResult.band_powers.find((b: any) => b.band === 'beta')?.percentage ?? 0.45,
          theta: eegConnectResult.band_powers.find((b: any) => b.band === 'theta')?.percentage ?? 0.32,
          delta: eegConnectResult.band_powers.find((b: any) => b.band === 'delta')?.percentage ?? 0.28,
          gamma: eegConnectResult.band_powers.find((b: any) => b.band === 'gamma')?.percentage ?? 0.15,
        };
      } else {
        eegForAnalysis = {
          alpha: 0.65,
          beta: 0.45,
          theta: 0.32,
          delta: 0.28,
          gamma: 0.15,
        };
      }

      // Call your mood analysis API
      const response = await fetch(getApiUrl('/moods/analyze'), {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facial_emotion: facialEmotion,
          eeg_data: eegForAnalysis
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Analysis result:', result);
        
        setAnalysisResult(result.analysis);
        setEegData(eegForAnalysis);
      } else {
        console.error('Analysis failed, using fallback data');
        setEegData(eegForAnalysis);
        setAnalysisResult(createFallbackAnalysis(facialEmotion, eegForAnalysis));
      }
    } catch (error) {
      console.error('Error performing mood analysis:', error);
      const mockEEGData = {
        alpha: 0.65,
        beta: 0.45,
        theta: 0.32,
        delta: 0.28,
        gamma: 0.15,
      };
      setEegData(mockEEGData);
      setAnalysisResult(createFallbackAnalysis(facialEmotion, mockEEGData));
    } finally {
      setLoading(false);
    }
  }, [facialEmotion, eegAnalysisData, loading, analysisResult]);

    // --- FIXED: Use getDominantBand with correct data source ---
  const createFallbackAnalysis = (mood: string, eegData: any) => {
    const dominantBand = getDominantBand(eegData);
    return {
      facial_analysis: {
        emotion: mood,
        title: mood.charAt(0).toUpperCase() + mood.slice(1),
        color: getColorForMood(mood),
        valence: mood === 'happy' ? 'positive' : mood === 'sad' ? 'negative' : 'neutral'
      },
      eeg_analysis: {
        dominant_band: dominantBand,
        emotional_state: getEEGEmotionalState(dominantBand),
        color: getEEGColor(dominantBand),
        description: getEEGDescription(dominantBand)
      },
      combined_analysis: {
        title: getCombinedTitle(mood, dominantBand),
        interpretation: getCombinedInterpretation(mood, dominantBand),
        combined_mood: `${mood}_${dominantBand.toLowerCase()}`,
        eeg_emotional_state: getEEGEmotionalState(dominantBand)
      }
    };
  };

  const getDominantBand = (data: any): string => {
  if (!data) return 'Alpha';

  // If data contains band_powers array
  if (Array.isArray(data.band_powers)) {
    if (data.band_powers.length === 0) return 'Alpha';

    const dominant = data.band_powers.reduce(
      (max: BandPower, current: BandPower) =>
        current.percentage > max.percentage ? current : max
    );
    return normalizeBand(dominant.band);
  }

  // Otherwise, assume it's a plain EEGData object
  const bands = Object.entries(data) as [string, number][];
  if (bands.length === 0) return 'Alpha';

  const dominant = bands.reduce(
    (max, current) => (current[1] > max[1] ? current : max)
  );

  return normalizeBand(dominant[0]);
};

  const getColorForMood = (mood: string): string => {
    const colors = {
      happy: '#4CAF50',
      sad: '#2196F3',
      angry: '#F44336',
      neutral: '#9E9E9E',
      fear: '#FF9800',
      surprise: '#9C27B0',
      disgust: '#795548'
    };
    return colors[mood as keyof typeof colors] || '#9E9E9E';
  };

  const getEEGColor = (band: string): string => {
    const colors = {
      Alpha: '#27AE60',
      Beta: '#F39C12',
      Theta: '#8E44AD',
      Delta: '#2D1B69',
      Gamma: '#E74C3C'
    };
    return colors[band as keyof typeof colors] || '#27AE60';
  };

  const getEEGEmotionalState = (band: string): string => {
    const states = {
      Alpha: 'Peaceful Contentment',
      Beta: 'Mental Agitation',
      Theta: 'Emotional Vulnerability',
      Delta: 'Subconscious Processing',
      Gamma: 'Intense Processing'
    };
    return states[band as keyof typeof states] || 'Peaceful Contentment';
  };

  const getEEGDescription = (band: string): string => {
    const descriptions = {
      Alpha: 'Relaxed awareness and contentment',
      Beta: 'Stress and mental tension',
      Theta: 'Emotional processing and vulnerability',
      Delta: 'Deep processing/recovery state',
      Gamma: 'High-intensity emotional processing'
    };
    return descriptions[band as keyof typeof descriptions] || 'Relaxed awareness';
  };

  const getCombinedTitle = (mood: string, band: string): string => {
    if (mood === 'happy' && band === 'Alpha') return 'Peaceful Joy';
    if (mood === 'happy' && band === 'Beta') return 'Energetic Happiness';
    if (mood === 'sad' && band === 'Theta') return 'Emotional Processing';
    return 'Complex Emotional State';
  };

  const getCombinedInterpretation = (mood: string, band: string): string => {
    if (mood === 'happy' && band === 'Alpha') {
      return 'You experienced happiness in a relaxed, centered state.';
    }
    return `Your ${mood} emotion aligns with ${band.toLowerCase()} brain wave patterns.`;
  };

  const saveMoodToDatabase = async (retryCount = 0) => {
  if (!user || !analysisResult) {
    Alert.alert('Error', 'Please login and ensure analysis is complete');
    return;
  }

  if (saving) return;

  setSaving(true);
  try {
    // Ensure proper date format (YYYY-MM-DD)
    const currentDate = new Date();
    const formattedDate = currentDate.toISOString().split('T')[0]; // This ensures YYYY-MM-DD format
    
    const moodPayload = {
      user_id: user.username,
      mood_date: formattedDate, // ✅ Properly formatted date
      mood: facialEmotion,
      combined_mood: analysisResult.combined_analysis?.combined_mood || `${facialEmotion}_combined`,
      eeg_emotional_state: analysisResult.eeg_analysis?.emotional_state || 'Peaceful Contentment',
      note: `Detected via scan: ${analysisResult.combined_analysis?.interpretation || 'Mood analysis completed'}`
    };

    // Debug: Log the exact payload being sent
    console.log('=== FRONTEND PAYLOAD DEBUG ===');
    console.log('Payload:', JSON.stringify(moodPayload, null, 2));
    console.log('Date type:', typeof moodPayload.mood_date);
    console.log('Date value:', moodPayload.mood_date);
    console.log('=============================');

    const response = await fetch(getApiUrl('/moods/result'), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(moodPayload),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Save successful:', result);
      
      setMoodSaved(true);
      
      // Navigate directly to calendar
      router.push({ 
        pathname: '/calendar', 
        params: { 
          highlightDate: formattedDate,
          fromScan: 'true',
          savedMood: facialEmotion
        }
      });
    } else {
      const errorData = await response.text();
      console.error('=== RESPONSE ERROR DEBUG ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Body:', errorData);
      console.error('===========================');
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }
  } catch (error) {
    console.error('Error saving mood:', error);
    setSaving(false);
  }
  };

  // In your scan result screen
    const navigateToChat = () => {
      const prompt = analysisResult?.combined_analysis?.chatbotPrompt || 
                    `I'm feeling ${facialEmotion}. Can you help me understand this better?`;  
      router.push({ pathname: '/buddyAI', params: { moodPrompt: prompt } });
    };

  const getBandColor = (band: string) => {
    const colors = {
      theta: '#f39c12',
      alpha: '#3498db', 
      lowbeta: '#2ecc71',
      highbeta: '#e67e22',
      gamma: '#9b59b6'
    };
    return colors[band as keyof typeof colors] || '#e88f8f';
  };

  const renderEEGData = () => {
  // Use real EEG data if available, otherwise use analysis result
  const bandPowers = eegAnalysisData?.band_powers || [
    { band: 'alpha', percentage: Math.round((eegData?.alpha || 0.65) * 100), description: 'Relaxation, creativity' },
    { band: 'beta', percentage: Math.round((eegData?.beta || 0.45) * 100), description: 'Active thinking, focus' },
    { band: 'theta', percentage: Math.round((eegData?.theta || 0.32) * 100), description: 'Emotional processing, meditation' },
    { band: 'delta', percentage: Math.round((eegData?.delta || 0.28) * 100), description: 'Deep sleep, healing' },
    { band: 'gamma', percentage: Math.round((eegData?.gamma || 0.15) * 100), description: 'Higher mental activity' }
  ];

  // Get dominant band
  const dominantBand = getDominantBand(eegAnalysisData?.band_powers ? eegAnalysisData : eegData);
  const dominantBandData = bandPowers.find(band => 
    band.band.toLowerCase() === dominantBand.toLowerCase()
  );

  return (
    <View style={styles.eegDataContainer}>
      <Text style={styles.eegTitle}>🧠 EEG Analysis Results</Text>
      
      {/* Dominant Brain State Display */}
      <View style={styles.dominantBandContainer}>
        <Text style={styles.dominantBandTitle}>Dominant Brain State</Text>
        <View style={[styles.dominantBandCard, { borderColor: getEEGColor(dominantBand) }]}>
          <View style={styles.dominantBandHeader}>
            <View style={[styles.dominantBandIndicator, { backgroundColor: getEEGColor(dominantBand) }]} />
            <Text style={[styles.dominantBandName, { color: getEEGColor(dominantBand) }]}>
              {dominantBand.toUpperCase()}
            </Text>
            <Text style={styles.dominantBandPercentage}>
              {dominantBandData?.percentage || 0}%
            </Text>
          </View>
          <Text style={styles.dominantBandState}>
            {getEEGEmotionalState(dominantBand)}
          </Text>
          <Text style={styles.dominantBandDescription}>
            {getEEGDescription(dominantBand)}
          </Text>
        </View>
      </View>

      <Text style={styles.eegPatterns}>
        {eegAnalysisData 
          ? `EEG analysis completed at ${new Date(eegAnalysisData.analysis_timestamp).toLocaleTimeString()}.`
          : 'Brain wave analysis showing your current mental state.'
        }
      </Text>

      {/* All Band Powers */}
      <Text style={styles.allBandsTitle}>All Brain Wave Bands</Text>
      {bandPowers.map((wave, index) => (
        <View key={index} style={[
          styles.brainwaveItem,
          wave.band.toLowerCase() === dominantBand.toLowerCase() && styles.dominantBrainwaveItem
        ]}>
          <View style={styles.brainwaveHeader}>
            <Text style={[
              styles.brainwaveName,
              wave.band.toLowerCase() === dominantBand.toLowerCase() && styles.dominantBrainwaveName
            ]}>
              {wave.band.toUpperCase()}: {Math.round(wave.percentage)}%
              {wave.band.toLowerCase() === dominantBand.toLowerCase() && ' 👑'}
            </Text>
          </View>
          <View style={styles.brainwaveBarBackground}>
            <View style={[
              styles.brainwaveBar, 
              { 
                width: `${wave.percentage}%`,
                backgroundColor: getBandColor(wave.band)
              }
            ]} />
          </View>
          <Text style={styles.brainwaveDescription}>{wave.description}</Text>
        </View>
      ))}

      {eegAnalysisData && (
        <View style={styles.eegTimestamp}>
          <Text style={styles.timestampText}>
            ✅ Real EEG data from {new Date(eegAnalysisData.analysis_timestamp).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
};


  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#e88f8f" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Analyzing your mood...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <StatusBar style="auto" />

      <View style={[styles.card, { 
        borderLeftWidth: 4, 
        borderLeftColor: analysisResult?.facial_analysis?.color || '#4CAF50' 
      }]}>
        {/* Combined Interpretation */}
        <View style={styles.analysisContainer}>
          <View style={styles.analysisItem}>
            <View style={[styles.analysisDot, { 
              backgroundColor: analysisResult?.facial_analysis?.color || '#4CAF50' 
            }]} />
            <View style={styles.analysisContent}>
              <Text style={styles.analysisLabel}>Emotion Detected</Text>
              <Text style={styles.analysisValue}>
                {analysisResult?.facial_analysis?.title || facialEmotion.charAt(0).toUpperCase() + facialEmotion.slice(1)}
              </Text>
            </View>
          </View>
          
          <View style={styles.analysisItem}>
            <View style={[styles.analysisDot, { 
              backgroundColor: analysisResult?.eeg_analysis?.color || '#27AE60' 
            }]} />
            <View style={styles.analysisContent}>
              <Text style={styles.analysisLabel}>Brain State</Text>
              <Text style={styles.analysisValue}>
                {analysisResult?.eeg_analysis?.emotional_state || 'Calm Focus'}
              </Text>
            </View>
          </View>
          
          <View style={styles.analysisLine} />
          
          <View style={styles.analysisItem}>
            <View style={[styles.analysisDot, { backgroundColor: '#007bff' }]} />
            <View style={styles.analysisContent}>
              <Text style={styles.analysisLabel}>Combined Result</Text>
              <Text style={[styles.finalResult, { 
                color: analysisResult?.facial_analysis?.color || '#4CAF50' 
              }]}>
                "{analysisResult?.combined_analysis?.title || 'Peaceful Joy'}"
              </Text>
              <Text style={styles.resultDescription}>
                {analysisResult?.combined_analysis?.interpretation || 
                 'You experienced happiness in a relaxed, centered state.'}
              </Text>
            </View>
          </View>
        </View>

        {user && (
          <Text style={styles.userInfo}>
            Analysis for {user.full_name || user.username} • {formattedDate}
          </Text>
        )}
      </View>

      {/* EEG Data Display */}
      {renderEEGData()}

      <TouchableOpacity style={styles.button} onPress={navigateToChat}>
        <MessageSquare color="#fff" style={{ marginRight: 8 }} />
        <View style={styles.buttonTextContainer}>
          <Text style={styles.buttonText}>Talk to Buddy AI</Text>
          <Text style={styles.buttonDescription}>
            {analysisResult?.combined_analysis?.chatAsk || 
             'Discuss your mood analysis'}
          </Text>
        </View>
      </TouchableOpacity>

<TouchableOpacity
  style={[
    styles.button, 
    { backgroundColor: moodSaved ? '#4CAF50' : '#8fbfe8' }
  ]}
  onPress={() => {
    if (moodSaved) {
      // If already saved, go directly to calendar
      router.push({ 
        pathname: '/calendar', 
        params: { 
          highlightDate: new Date().toISOString().split('T')[0],
          fromScan: 'true'
        }
      });
    } else {
      // Save first, then navigate
      saveMoodToDatabase();
    }
  }}
  disabled={saving}
>
  <CalendarDays color="#fff" style={{ marginRight: 8 }} />
  <View style={styles.buttonTextContainer}>
    <Text style={[styles.buttonText, { color: '#fff' }]}>
      {saving ? 'Saving...' : moodSaved ? '📅 View in Calendar' : 'Save to Calendar'}
    </Text>
    {!moodSaved && !saving && (
      <Text style={styles.buttonDescription}>
        Add your mood analysis to calendar
      </Text>
    )}
    {moodSaved && (
      <Text style={styles.buttonDescription}>
        Tap to view your saved mood analysis
      </Text>
    )}
  </View>
</TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: '#ccc' }]}
        onPress={() => router.push('/home')}
      >
        <Home color="#333" style={{ marginRight: 8 }} />
        <Text style={[styles.buttonText, { color: '#333' }]}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// All your existing styles remain the same
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff0f5',
    paddingHorizontal: 20,
  },
  analysisContainer: {
    width: '100%',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  analysisItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  analysisDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  analysisContent: {
    flex: 1,
  },
  analysisLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  analysisValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  analysisLine: {
    height: 18,
    width: 2,
    marginLeft: 6,
    marginBottom: 2,
  },
  finalResult: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  resultDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
    marginBottom: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 5,
    marginTop: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  eegDataContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  eegTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  eegPatterns: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  brainwaveItem: {
    marginBottom: 12,
  },
  brainwaveName: {
    fontSize: 14,
    fontWeight: '600',
  },
  brainwaveBarBackground: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 4,
  },
  brainwaveBar: {
    height: 8,
  },
  brainwaveDescription: {
    fontSize: 12,
    color: '#666',
  },
  eegTimestamp: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  timestampText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e88f8f',
    padding: 14,
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextContainer: {
    alignItems: 'center',
  },
  buttonDescription: {
    color: '#fff',
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.9,
    marginTop: 2,
    textAlign: 'center',
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e8f5e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successEmoji: {
    fontSize: 30,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  viewCalendarButton: {
    backgroundColor: '#007bff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  viewCalendarButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  // Add these to your existing styles
dominantBandContainer: {
  marginBottom: 20,
},
dominantBandTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginBottom: 8,
},
dominantBandCard: {
  backgroundColor: '#f8f9fa',
  borderRadius: 12,
  padding: 16,
  borderWidth: 2,
  borderLeftWidth: 6,
},
dominantBandHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 8,
},
dominantBandIndicator: {
  width: 16,
  height: 16,
  borderRadius: 8,
  marginRight: 12,
  borderWidth: 2,
  borderColor: 'white',
},
dominantBandName: {
  fontSize: 18,
  fontWeight: 'bold',
  flex: 1,
},
dominantBandPercentage: {
  fontSize: 16,
  fontWeight: '600',
  color: '#666',
},
dominantBandState: {
  fontSize: 16,
  fontWeight: '600',
  color: '#333',
  marginBottom: 4,
},
dominantBandDescription: {
  fontSize: 14,
  color: '#666',
  fontStyle: 'italic',
},
allBandsTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#666',
  marginBottom: 12,
  marginTop: 8,
},
brainwaveHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
dominantBrainwaveItem: {
  backgroundColor: '#f0f8ff',
  borderRadius: 8,
  padding: 8,
  borderLeftWidth: 4,
  borderLeftColor: '#007bff',
},
dominantBrainwaveName: {
  color: '#007bff',
  fontWeight: 'bold',
},

});
