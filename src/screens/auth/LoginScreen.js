import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function LoginScreen({ navigation }) {
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
            // Backend /api/auth/login handles both email and username under the 'email' key for compatibility
            const res = await api.post('/api/auth/login', { email: username, password });
            toast.show('Welcome back! 👋', 'success');
            login(res.data.token, res.data.user);
        } catch (e) {
            console.error('Login Error:', e);
            let msg = e.response?.data?.error || 'Login failed';
            if (e.message === 'Network Error') {
                msg = '🔌 Connection Error: Cannot reach server. Please check your internet or API settings.';
            }
            toast.show(msg, 'error');
        } finally { setLoading(false); }
    };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
                    <View style={[s.orb1, { backgroundColor: colors.blue }]} />
                    <View style={[s.orb2, { backgroundColor: colors.purple }]} />
                    <View style={s.inner}>
                        <Text style={{ fontSize: 40, marginBottom: 16 }}>👋</Text>
                        <Text style={[s.title, { color: colors.white }]}>Welcome Back</Text>
                        <Text style={[s.subtitle, { color: colors.muted }]}>Login to continue learning</Text>

                        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            <Text style={[s.label, { color: colors.muted }]}>USERNAME</Text>
                            <TextInput style={[s.input, { borderColor: errors.username ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="Enter your username" placeholderTextColor={colors.muted}
                                value={username} onChangeText={t => { setUsername(t); if (errors.username) setErrors(e => ({ ...e, username: null })); }}
                                autoCapitalize="none" />
                            {errors.username && <Text style={[s.error, { color: colors.danger }]}>⚠ {errors.username}</Text>}

                            <Text style={[s.label, { color: colors.muted }]}>PASSWORD</Text>
                            <TextInput style={[s.input, { borderColor: errors.password ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="••••••••" placeholderTextColor={colors.muted}
                                value={password} onChangeText={t => { setPassword(t); if (errors.password) setErrors(e => ({ ...e, password: null })); }}
                                secureTextEntry autoComplete="password" textContentType="password" />
                            {errors.password && <Text style={[s.error, { color: colors.danger }]}>⚠ {errors.password}</Text>}

                            <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                                <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Login →</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>



                        <View style={{ flexDirection: 'row', marginTop: 32, alignItems: 'center' }}>
                            <TouchableOpacity onPress={() => navigation.navigate('AdminLogin')}>
                                <Text style={{ color: '#00f260', fontSize: 14, fontWeight: '700' }}>Admin Login</Text>
                            </TouchableOpacity>
                            <Text style={{ color: colors.muted, marginHorizontal: 12 }}>|</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('MentorLogin')}>
                                <Text style={{ color: '#00d2ff', fontSize: 14, fontWeight: '700' }}>Mentor Login</Text>
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
    orb1: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.04, top: 40, right: -30 },
    orb2: { position: 'absolute', width: 180, height: 180, borderRadius: 90, opacity: 0.04, bottom: 80, left: -40 },
    inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 15, marginBottom: 32 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 24, width: '100%', maxWidth: 400 },
    label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
    error: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    btn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    link: { marginTop: 24, fontSize: 14 },
});
