// EmojiSVG.tsx
import React, { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Svg from 'react-native-svg';

export type MoodName = 'happy' | 'sad' | 'neutral' | 'surprise' | 'fear' | 'disgust' | 'angry';
export type Mood = '😲' | '😢' | '😐' | '😀' | '😨' | '🤢' | '😠';

export const emojiToMood: Record<Mood, string> = {
  '😲': 'surprise',
  '😢': 'sad',
  '😐': 'neutral',
  '😀': 'happy',
  '😨': 'fear',
  '🤢': 'disgust',
  '😠': 'angry',
};

export const moodToEmoji: Record<string, Mood> = {
  surprise: '😲',
  sad: '😢',
  neutral: '😐',
  happy: '😀',
  fear: '😨',
  disgust: '🤢',
  angry: '😠',
};

// Update the EmojiSVG component interface
interface EmojiSVGProps {
  type: Mood | undefined;
  size?: number;
  style?: any;
  animated?: boolean;
}

const EmojiSVG: React.FC<EmojiSVGProps> = ({ type, size = 30, style = {}, animated = false }) => {
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (animated) {
      startRotationAnimation();
    }
  }, [animated]);

  const startRotationAnimation = () => {
    Animated.sequence([
      Animated.timing(rotateAnim, {
        toValue: 0.05,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: -0.05,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hoverOrPress = () => {
    if (animated) {
      startRotationAnimation();
    }
  };

  const animatedStyle = animated
    ? {
        transform: [
          { perspective: 800 },
          {
            rotateY: rotateAnim.interpolate({
              inputRange: [-0.05, 0, 0.05],
              outputRange: ['-5deg', '0deg', '5deg'],
            }),
          },
          {
            scale: rotateAnim.interpolate({
              inputRange: [-0.05, 0, 0.05],
              outputRange: [0.95, 1, 0.95],
            }),
          },
        ],
      }
    : {};

  const renderSVGEmoji = () => {
    const viewBox = "0 0 64 64";
    const outlineColor = "#664E27";

    switch (type) {
      case '😀':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="happyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#FFE78D" />
                <Svg.Stop offset="100%" stopColor="#FFCC4D" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#happyGradient)" stroke={outlineColor} strokeWidth="2" />
            <Svg.Path d="M49,38c0,9.4-7.6,17-17,17c-9.4,0-17-7.6-17-17" fill="none" stroke={outlineColor} strokeWidth="3" strokeLinecap="round" />
            <Svg.Circle cx="20.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="24.5" r="5" fill={outlineColor} />
          </Svg.Svg>
        );

      case '😢':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="sadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#D6D6D6" />
                <Svg.Stop offset="100%" stopColor="#9E9E9E" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#sadGradient)" stroke={outlineColor} strokeWidth="2" />
            <Svg.Path d="M19,46c4.2-3.1,13.6-3.1,17.8,0" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
            <Svg.Circle cx="20.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Path d="M44,42c0,0,7,5.9,7,9c0,2-1,3-3,3s-4-1-4-1" fill="#65B1EF" stroke={outlineColor} strokeWidth="1.5" />
          </Svg.Svg>
        );

      case '😐':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="neutralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#F5E0C3" />
                <Svg.Stop offset="100%" stopColor="#E0C8A1" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#neutralGradient)" stroke="#999999" strokeWidth="1.5" />
            <Svg.Path d="M20,42h24" stroke={outlineColor} strokeWidth="3" strokeLinecap="round" />
            <Svg.Circle cx="20.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="24.5" r="5" fill={outlineColor} />
          </Svg.Svg>
        );

      case '😲':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="surpriseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#D1C4E9" />
                <Svg.Stop offset="100%" stopColor="#9575CD" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#surpriseGradient)" stroke={outlineColor} strokeWidth="2" />
            <Svg.Circle cx="32" cy="42" r="9" fill={outlineColor} />
            <Svg.Circle cx="20.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="24.5" r="5" fill={outlineColor} />
          </Svg.Svg>
        );
       
        case '😨':
            return (
              <Svg.Svg width={size} height={size} viewBox="0 0 64 64">
                <Svg.Defs>
                  <Svg.LinearGradient id="fearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Svg.Stop offset="0%" stopColor="#B3E5FC" />
                    <Svg.Stop offset="100%" stopColor="#4FC3F7" />
                  </Svg.LinearGradient>
                </Svg.Defs>
          
                {/* Face Circle */}
                <Svg.Circle
                  cx="32"
                  cy="32"
                  r="30"
                  fill="url(#fearGradient)"
                  stroke="#0288D1"
                  strokeWidth="2"
                />
          
                {/* Eyes */}
                <Svg.Circle cx="22" cy="26" r="5" fill="#263238" />
                <Svg.Circle cx="42" cy="26" r="5" fill="#263238" />
          
                {/* Oval mouth with trembling teeth */}
                <Svg.Ellipse
                  cx="32"
                  cy="45"
                  rx="10"
                  ry="6"
                  fill="#fff"
                  stroke="#263238"
                  strokeWidth="1.5"
                />
                <Svg.Line x1="28" y1="40" x2="28" y2="50" stroke="#263238" strokeWidth="1" />
                <Svg.Line x1="32" y1="40" x2="32" y2="50" stroke="#263238" strokeWidth="1" />
                <Svg.Line x1="36" y1="40" x2="36" y2="50" stroke="#263238" strokeWidth="1" />
          
                {/* Raised Arched Eyebrows */}
                <Svg.Path
                  d="M16,18 q8,-8 16,0"
                  fill="none"
                  stroke="#263238"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <Svg.Path
                  d="M32,18 q8,-8 16,0"
                  fill="none"
                  stroke="#263238"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
          
                {/* Sweat droplet (top left) */}
                <Svg.Path
                  d="M18,8 C20,4 24,4 26,8 C26,12 22,16 22,16 C22,16 18,12 18,8"
                  fill="#81D4FA"
                  stroke="#0288D1"
                  strokeWidth="1"
                />
              </Svg.Svg>
            );
          


      case '🤢':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="disgustGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#B5E655" />
                <Svg.Stop offset="100%" stopColor="#88C057" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#disgustGradient)" stroke={outlineColor} strokeWidth="2" />
            <Svg.Path d="M19,46c4.2-3.1,13.6-3.1,17.8,0" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
            <Svg.Circle cx="20.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="24.5" r="5" fill={outlineColor} />
            <Svg.Path d="M25,35c-1.9-1.1-7.1-2.1-13.8,1.9" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
          </Svg.Svg>
        );

      case '😠':
        return (
          <Svg.Svg width={size} height={size} viewBox={viewBox}>
            <Svg.Defs>
              <Svg.LinearGradient id="angryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <Svg.Stop offset="0%" stopColor="#FFDD67" />
                <Svg.Stop offset="100%" stopColor="#FF6D3F" />
              </Svg.LinearGradient>
            </Svg.Defs>
            <Svg.Circle cx="32" cy="32" r="30" fill="url(#angryGradient)" stroke={outlineColor} strokeWidth="2" />
            <Svg.Path d="M19,46c4.2-3.1,13.6-3.1,17.8,0" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
            <Svg.Path d="M13,22l12,5" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
            <Svg.Path d="M51,22l-12,5" fill="none" stroke={outlineColor} strokeWidth="2.5" strokeLinecap="round" />
            <Svg.Circle cx="20.5" cy="27.5" r="5" fill={outlineColor} />
            <Svg.Circle cx="43.5" cy="27.5" r="5" fill={outlineColor} />
          </Svg.Svg>
        );

      default:
        return <Text style={{ fontSize: size, textAlign: 'center' }}>{type}</Text>;
    }
  };

  const Content = animated ? Animated.View : View;

  return (
    <TouchableOpacity onPress={hoverOrPress} style={[styles.container, style]} disabled={!animated}>
      <Content style={[animatedStyle]}>{renderSVGEmoji()}</Content>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default EmojiSVG;