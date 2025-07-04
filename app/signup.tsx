import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { API_ENDPOINTS, getApiUrl } from '../config/local'; // connect with your backend API config

const SignupPage: React.FC = () => {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateDate = (dateString: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    const minAge = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    return date <= minAge && date >= new Date('1900-01-01');
  };

  const handleSignup = async () => {
    // Validation
    if (!username.trim() || !fullName.trim() || !email.trim() || !dob.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields.');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long.');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    if (!validateDate(dob)) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD) ');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match!');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        username: username.trim(),
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        dob: dob.trim(),
        password,
      };

      console.log('Sending data:', { ...requestData, password: '[HIDDEN]' }); // For debugging
      const response = await fetch(getApiUrl(API_ENDPOINTS.SIGNUP), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Set loading to false first, then show alert
        setLoading(false);
        
        // Use setTimeout to ensure alert shows after state update
        setTimeout(() => {
          Alert.alert(
            'Success', 
            'Account created successfully! Please login.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/login')
              }
            ]
          );
        }, 100);
      } else {
        const errorData = await response.json();
        console.log('Error details:', errorData);
        
        let errorMessage = 'Unknown error occurred';
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => err.msg || err).join('\n');
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        Alert.alert('Sign-up Failed', errorMessage);
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter username (min 3 characters)"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            autoCapitalize="words"
            maxLength={50}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Enter email address"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
            maxLength={100}
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD (e.g., 1990-12-25)"
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter password "
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
          </View>

          <TouchableOpacity 
            style={[styles.signupButton, loading && styles.disabledButton]} 
            onPress={handleSignup} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Creating Account...</Text>
              </View>
            ) : (
              <Text style={styles.signupButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.loginText}>
            Already have an account?{' '}
            <Text style={styles.loginLink} onPress={() => router.push('/login')}>
              Login
            </Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#ffe6ec',
    minHeight: '100%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#e88f8f',
    marginBottom: 20,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e88f8f',
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 8,
  },
  signupButton: {
    backgroundColor: '#e88f8f',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#ccc',
    elevation: 0,
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  loginText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
  },
  loginLink: {
    color: '#e88f8f',
    fontWeight: 'bold',
  },
});

export default SignupPage;
