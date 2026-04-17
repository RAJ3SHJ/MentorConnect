import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../ThemeContext';

export default function MentorLoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const { colors, gradients } = useTheme();
    const toast = useToast();

    // Toggle between email/password and PIN login
    const [mode, setMode] = useState('pin'); // 'pin' | 'email'

    // Email login state
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // PIN login state
    const [pin, setPin] = useState('');

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleEmailLogin = async () => {
        const e = {};
        if (!username.trim()) e.username = 'Email or username is required';
        if (!password) e.password = 'Password is required';
        setErrors(e);
        if (Object.keys(e).length > 0) return;

        setLoading(true);
        try {
            const res = await api.post('/api/auth/login', { email: username, password });
            const { token, user } = res.data;
            if (user.role !== 'mentor') {
                toast.show('This portal is for mentors only.', 'error');
                return;
            }
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

    const handlePinLogin = async () => {
        if (!pin || pin.length < 4) {
            toast.show('Please enter the 4-digit mentor PIN', 'error');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/quantum-login', { pin, role: 'mentor' });
            await login(data.token, data.user);
            toast.show('Welcome, Mentor! 👨‍🏫', 'success');
        } catch (err) {
            const msg = err.response?.data?.error || 'Invalid PIN';
            toast.show(msg, 'error');
            setPin('');
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
                            <Text style={s.subtitle}>Sign in to access your dashboard</Text>

                            {/* Mode Toggle */}
                            <View style={s.modeToggle}>
                                <TouchableOpacity
                                    style={[s.modeBtn, mode === 'pin' && s.modeBtnActive]}
                                    onPress={() => { setMode('pin'); setErrors({}); }}
                                >
                                    <Text style={[s.modeBtnText, mode === 'pin' && s.modeBtnTextActive]}>🔑 PIN Login</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.modeBtn, mode === 'email' && s.modeBtnActive]}
                                    onPress={() => { setMode('email'); setErrors({}); }}
                                >
                                    <Text style={[s.modeBtnText, mode === 'email' && s.modeBtnTextActive]}>✉️ Email Login</Text>
                                </TouchableOpacity>
                            </View>

                            {mode === 'pin' ? (
                                /* ── PIN Login ── */
                                <View style={s.inputContainer}>
                                    <Text style={s.label}>MENTOR PIN</Text>
                                    <TextInput
                                        style={s.pinInput}
                                        keyboardType="numeric"
                                        secureTextEntry
                                        maxLength={4}
                                        placeholder="••••"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        value={pin}
                                        onChangeText={setPin}
                                        autoFocus
                                    />
                                    <Text style={s.pinHint}>Enter the 4-digit shared mentor PIN</Text>
                                </View>
                            ) : (
                                /* ── Email Login ── */
                                <View style={s.inputContainer}>
                                    <Text style={s.label}>EMAIL</Text>
                                    <TextInput
                                        style={[s.input, { borderColor: errors.username ? '#ff4757' : 'rgba(0,210,255,0.2)' }]}
                                        autoCapitalize="none"
                                        placeholder="Enter your email"
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        value={username}
                                        onChangeText={setUsername}
                                        keyboardType="email-address"
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
                            )}

                            <TouchableOpacity
                                onPress={mode === 'pin' ? handlePinLogin : handleEmailLogin}
                                disabled={loading}
                                style={s.submitBtn}
                            >
                                <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={s.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Sign In ➔</Text>}
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
    inputContainer: { width: '100%', marginBottom: 24 },
    title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 24, textAlign: 'center' },

    modeToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, marginBottom: 28, width: '100%' },
    modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    modeBtnActive: { backgroundColor: 'rgba(0,210,255,0.15)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)' },
    modeBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700' },
    modeBtnTextActive: { color: '#00d2ff' },

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
    pinInput: {
        width: '100%',
        height: 80,
        fontSize: 36,
        color: '#fff',
        fontWeight: '900',
        textAlign: 'center',
        letterSpacing: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(0,210,255,0.3)',
        backgroundColor: 'rgba(0,210,255,0.03)',
        marginBottom: 8,
    },
    pinHint: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center' },
    errorText: { color: '#ff4757', fontSize: 12, marginTop: 4, fontWeight: '600' },
    submitBtn: { width: '100%' },
    gradientBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 1, textTransform: 'uppercase' },
    backText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecorationLine: 'underline' }
});
