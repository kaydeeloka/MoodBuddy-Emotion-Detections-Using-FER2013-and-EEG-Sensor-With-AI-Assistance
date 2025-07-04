import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  type Mood = { emoji: string; label: string; color: string };
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [user, setUser] = useState<any>(null);

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
        } else {
          // Handle case when no user data is found
          console.log('No user data found');
          router.replace('/login');
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        router.replace('/login');
      }
    };
    loadUserData();
  }, [router]);

  useEffect(() => {
    // Rotation animation
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    ).start();

    // Pulse animation for buttons
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Update time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, [rotation, pulseAnim]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  
  const getGreeting = (user: any) => {
    const hour = currentTime.getHours();
    const displayName = user?.username || 'User';
    
    if (hour < 12) return `Good Morning, ${displayName}!`;
    if (hour < 17) return `Good Afternoon, ${displayName}!`;
    return `Good Evening, ${displayName}!`;
  };


  const handleQuickMood = (mood: React.SetStateAction<{ emoji: string; label: string; color: string; } | null>) => {
    setSelectedMood(mood);
    // Add haptic feedback or animation here
    setTimeout(() => {
      router.push('/(tabs)/calendar');
    }, 300);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>{getGreeting(user)}</Text>
        <Text style={styles.headerTitle}>How are you today?</Text>
        <Text style={styles.dateText}>
          {currentTime.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Text>
      </View>
            {/* New description section */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>
          Your personal companion for understanding and reflecting on emotions
        </Text>
        <Text style={styles.descriptionText}>
          MoodBuddy helps you scan your mood, track emotional patterns, and provides 
          personalized insights to support your mental wellness journey.
        </Text>
      </View>
      {/* Wave */}
      <Svg
        height={30}
        width="100%"
        viewBox="0 0 1440 320"
        style={styles.svgWave}
      >
        <Path
          fill="#ffe6ec"
          d="M0,160L80,160C160,160,320,160,480,149.3C640,139,800,117,960,128C1120,139,1280,181,1360,202.7L1440,224L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        />
      </Svg>

      {/* Animated Mood Buddy */}
      <TouchableOpacity 
        style={styles.imageContainer}
        onPress={() => router.push('/buddyAI')}
        activeOpacity={0.8}
      >
        <Animated.Image
          source={require('../../assets/images/moodBuddy.png')}
          style={[styles.image, { transform: [{ rotate: spin }] }]}
          resizeMode="contain"
        />
        <Text style={styles.imageLabel}>Tap me to chat with Buddy AI!</Text>
      </TouchableOpacity>

      {/* Action Cards */}
      <View style={styles.actionCards}>
        <View style={styles.actionCard}>
          <View style={styles.cardIcon}>
            <Ionicons name="camera" size={24} color="#8d0140" />
          </View>
          <Text style={styles.cardTitle}>Face Scan</Text>
          <Text style={styles.cardDescription}>
            Analyze your emotions through facial expressions
          </Text>
        </View>

        <View style={styles.actionCard}>
          <View style={styles.cardIcon}>
            <Ionicons name="pulse" size={24} color="#8d0140" />
          </View>
          <Text style={styles.cardTitle}>EEG Scan</Text>
          <Text style={styles.cardDescription}>
            Connect EEG device for brain activity analysis
          </Text>
        </View>
      </View>


      {/* Main Action Buttons */}
      <View style={styles.buttonGroup}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            onPress={() => router.push('/eeg-connect')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={20} color="white" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>Scan Your Emotion</Text>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.push('/(tabs)/calendar')}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar" size={20} color="white" style={styles.buttonIcon} />
          <Text style={styles.buttonText}>View Mood Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* Today's Insight */}
      <View style={styles.insightCard}>
        <Text style={styles.insightTitle}>💡 Today's Tip</Text>
        <Text style={styles.insightText}>
          "Taking just 5 minutes to reflect on your emotions can improve your self-awareness and emotional intelligence."
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffe6ec',
  },
  descriptionContainer: {
    backgroundColor: '#fff0f5',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 18,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  descriptionTitle: {
  color: '#8d0140',
  fontSize: 14,
  fontWeight: '600',
  textAlign: 'center',
  marginBottom: 8,
  lineHeight: 22,
},
descriptionText: {
  color: '#444',
  fontSize: 12,
  textAlign: 'center',
  opacity: 0.9,
  lineHeight: 20,
},
  header: {
    width: '100%',
    backgroundColor: '#8d0140',
    paddingTop: 35,
    paddingBottom: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  headerText: {
    color: 'white',
    fontSize: 16,
    fontStyle: 'italic',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    marginTop: 5,
  },
  svgWave: {
    marginTop: -1,
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 70,
    backgroundColor: '#fff0f5',
    padding: 10,
  },
  imageLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#8d0140',
    fontWeight: '500',
  },
  quickMoodSection: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8d0140',
    textAlign: 'center',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  moodGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  moodButton: {
    width: (width - 60) / 5,
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedMoodButton: {
    borderColor: '#8d0140',
    transform: [{ scale: 1.1 }],
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  actionCards: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 15,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f3e5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8d0140',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  buttonGroup: {
    marginTop: 30,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: '#8d0140',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: '#f47d7d',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  insightCard: {
    margin: 20,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8d0140',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    marginBottom: 40,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8d0140',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

