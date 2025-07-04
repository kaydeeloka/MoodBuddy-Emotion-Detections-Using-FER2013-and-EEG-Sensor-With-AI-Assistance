// utils/userStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'user';

export const UserStorage = {
  async setUser(userData: any) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      console.log('User data saved successfully');
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  },

  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async updateUser(updatedData: any) {
    try {
      const currentUser = await this.getUser();
      if (currentUser) {
        const mergedData = { ...currentUser, ...updatedData };
        await this.setUser(mergedData);
        console.log('User data updated successfully');
        return mergedData;
      }
      throw new Error('No user data found to update');
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  },

  async removeUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      console.log('User data removed successfully');
    } catch (error) {
      console.error('Error removing user data:', error);
      throw error;
    }
  }
};
