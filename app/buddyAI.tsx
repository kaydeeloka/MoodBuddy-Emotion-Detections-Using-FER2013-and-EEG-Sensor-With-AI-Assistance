import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API_ENDPOINTS, getApiUrl } from '../config/local';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: string;
};

interface User {
  username: string;
  email: string;
  full_name: string;
}

const ChatScreen = () => {
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const params = useLocalSearchParams();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasmoodPrompt, setHasmoodPrompt] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [moodPromptProcessed, setMoodPromptProcessed] = useState(false);


     // Helper function to ensure string
  function getString(param: string | string[] | undefined): string {
    if (Array.isArray(param)) return param[0] ?? '';
    return param ?? '';
  }

  const moodPrompt = getString(params.moodPrompt);

  // Load user data on component mount
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
      } else {
        Alert.alert('Error', 'Please login to use chat feature');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/login');
    }
  };

    // Handle initial prompt - FIXED VERSION
  useEffect(() => {
    console.log('Initial prompt effect triggered:', {
      moodPrompt,
      messagesLength: messages.length,
      user: !!user,
      hasmoodPrompt
    });

    if (moodPrompt && moodPrompt.trim() !== '' && user && !hasmoodPrompt) {
      console.log('Adding initial prompt as bot message');
      
      const botMessage: Message = {
        id: `initial_${Date.now()}`,
        text: `Hello! I see you just completed a mood analysis. ${moodPrompt} Let me help you explore and understand your emotional state better.`,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages([botMessage]);
      setHasmoodPrompt(true);
      setInitialLoading(false);
    }
  }, [moodPrompt, user, hasmoodPrompt]);

  const resumeChat = async () => {
  if (!user) return;

  try {
    setInitialLoading(true);

    // Get chat history from your database
    const historyResponse = await fetch(getApiUrl(`${API_ENDPOINTS.CHAT_MESSAGES}/${user.username}`));

    let formattedMessages: Message[] = [];
    if (historyResponse.ok) {
      const historyData = await historyResponse.json();

      if (historyData && historyData.length > 0) {
        formattedMessages = historyData.map((msg: any) => ({
          id: msg.id.toString(),
          text: msg.message,
          sender: msg.sender === 'user' ? 'user' as const : 'bot' as const,
          timestamp: msg.timestamp 
            ? new Date(msg.timestamp).toISOString() 
            : new Date().toISOString(),
        }));
      }
    }

    // If no messages from history, try resume endpoint
    if (formattedMessages.length === 0) {
      const response = await fetch(getApiUrl(`${API_ENDPOINTS.CHATBOT_RESUME}?user_id=${user.username}`), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.session && data.session.length > 0) {
        formattedMessages = data.session.map((msg: any, index: number) => ({
          id: `${index}_${msg.sender}`,
          text: msg.message,
          sender: msg.sender === 'user' ? 'user' as const : 'bot' as const,
          timestamp: msg.timestamp 
            ? new Date(msg.timestamp).toISOString() 
            : new Date().toISOString(),
        }));
      } else {
        // Start with welcome message if nothing else
        formattedMessages = [{
          id: 'welcome_1',
          text: 'Hello there! I am your personal mood assistant 💬',
          sender: 'bot' as const,
          timestamp: new Date().toISOString(),
        }];
      }
    }

    setMessages(formattedMessages);
  } catch (error) {
    console.error('Failed to resume chat:', error);
    // Fallback welcome + mood prompt
    setMessages([
      {
        id: 'welcome_fallback',
        text: 'Hello there! I am your personal mood assistant 💬',
        sender: 'bot' as const,
        timestamp: new Date().toISOString(),
      },
      {
        id: `mood_prompt_${Date.now()}`,
        text: `Hello! I see you just completed a mood analysis. ${moodPrompt} Let me help you explore and understand your emotional state better.`,
        sender: 'bot' as const,
        timestamp: new Date().toISOString(),
      }
    ]);
  } finally {
    setInitialLoading(false);
  }
};

  // Focus effect - only run if no mood prompt
  useFocusEffect(
    useCallback(() => {
      if (user && !moodPrompt) {
        console.log('Focus effect: resuming normal chat');
        resumeChat();
      }
    }, [user, moodPrompt])
  );

  useFocusEffect(
    useCallback(() => {
      if (user && moodPrompt && !hasmoodPrompt) {
        console.log('Focus effect: starting mood chat');
        startMoodChat();
      } else if (user && !moodPrompt) {
        console.log('Focus effect: resuming normal chat');
        resumeChat();
      }
    }, [user, moodPrompt, hasmoodPrompt])
  );

  const sendMessage = async () => {
    if (input.trim() === '' || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      sender: 'user',
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.CHATBOT_SEND), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.username,
          message: userMessage.text,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Bot response:', data);

      const botReply = data.reply || "Sorry, I didn't understand that.";

      const botMessage: Message = {
        id: (data.message_id || Date.now()).toString() + '_bot',
        text: botReply,
        sender: 'bot',
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Fetch error:', error);
      const errorMessage: Message = {
        id: Date.now().toString() + '_error',
        text: '⚠️ Buddy AI is offline. Please try again later.',
        sender: 'bot',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    if (!user) return;

    try {
      // Start new session with API
      await fetch(getApiUrl(API_ENDPOINTS.CHATBOT_NEW), { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.username }),
      });

      // Reset local messages
      const welcomeMessage = {
        id: 'new_welcome',
        text: 'Hello there! I am your personal mood assistant 💬',
        sender: 'bot' as const,
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error starting new chat:', error);
      Alert.alert('Error', 'Failed to start new chat');
    }
  };

  const startMoodChat = async () => {
  if (!user || !moodPrompt) return;

  try {
    setInitialLoading(true);

    // Start a completely new chat session
    await fetch(getApiUrl(API_ENDPOINTS.CHATBOT_NEW), { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.username }),
    });

    // Create bot welcome message that acknowledges the mood analysis
    const botWelcomeMessage: Message = {
      id: `bot_welcome_${Date.now()}`,
      text: `Hello! I see you just completed a mood analysis. ${moodPrompt} Let me help you explore and understand your emotional state better.`,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };

    // Set the bot message first - bot starts the conversation
    setMessages([botWelcomeMessage]);
  } catch (error) {
    console.error('Failed to start mood chat:', error);
    // Fallback bot message
    const fallbackMessage: Message = {
      id: `bot_fallback_${Date.now()}`,
      text: `Hello! I'm here to help you understand your emotions better. How are you feeling today?`,
      sender: 'bot',
      timestamp: new Date().toISOString(),
    };
    setMessages([fallbackMessage]);
  } finally {
    setInitialLoading(false);
    setLoading(false);
  }
};

// Handle mood prompt as a new chat 
useEffect(() => {
  if (moodPrompt && moodPrompt.trim() !== '' && user && !moodPromptProcessed) {
    console.log('Processing mood prompt as new chat');
    startMoodChat();
    setMoodPromptProcessed(true);
  }
}, [moodPrompt, user, moodPromptProcessed]); 

const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.sender === 'user' ? styles.userBubble : styles.botBubble,
      ]}
    >
      <Text style={[
        styles.messageText,
        item.sender === 'user' ? styles.userMessageText : styles.botMessageText
      ]}>
        {item.text}
      </Text>
      {item.timestamp && (
        <Text style={styles.timestampText}>
          {new Date(item.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Seoul' 
          })}
        </Text>
      )}
    </View>
  );

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#F6D9DC" />
        <ActivityIndicator size="large" color="#814E4A" />
        <Text style={styles.loadingText}>Loading your conversation...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.replace('/home')}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#814E4A" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerText}>BUDDY AI</Text>
          <View style={styles.statusIndicator}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.statusText}>Online</Text>
          </View>
        </View>
        
        {user && (
          <View style={styles.userInfo}>
            <Text style={styles.userText}>Hi, {user.full_name || user.username}!</Text>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.chatWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Chat Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Today Separator */}
        {messages.length > 0 && (
          <View style={styles.todayContainer}>
            <View style={styles.todayLine} />
            <Text style={styles.todayText}>Today</Text>
            <View style={styles.todayLine} />
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.controlButton, styles.newChatButton]}
            onPress={startNewChat}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>NEW CHAT</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, styles.resumeChatButton]}
            onPress={() => {
              resumeChat();
              setHasResumed(true);
  }}
  activeOpacity={0.8}

          >
            <Ionicons name="play-circle-outline" size={16} color="#fff" />
            <Text style={styles.controlButtonText}>RESUME</Text>
          </TouchableOpacity>
        </View>

        {/* Input Container */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              placeholder="Type your message..."
              placeholderTextColor="#999"
              style={styles.input}
              returnKeyType="send"
              editable={!loading}
              multiline
              maxLength={500}
            />
            
            {loading && (
              <View style={styles.loadingIndicator}>
                <ActivityIndicator size="small" color="#814E4A" />
              </View>
            )}
            
            <TouchableOpacity
              onPress={sendMessage}
              disabled={loading || input.trim() === ''}
              style={[
                styles.sendButton,
                (loading || input.trim() === '') && styles.sendButtonDisabled
              ]}
              activeOpacity={0.8}
            >
              <Ionicons 
                name={loading ? "hourglass-outline" : "send"} 
                size={20} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6D9DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6D9DC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#814E4A',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#814E4A',
    letterSpacing: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  chatWrapper: {
    flex: 1,
  },
  chatContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexGrow: 1,
  },
  todayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  todayLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  todayText: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 12,
  },
  messageBubble: {
    padding: 14,
    borderRadius: 18,
    marginVertical: 3,
    maxWidth: '85%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: '#814E4A',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: '#ffffff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#ffffff',
  },
  botMessageText: {
    color: '#333333',
  },
  timestampText: {
    fontSize: 11,
    marginTop: 6,
    alignSelf: 'flex-end',
    opacity: 0.7,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    gap: 6,
  },
  newChatButton: {
    backgroundColor: '#F47D7D',
  },
  resumeChatButton: {
    backgroundColor: '#bb68a3',
  },
  controlButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    maxHeight: 100,
    paddingVertical: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#814E4A',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
});
