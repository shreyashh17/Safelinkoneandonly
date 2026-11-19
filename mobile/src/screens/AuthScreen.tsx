import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet,
    KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }: any) {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async () => {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = name.trim();
        const cleanPhone = phone.trim();

        if (!cleanEmail || !password) {
            Alert.alert('Missing Fields', 'Email and password are required');
            return;
        }

        if (!isLogin) {
            if (!cleanName) {
                Alert.alert('Missing Name', 'Please enter your full name');
                return;
            }
            if (password.length < 6) {
                Alert.alert('Password Too Short', 'Password must be at least 6 characters');
                return;
            }
            if (password !== confirmPassword) {
                Alert.alert('Mismatch', 'Passwords do not match');
                return;
            }
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(cleanEmail, password);
            } else {
                await register(cleanName, cleanEmail, password, cleanPhone);
            }
        } catch (e: any) {
            const errorMsg = e?.response?.data?.error || e.message || 'Authentication failed. Please check your connection.';
            Alert.alert(isLogin ? 'Login Failed' : 'Registration Failed', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Text style={styles.logoIcon}>🛡️</Text>
                    <Text style={styles.appName}>SafeLink</Text>
                    <Text style={styles.tagline}>Real-Time Emergency Lifeline</Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
                    <Text style={styles.subtitle}>
                        {isLogin ? 'Sign in to access emergency assistance' : 'Register for fast 1-tap SOS and alert access'}
                    </Text>

                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#778099"
                            value={name}
                            onChangeText={setName}
                        />
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Email Address"
                        placeholderTextColor="#778099"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    <View style={styles.passwordWrapper}>
                        <TextInput
                            style={[styles.input, styles.passwordInput]}
                            placeholder="Password"
                            placeholderTextColor="#778099"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity
                            style={styles.eyeBtn}
                            onPress={() => setShowPassword(!showPassword)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                        </TouchableOpacity>
                    </View>

                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password"
                            placeholderTextColor="#778099"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            autoCapitalize="none"
                        />
                    )}

                    {!isLogin && (
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (Optional)"
                            placeholderTextColor="#778099"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    )}

                    <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? 'Sign In →' : 'Create Account →'}</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => {
                            setIsLogin(!isLogin);
                            setPassword('');
                            setConfirmPassword('');
                        }}>
                        <Text style={styles.switchText}>
                            {isLogin ? "Don't have an account? " : 'Already have an account? '}
                            <Text style={styles.switchLink}>{isLogin ? 'Register' : 'Sign In'}</Text>
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E1A' },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    logoContainer: { alignItems: 'center', marginBottom: 28 },
    logoIcon: { fontSize: 58 },
    appName: { fontSize: 36, fontWeight: '800', color: '#FF3B3B', letterSpacing: 2 },
    tagline: { fontSize: 14, color: '#888', marginTop: 4 },
    card: {
        backgroundColor: '#151928',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        borderColor: '#252c43',
        shadowColor: '#000',
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
    subtitle: { fontSize: 13, color: '#888', marginBottom: 20 },
    input: {
        backgroundColor: '#1E2438',
        borderRadius: 12,
        padding: 14,
        color: '#fff',
        fontSize: 15,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#2A3050',
    },
    passwordWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },
    passwordInput: {
        paddingRight: 50,
    },
    eyeBtn: {
        position: 'absolute',
        right: 14,
        top: 14,
        zIndex: 10,
    },
    eyeText: {
        fontSize: 18,
    },
    button: {
        backgroundColor: '#FF3B3B',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginTop: 6,
    },
    buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    switchText: { textAlign: 'center', color: '#888', marginTop: 18, fontSize: 14 },
    switchLink: { color: '#FF3B3B', fontWeight: '700' },
});
