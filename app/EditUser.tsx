import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

interface UserForm {
  username: string;
  fullName: string;
  email: string;
  dob: string;
  password: string;
}

interface User {
  username: string;
  full_name: string;
  email: string;
  dob: string;
}

const EditUser = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<UserForm>({
    username: '',
    fullName: '',
    email: '',
    dob: '',
    password: '',
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setForm({
            username: parsed.username || '',
            fullName: parsed.full_name || parsed.fullName || '',
            email: parsed.email || '',
            dob: parsed.dob || '',
            password: '', // don't pre-fill password for security
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
        Alert.alert('Error', 'Failed to load user data');
      }
    };
    loadUser();
  }, []);

  const handleChange = (key: keyof UserForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateDate = (dateString: string) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    const today = new Date();
    const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    
    return date <= minAge && date >= new Date('1900-01-01');
  };

  const handleUpdateProfile = async () => {
    // Validation
    if (!form.username.trim() || !form.fullName.trim() || !form.email.trim() || !form.dob.trim()) {
      Alert.alert('Error', 'Please fill all fields (password is optional)');
      return;
    }

    if (form.username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters long');
      return;
    }

    if (!validateEmail(form.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!validateDate(form.dob)) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD) and you must be at least 13 years old');
      return;
    }

    if (form.password && form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      // Prepare payload, only send password if changed
      const payload: any = {
        username: form.username.trim(),
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        dob: form.dob.trim(),
      };
      
      if (form.password.trim()) {
        payload.password = form.password;
      }

      // Call your backend API to update user info
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(getApiUrl(API_ENDPOINTS.EDIT_USER), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Update AsyncStorage user data locally
        const updatedUserData = {
          username: updatedUser.username,
          full_name: updatedUser.full_name,
          email: updatedUser.email,
          dob: updatedUser.dob,
          // Keep backward compatibility
          fullName: updatedUser.full_name,
        };
        
        await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
        setUser(updatedUserData);
        
        Alert.alert(
          'Success', 
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back()
            }
          ]
        );
      } else {
        const errorData = await response.json();
        let errorMessage = 'Could not update profile';
        
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail.map((err: any) => err.msg || err).join('\n');
          } else {
            errorMessage = errorData.detail;
          }
        }
        
        Alert.alert('Update Failed', errorMessage);
      }
    } catch (error) {
      console.error('Update error:', error);
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <Image
            source={require('../assets/images/avatar.png')}
            style={styles.avatar}
          />
          <Text style={styles.name}>{user?.full_name || 'Loading...'}</Text>
          <Text style={styles.email}>{user?.email || 'Loading...'}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter username"
            placeholderTextColor="#888"
            value={form.username}
            onChangeText={(value) => handleChange('username', value)}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
          />

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#888"
            value={form.fullName}
            onChangeText={(value) => handleChange('fullName', value)}
            autoCapitalize="words"
            maxLength={50}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter email address"
            keyboardType="email-address"
            placeholderTextColor="#888"
            value={form.email}
            onChangeText={(value) => handleChange('email', value)}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
          />

          <Text style={styles.label}>Date of Birth</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g., 1990-12-25)"
            placeholderTextColor="#888"
            value={form.dob}
            onChangeText={(value) => handleChange('dob', value)}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={styles.label}>New Password (Optional)</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="(leave blank to keep password)"
              placeholderTextColor="#888"
              value={form.password}
              onChangeText={(value) => handleChange('password', value)}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={50}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.disabledButton]} 
            onPress={handleUpdateProfile}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.loadingText}>Updating...</Text>
              </View>
            ) : (
              <Text style={styles.buttonText}>Update Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditUser;

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fbdde7',
    alignItems: 'center',
    padding: 20,
    paddingTop: 5,
    minHeight: '100%',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 50,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#888',
  },
  form: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    backgroundColor: '#e88f8f',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
    borderRadius: 8,
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
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backButton: {
    marginTop: 10,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backText: {
    color: '#e88f8f',
    fontSize: 16,
    fontWeight: '500',
  },
});
