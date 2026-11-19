import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveBaseUrl(): string {
    // 1. Explicit env variable
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // 2. Web browser
    if (Platform.OS === 'web') {
        return 'http://localhost:5000';
    }

    // 3. Expo Go dynamically detected host IP
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip && ip !== 'localhost') {
            return `http://${ip}:5000`;
        }
    }

    // 4. Android emulator
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000';
    }

    // 5. Fallback LAN IP
    return 'http://192.168.1.27:5000';
}

export const API_BASE_URL = resolveBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
});

api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
