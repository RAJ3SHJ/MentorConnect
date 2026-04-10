import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../ThemeContext';
import { supabase } from '../../api/supabase';

export default function MentorLoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!username.trim()) e.username = 'Username is required';
        if (!password) e.password = 'Password is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleLogin = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { email: username, password });
            const { token, user } = res.data;
            
            // Successfully authenticated via centralized backend
            await login(token, user);
            toast.show(`Welcome back, ${user.name || 'Mentor'}! 👋`, 'success');
        } catch (err) {
            console.error('Mentor Login Error:', err.message);
            const msg = err.response?.data?.error || err.message || 'Login failed';
            toast.show(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#02101f', '#061c36']} style={s.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
                    <View style={[s.glowOrb, { backgroundColor: '#00d2ff', left: -50, bottom: -50 }]} />
                    
                    <View style={s.inner}>
                        <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                            <Text style={{ fontSize: 40, marginBottom: 16 }}>👨‍🏫</Text>
                            <Text style={s.title}>Mentor Portal</Text>
                            <Text style={s.subtitle}>Sign in with your professional credentials</Text>

                            <View style={s.inputContainer}>
                                <Text style={s.label}>USERNAME</Text>
                                <TextInput
                                    style={[s.input, { borderColor: errors.username ? '#ff4757' : 'rgba(0,210,255,0.2)' }]}
                                    autoCapitalize="none"
                                    placeholder="Enter your username"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                                {errors.username && <Text style={s.errorText}>⚠ {errors.username}</Text>}

                                <Text style={[s.label, { marginTop: 20 }]}>PASSWORD</Text>
                                <TextInput
                                    style={[s.input, { borderColor: errors.password ? '#ff4757' : 'rgba(0,210,255,0.2)' }]}
                                    secureTextEntry
                                    placeholder="••••••••"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={password}
                                    onChangeText={setPassword}
                                />
                                {errors.password && <Text style={s.errorText}>⚠ {errors.password}</Text>}
                            </View>

                            <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.submitBtn}>
                                <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={s.gradientBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Access Command Center ➔</Text>}
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
                                <Text style={s.backText}>Cancel Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.1 },
    inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    glassCard: { 
        width: '100%', 
        maxWidth: 420, 
        padding: 32, 
        borderRadius: 24, 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.08)', 
        alignItems: 'center' 
    },
    inputContainer: { width: '100%', marginBottom: 32 },
    title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32, textAlign: 'center' },
    label: { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
    input: {
        width: '100%',
        height: 56,
        color: '#fff',
        fontSize: 15,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255,255,255,0.02)'
    },
    errorText: { color: '#ff4757', fontSize: 12, marginTop: 4, fontWeight: '600' },
    submitBtn: { width: '100%' },
    gradientBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
    backText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecorationLine: 'underline' }
});
