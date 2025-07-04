import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import EmojiSVG, { emojiToMood, Mood, moodToEmoji } from '../../components/EmojiSVG';
import { getApiUrl } from '../../config/local';
import { UserStorage } from '../../constants/userStorage';

import { router } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

export default function Calendar() {
  const route = useRoute();
  const [user, setUser] = useState<{username: string} | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [moodEntries, setMoodEntries] = useState<Record<string, MoodEntry>>({});
  const [detectedMood, setdetectedMood] = useState<Mood | null>(null);
  const [combinedMoodTitle, setCombinedMoodTitle] = useState<string>('');
  const [combinedMoodInterpretation, setCombinedMoodInterpretation] = useState<string>('');
  const [eegEmotionalState, setEegEmotionalState] = useState<string>('');
  const [eegStateColor, setEegStateColor] = useState<string>('#27AE60');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Define mood arrays and labels
  const moodEmojis: Mood[] = ['😀', '😢', '😐', '😲', '😨', '🤢', '😠'];
  
  const moodLabels: Record<Mood, string> = {
    '😀': 'Happy',
    '😢': 'Sad',
    '😐': 'Neutral',
    '😲': 'Surprised',
    '😨': 'Fearful',
    '🤢': 'Disgusted',
    '😠': 'Angry',
  };

  // Create emoji data array for the modal
  const emojiData = moodEmojis.map(mood => ({
    mood,
    emoji: mood,
    label: moodLabels[mood]
  }));

  // EEG state color mapping
  const EEG_STATE_COLORS: Record<string, string> = {
    'Peaceful Contentment': '#27AE60',
    'Mental Agitation': '#F39C12',
    'Emotional Vulnerability': '#8E44AD',
    'Subconscious Processing': '#2D1B69',
    'Intense Processing': '#E74C3C',
  };

  type EEGEmotionalState = 
  | 'Peaceful Contentment'
  | 'Mental Agitation'
  | 'Emotional Vulnerability'
  | 'Subconscious Processing'
  | 'Intense Processing';
    
  type MoodEntry = {
    id?: string;
    date: string;
    mood?: Mood;
    combined_mood?: string;
    eeg_emotional_state?: EEGEmotionalState;
    note?: string;
  };
  // Initialize user
  useEffect(() => {
    const initializeUser = async () => {
      try {
        const params = route?.params as { username?: string } | undefined;
        if (params?.username) {
          setUser({ username: params.username });
          return;
        }
        
        const userData = await UserStorage.getUser();
        if (userData) {
          setUser({
            username: userData.username || userData.email || 'unknown'
          });
          console.log('User loaded in Calendar:', userData.username);
        } else {
          console.log('No user found in storage');
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user in Calendar:', error);
        setUser(null);
      }
    };
    
    initializeUser();
  }, [route]);

  // Load moods when user changes
  useEffect(() => {
    if (user) {
      loadMoodsFromDatabase();
    }
  }, [user]);

  // Database functions
  const saveMoodToDatabase = async (moodEntry: MoodEntry) => {
  if (!user) {
    throw new Error('No user logged in');
  }

  try {
    const moodName = emojiToMood[moodEntry.mood!] || 'neutral';
    
    const response = await fetch(getApiUrl('/moods/create'), {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.username,
        mood_date: moodEntry.date,
        mood: moodName,
        combined_mood: moodEntry.combined_mood,
        eeg_emotional_state: moodEntry.eeg_emotional_state,
        note: moodEntry.note || ""
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Save error details:', errorData);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Save result:', result);
    return result;
  } catch (error) {
    console.error('Error saving mood to database:', error);
    throw error;
  }
};

  const updateMoodInDatabase = async (moodEntry: MoodEntry) => {
    if (!user || !moodEntry.id) {
      throw new Error('No user logged in or mood ID missing');
    }

    try {
      const moodName = emojiToMood[moodEntry.mood!] || 'neutral';
      
      const response = await fetch(getApiUrl(`/moods/update/${moodEntry.id}`), {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: moodName,
          combined_mood: moodEntry.combined_mood,
          eeg_emotional_state: moodEntry.eeg_emotional_state,
          note: moodEntry.note || ""
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update error details:', errorData);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Update result:', result);
      return result;
    } catch (error) {
      console.error('Error updating mood in database:', error);
      throw error;
    }
  };

  // Update the fetchMoodData to get mood statistic
const fetchMoodData = async (startDate: string, endDate: string) => {
  if (!user) {
    throw new Error('No user logged in');
  }

  try {
    const url = `${getApiUrl('/moods/filter')}?user_id=${user.username}&start_date=${startDate}&end_date=${endDate}`;
    console.log('Fetching from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const moods = await response.json();
    console.log('Fetched moods:', moods);
    return moods;
  } catch (error) {
    console.error('Error fetching mood data:', error);
    throw error;
  }
};

  const deleteMoodFromDatabase = async (moodId: string) => {
    if (!user) {
      throw new Error('No user logged in');
    }

    try {
      const response = await fetch(`${getApiUrl('/moods/delete')}?mood_id=${moodId}&user_id=${user.username}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting mood from database:', error);
      throw error;
    }
  };

  const loadMoodsFromDatabase = async () => {
    if (!user) {
      console.log('No user available, skipping mood load');
      return;
    }

    try {
      setLoading(true);
      
      const currentYear = new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      console.log('Loading moods for user:', user.username);
      const databaseMoods = await fetchMoodData(startDate, endDate);
      
      if (databaseMoods && databaseMoods.length > 0) {
        const transformedMoods: Record<string, MoodEntry> = {};
        databaseMoods.forEach((mood: any) => {
          const moodEmoji = moodToEmoji[mood.mood] || '😐';
          
          transformedMoods[mood.mood_date] = {
            id: mood.id.toString(),
            date: mood.mood_date,
            mood: moodEmoji as Mood,
            combined_mood: mood.combined_mood,
            eeg_emotional_state: mood.eeg_emotional_state,
            note: mood.note || "",
          };
        });
        
        setMoodEntries(transformedMoods);
        await AsyncStorage.setItem(`moodEntries_${user.username}`, JSON.stringify(transformedMoods));
        console.log('Loaded moods from database:', Object.keys(transformedMoods).length, 'entries');
        return;
      }
      
      // Fallback to local storage
      const stored = await AsyncStorage.getItem(`moodEntries_${user.username}`);
      if (stored) {
        const localMoods = JSON.parse(stored);
        setMoodEntries(localMoods);
        console.log('Loaded moods from local storage:', Object.keys(localMoods).length, 'entries');
      } else {
        setMoodEntries({});
      }
    } catch (error) {
      console.error('Error loading moods:', error);
      setMoodEntries({});
    } finally {
      setLoading(false);
    }
  };

  const generateCalendar = () => {
    const date = new Date(currentDate);
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const daysArray: (string | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push(dateStr);
    }

    return daysArray;
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr === today;
  };

  const isFutureDate = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    return dateStr > today;
  };

  const handleDatePress = async (dateStr: string) => {
  if (isFutureDate(dateStr)) {
    Alert.alert('Future Date', 'You cannot add moods for future dates.');
    return;
  }

  setSelectedDate(dateStr);
  const existingEntry = moodEntries[dateStr];
  
  if (existingEntry) {
    setdetectedMood(existingEntry.mood || null);
    setNote(existingEntry.note || '');
    setEegEmotionalState(existingEntry.eeg_emotional_state || '');
    
    // Just set the interpretation and color - no wave data loading
    if (existingEntry.combined_mood) {
      // Fetch the combined mood interpretation from the backend
      let interpretation = null;
      try {
        const response = await fetch(getApiUrl(`/moods/interpretation?combined_mood=${encodeURIComponent(existingEntry.combined_mood || '')}`), {
          method: 'GET',
          headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          interpretation = await response.json();
        }
      } catch (err) {
        console.warn('Failed to fetch combined mood interpretation:', err);
      }
      if (interpretation) {
        setCombinedMoodTitle(interpretation.title);
        setCombinedMoodInterpretation(interpretation.interpretation);
      } else {
        setCombinedMoodTitle(existingEntry.combined_mood);
        setCombinedMoodInterpretation('Your emotional and brain state analysis.');
      }
    }
    
    // Set EEG state color for display
    if (existingEntry.eeg_emotional_state) {
      const color = EEG_STATE_COLORS[existingEntry.eeg_emotional_state as keyof typeof EEG_STATE_COLORS];
      setEegStateColor(color || '#27AE60');
    }
    
    setIsEditing(true);
  } else {
    setdetectedMood(null);
    setNote('');
    setEegEmotionalState('');
    setCombinedMoodTitle('');
    setCombinedMoodInterpretation('');
    setEegStateColor('#27AE60');
    setIsEditing(false);
  }
  
  setShowMoodModal(true);
};
  const handleSave = async () => {
    if (!detectedMood) {
      Alert.alert('Error', 'Please select a mood');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Please log in first');
      return;
    }

    setLoading(true);
    
    try {
      const existingEntry = moodEntries[selectedDate];
      const isUpdating = existingEntry && existingEntry.id;
      
      const moodEntry: MoodEntry = {
        id: existingEntry?.id || Date.now().toString(),
        date: selectedDate,
        mood: detectedMood,
        combined_mood: combinedMoodTitle,
        eeg_emotional_state: eegEmotionalState as EEGEmotionalState,
        note: note.trim(),
      };

      console.log('Saving mood entry:', moodEntry);
      console.log('Is updating:', isUpdating);

      // Save to local storage first
      const updatedEntries = {
        ...moodEntries,
        [selectedDate]: moodEntry,
      };
      
      setMoodEntries(updatedEntries);
      await AsyncStorage.setItem(`moodEntries_${user.username}`, JSON.stringify(updatedEntries));

      // Save or update in database
      try {
        if (isUpdating) {
          console.log('Updating existing mood...');
          await updateMoodInDatabase(moodEntry);
          Alert.alert('Success', 'Mood updated successfully!');
        } else {
          console.log('Creating new mood...');
          const result = await saveMoodToDatabase(moodEntry);
          
          if (result.id) {
            const updatedEntryWithId = {
              ...moodEntry,
              id: result.id.toString()
            };
            const finalEntries = {
              ...updatedEntries,
              [selectedDate]: updatedEntryWithId,
            };
            setMoodEntries(finalEntries);
            await AsyncStorage.setItem(`moodEntries_${user.username}`, JSON.stringify(finalEntries));
          }
          
          Alert.alert('Success', 'Mood saved successfully!');
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError);
        Alert.alert('Partial Success', 'Mood saved locally, but failed to sync with database.');
      }

      setShowMoodModal(false);
      resetForm();
    } catch (error) {
      console.error('Error saving mood:', error);
      Alert.alert('Error', 'Failed to save mood. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this mood entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const moodId = moodEntries[selectedDate]?.id;
            
            // Delete from local storage
            const updatedEntries = { ...moodEntries };
            delete updatedEntries[selectedDate];
            
            setMoodEntries(updatedEntries);
            if (user) {
              await AsyncStorage.setItem(`moodEntries_${user.username}`, JSON.stringify(updatedEntries));
            }
            
            // Delete from database if it has an ID
            if (moodId) {
              try {
                await deleteMoodFromDatabase(moodId);
              } catch (dbError) {
                console.log('Failed to delete from database, but removed locally');
              }
            }
            
            setShowMoodModal(false);
            resetForm();
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setdetectedMood(null);
    setNote('');
    setCombinedMoodTitle('');
    setCombinedMoodInterpretation('');
    setEegEmotionalState('');
    setEegStateColor('#27AE60');
    setIsEditing(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderDay = (dateStr: string | null, index: number) => {
  if (dateStr === null) {
    return <View key={index} style={styles.emptyDay} />;
  }

  const day = parseInt(dateStr.split('-')[2]);
  const mood = moodEntries[dateStr]?.mood;
  const eegState = moodEntries[dateStr]?.eeg_emotional_state;
  const isSelected = dateStr === selectedDate;
  const hasEntry = !!moodEntries[dateStr];
  const isTodayDate = isToday(dateStr);
  const isFuture = isFutureDate(dateStr);

  // Get EEG-based background color instead of generic green
  const getEEGBackgroundColor = (state: string) => {
    switch(state) {
      case 'Subconscious Processing': 
        return { backgroundColor: '#e8e6f3', borderColor: '#2D1B69' }; // Purple tones
      case 'Emotional Vulnerability': 
        return { backgroundColor: '#f0ebf7', borderColor: '#8E44AD' }; // Light purple
      case 'Peaceful Contentment': 
        return { backgroundColor: '#e8f5e8', borderColor: '#27AE60' }; // Green tones
      case 'Mental Agitation': 
        return { backgroundColor: '#fef4e6', borderColor: '#F39C12' }; // Orange tones
      case 'Intense Processing': 
        return { backgroundColor: '#fdeaea', borderColor: '#E74C3C' }; // Red tones
      default: 
        return { backgroundColor: '#f0f0f0', borderColor: '#ccc' }; // Default gray
    }
  };

  // Get the EEG-based styling
  const eegStyling = eegState ? getEEGBackgroundColor(eegState) : null;

  return (
    <TouchableOpacity
      key={index}
      style={[
        styles.dayContainer,
        isSelected && styles.selectedDay,
        // Use EEG-based coloring instead of generic dayWithEntry
        hasEntry && eegStyling ? eegStyling : hasEntry && styles.dayWithEntry,
        isTodayDate && styles.todayDay,
        isFuture && styles.futureDay,
      ]}
      onPress={() => handleDatePress(dateStr)}
      disabled={isFuture}
      activeOpacity={isFuture ? 1 : 0.7}
    >
      <Text style={[
        styles.dayNumber,
        isSelected && styles.selectedDayText,
        isTodayDate && styles.todayText,
        isFuture && styles.futureDayText,
      ]}>
        {day}
      </Text>
      {mood && (
        <View style={styles.customEmojiContainer}>
          <EmojiSVG 
            type={mood} 
            size={16} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
};


  const calendarDays = generateCalendar();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#8d0140',
                marginTop: 30,
                marginBottom: 30,
                padding: 8,
              }}
            >
              Mood Calendar
            </Text>
          </View>
          <View style={styles.whiteBox}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
                <Ionicons name="chevron-back" size={20} color="#8d0140" />
              </TouchableOpacity>
              
              <Text style={styles.monthYear}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              
              <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
                <Ionicons name="chevron-forward" size={20} color="#8d0140" />
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#8d0140" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            )}

            <View style={styles.dayNamesContainer}>
              {dayNames.map((dayName, index) => (
                <Text key={index} style={styles.dayName}>
                  {dayName}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarDays.map((dateStr, index) => renderDay(dateStr, index))}
            </View>
            
          <View style={styles.legend}>
            <Text style={styles.legendTitle}>EEG Brain State Heatmap:</Text>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#27AE60' }]} />
                <Text style={styles.legendText}>Peaceful Contentmant</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F39C12' }]} />
                <Text style={styles.legendText}>Mental Agitation</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E74C3C' }]} />
                <Text style={styles.legendText}>Intense Processing</Text>
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#2D1B69' }]} />
                <Text style={styles.legendText}>Subconscious Processing</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#8E44AD' }]} />
                <Text style={styles.legendText}>Emotional Vulnerability</Text>
              </View>
            </View>
          </View>

          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showMoodModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowMoodModal(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.moodModalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isToday(selectedDate) ? 'How are you feeling today?' : 'How were you feeling?'}
                </Text>
                <Text style={styles.modalDate}>
                  {new Date(selectedDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
                <Text style={[styles.sectionTitle, { marginTop: 16, marginBottom: -10 }]}>Mood Analysis:</Text>
              </View>
            
              {/* Combined Interpretation Section */}
              {(combinedMoodTitle || combinedMoodInterpretation) ? (
                <View style={{
                  backgroundColor: '#f3e5f5', 
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 20,
                  borderLeftWidth: 4,
                  borderLeftColor: '#8d0140'
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    Combined Interpretation
                  </Text>
                  {combinedMoodTitle && (
                    <Text style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: '#8d0140',
                      textAlign: 'center',
                      marginBottom: 8
                    }}>
                      {combinedMoodTitle}
                    </Text>
                  )}
                  {combinedMoodInterpretation && (
                    <Text style={{
                      fontSize: 14,
                      color: '#666',
                      textAlign: 'center',
                      fontStyle: 'italic',
                      lineHeight: 20
                    }}>
                      {combinedMoodInterpretation}
                    </Text>
                  )}
                </View>
              ) : (
                <View style={{
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 16, 
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#333',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    Combined Interpretation
                  </Text>
                  <TouchableOpacity style={{
                    backgroundColor: '#8d0140',
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    alignItems: 'center'
                  }}>
                    <Text
                      style={{
                      color: 'white',
                      fontSize: 14,
                      fontWeight: '600'
                      }}
                      onPress={() => {
                      setShowMoodModal(false);
                      // Use navigation.navigate if available
                      router.push({ pathname: '/eeg-connect', params: { date: selectedDate } });
                      }}
                    >
                      Scan Your Mood
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ 
                flexDirection: 'row', 
                gap: 12, 
                marginBottom: 24 
              }}>
                {/* Detected Mood Box */}
                <View style={{ 
                  flex: 1, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 16, 
                  alignItems: 'center',
                  minHeight: 100,
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#666',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    Detected Mood
                  </Text>
                  {detectedMood ? (
                    <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
                      <EmojiSVG type={detectedMood} size={36} />
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: '#333',
                        marginTop: 8,
                        textAlign: 'center'
                      }}>
                        {moodLabels[detectedMood]}
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ 
                      color: '#bbb', 
                      fontSize: 14,
                      flex: 1,
                      textAlign: 'center',
                      textAlignVertical: 'center'
                    }}>
                      No mood detected
                    </Text>
                  )}
                </View>

                {/* EEG Brain State Box */}
                <View style={{ 
                  flex: 1, 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 20, 
                  alignItems: 'center',
                  minHeight: 100,
                  justifyContent: 'space-between',
                  borderWidth: 1,
                  borderColor: '#e9ecef'
                }}>
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: '#666',
                    marginBottom: 8,
                    textAlign: 'center'
                  }}>
                    EEG Brain State
                  </Text>
                  {eegEmotionalState ? (
                    <View style={{ 
                      alignItems: 'center', 
                      flex: 1, 
                      justifyContent: 'center' 
                    }}>
                      <View style={{ 
                        flexDirection: 'row', 
                        alignItems: 'center',
                      }}>
                        <View style={{ 
                          width: 25, 
                          height: 25, 
                          borderRadius: 12, 
                          backgroundColor: eegStateColor,
                          borderWidth: 2,
                          borderColor: 'white',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.2,
                          shadowRadius: 4,
                          elevation: 3
                        }} />
                        <Text style={{ 
                          fontSize: 14, 
                          color: '#333', 
                          fontWeight: '600',
                          textAlign: 'center'
                        }}>
                          {eegEmotionalState}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={{ 
                      color: '#bbb', 
                      fontSize: 14,
                      flex: 1,
                      textAlign: 'center',
                      textAlignVertical: 'center'
                    }}>
                      No EEG state detected
                    </Text>
                  )}
                </View>
              </View>

              <Text style={styles.sectionTitle}>Select Your Mood:</Text>
              <View style={styles.moodGrid}>
                {emojiData.map((item) => (
                  <TouchableOpacity
                    key={item.mood}
                    style={[
                      styles.moodButton,
                      detectedMood === item.mood && styles.detectedMoodButton,
                    ]}
                    onPress={() => setdetectedMood(item.mood)}
                  >
                    <View style={styles.moodButtonEmoji}>
                      <EmojiSVG type={item.mood} size={32} />
                    </View>
                    <Text style={styles.moodButtonLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* EEG Emotional State Selection */}
                <Text style={styles.sectionTitle}>Select EEG Brain State (Optional):</Text>
                <View style={styles.eegStateGrid}>
                  {Object.entries(EEG_STATE_COLORS).map(([state, color]) => (
                    <TouchableOpacity
                      key={state}
                      style={[
                        styles.eegStateButton,
                        eegEmotionalState === state && styles.selectedEegStateButton,
                        { borderColor: color }
                      ]}
                      onPress={() => {
                        setEegEmotionalState(state);
                        setEegStateColor(color);
                      }}
                    >
                      <View style={[styles.eegStateIndicator, { backgroundColor: color }]} />
                      <Text style={[
                        styles.eegStateText,
                        eegEmotionalState === state && styles.selectedEegStateText
                      ]}>
                        {state}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

              <Text style={styles.sectionTitle}>Add a Note (Optional):</Text>
              <TextInput
                style={[styles.noteInput, { color: '#888', fontStyle: 'italic' }]}
                placeholder="How are you feeling? What happened today?"
                placeholderTextColor="#b48ca2"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.characterCount}>{note.length}/500</Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowMoodModal(false);
                    resetForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                {isEditing && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.disabledButton]}
                  onPress={handleSave}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Saving...' : isEditing ? 'Update' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Styles remain the same as your previous version...
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffe6ec',
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 12,
  },
  whiteBox: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minHeight: height * 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  monthYear: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#8d0140',
    fontSize: 14,
  },
  dayNamesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  dayName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    width: (width - 80) / 7,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  dayContainer: {
    width: (width - 80) / 7,
    height: (width - 80) / 7 + 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  emptyDay: {
    width: (width - 80) / 7,
    height: (width - 80) / 7 + 2,
  },
  selectedDay: {
    borderColor: '#8d0140',
    borderWidth: 2,
    backgroundColor: '#f3e5f5',
  },
  dayWithEntry: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  todayDay: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  futureDay: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
  },
  dayNumber: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
    fontWeight: '500',
  },
  selectedDayText: {
    color: '#8d0140',
    fontWeight: 'bold',
  },
  todayText: {
    color: '#2196f3',
    fontWeight: 'bold',
  },
  futureDayText: {
    color: '#bbb',
  },
  customEmojiContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodEmoji: {
    fontSize: 16,
  },
  eegStateGrid: {
  marginBottom: 16,
},
  eegStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e9ecef',
    padding: 12,
    marginBottom: 8,
  },
  selectedEegStateButton: {
    backgroundColor: '#f3e5f5',
    borderWidth: 2,
  },
  eegStateIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'white',
  },
  eegStateText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  selectedEegStateText: {
    color: '#8d0140',
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'column',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8d0140',
    marginBottom: 6,
    textAlign: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 0,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  moodModalContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  currentMoodContainer: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
  },
  currentMoodLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  currentMoodDisplay: {
    alignItems: 'center',
  },
  currentMoodEmoji: {
    marginBottom: 4,
  },
  currentMoodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8d0140',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  moodButton: {
    width: (width - 120) / 4,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 12,
  },
  detectedMoodButton: {
    borderColor: '#8d0140',
    backgroundColor: '#f3e5f5',
  },
  moodButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodButtonEmoji: {
    marginBottom: 4,
  },
  moodButtonLabel: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    fontWeight: '500',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#dc3545',
    borderRadius: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#8d0140',
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
});
