import { Feather, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { API_ENDPOINTS, getApiUrl } from '../../config/local'; // Connect with your backend API config

// 🔐 Simple simulated login state
let isLoggedIn = false;

export const setLoggedIn = (value: boolean) => {
  isLoggedIn = value;
};

interface User {
  user_id?: string;
  id?: string;
  username?: string;
  full_name?: string;
  email?: string;
  dob?: string;
}

const ProfileScreen = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");

        if (!storedUser) {
          router.replace('/login');
          return;
        }

        let parsed: User;
        try {
          parsed = JSON.parse(storedUser);
        } catch (e) {
          console.error("Failed to parse stored user", e);
          await AsyncStorage.removeItem("user");
          router.replace('/login');
          return;
        }

        const userId = parsed.user_id || parsed.id || parsed.email;

        if (!userId) {
          await AsyncStorage.removeItem("user");
          router.replace('/login');
          return;
        }

        try {
          const res = await fetch(getApiUrl(`${API_ENDPOINTS.GET_USER}/${userId}`));
          if (res.ok) {
            const data = await res.json();
            setUser(data);
          } else {
            // If API fails, use stored user data
            setUser(parsed);
          }
        } catch (err) {
          console.error("Fetch failed:", err);
          // Use stored user data as fallback
          setUser(parsed);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setLoggedIn(false);
      router.replace('/login');
    } catch (error) {
      console.error("Error during logout:", error);
    }
  };

  // Improved username formatting function
  const getDisplayUsername = () => {
    if (user?.username) {
      return user.username;
    }
    
    if (user?.email) {
      // Extract username from email (part before @)
      return user.email.split('@')[0];
    }
    
    if (user?.user_id && typeof user.user_id === 'string') {
      // If user_id is an email, extract username part
      if (user.user_id.includes('@')) {
        return user.user_id.split('@')[0];
      }
      return user.user_id;
    }
    
    // Fallback
    return 'user';
  };

  // Get display name function
  const getDisplayName = () => {
    if (user?.full_name) {
      return user.full_name;
    }
    
    if (user?.username) {
      return user.username;
    }
    
    if (user?.email) {
      return user.email.split('@')[0];
    }
    
    return 'Guest User';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b0565a" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <Image
          source={require('../../assets/images/avatar.png')}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.name} numberOfLines={2}>
            {getDisplayName()}
          </Text>
          <Text style={styles.username} numberOfLines={1}>
            @{getDisplayUsername()}
          </Text>
          {user?.email && (
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/EditUser')}
          style={styles.editButton}
          activeOpacity={0.7}
        >
          <Feather name="edit-2" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.item} 
          onPress={() => router.push('/EditUser')}
          activeOpacity={0.7}
        >
          <Ionicons name="person-outline" size={24} color="#6c63ff" />
          <View style={styles.itemContent}>
            <Text style={styles.title}>My Account</Text>
            <Text style={styles.subtitle}>Make changes to your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.item} activeOpacity={0.7}>
          <Feather name="shield" size={24} color="#6c63ff" />
          <View style={styles.itemContent}>
            <Text style={styles.title}>Two-Factor Authentication</Text>
            <Text style={styles.subtitle}>Secure your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.item, styles.lastItem]} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <MaterialIcons name="logout" size={24} color="#ff4757" />
          <View style={styles.itemContent}>
            <Text style={[styles.title, { color: '#ff4757' }]}>Log out</Text>
            <Text style={styles.subtitle}>See you again soon!</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.item} activeOpacity={0.7}>
          <Ionicons name="help-circle-outline" size={24} color="#6c63ff" />
          <View style={styles.itemContent}>
            <Text style={styles.title}>Help & Support</Text>
            <Text style={styles.subtitle}>Get help when you need it</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.item, styles.lastItem]} activeOpacity={0.7}>
          <Ionicons name="information-circle-outline" size={24} color="#6c63ff" />
          <View style={styles.itemContent}>
            <Text style={styles.title}>About App</Text>
            <Text style={styles.subtitle}>Version 1.0.0</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fbdde7',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fbdde7',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  profileCard: {
    backgroundColor: '#b0565a',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  avatar: {
    width: 100,
    height: 100,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  username: {
    color: '#f9d9d9',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  email: {
    color: '#f9d9d9',
    fontSize: 12,
    opacity: 0.8,
  },
  editButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    padding: 8,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
  },
});
