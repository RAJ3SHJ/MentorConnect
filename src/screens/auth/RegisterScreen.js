import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function RegisterScreen({ navigation }) {
    const { login } = useAuth();
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
        if (!password) e.password = 'Password is required';
        else if (password.length < 4) e.password = 'Must be at least 4 characters';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleRegister = async () => {
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await api.post('/api/auth/register', { name, email, password });
            toast.show('Account created! 🎉 Welcome aboard!', 'success');
            login(res.data.token, res.data.user);
        } catch (e) {
            console.error('Registration Error:', e);
            let msg = e.response?.data?.error || 'Registration failed';
            if (e.message === 'Network Error') {
                msg = '🔌 Connection Error: Cannot reach server. Please ensure your EXPO_PUBLIC_API_URL is correct in Vercel/Netlify.';
            }
            toast.show(msg, 'error');
        } finally { setLoading(false); }
    };

    const clearError = (field) => { if (errors[field]) setErrors(e => ({ ...e, [field]: null })); };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
                    <View style={[s.orb1, { backgroundColor: colors.blue }]} />
                    <View style={[s.orb2, { backgroundColor: colors.purple }]} />
                    <View style={s.inner}>
                        <Text style={{ fontSize: 40, marginBottom: 16 }}>🎓</Text>
                        <Text style={[s.title, { color: colors.white }]}>Create Account</Text>
                        <Text style={[s.subtitle, { color: colors.muted }]}>Start your learning journey</Text>

                        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            <Text style={[s.label, { color: colors.muted }]}>FULL NAME</Text>
                            <TextInput style={[s.input, { borderColor: errors.name ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="John Doe" placeholderTextColor={colors.muted}
                                value={name} onChangeText={t => { setName(t); clearError('name'); }} />
                            {errors.name && <Text style={[s.error, { color: colors.danger }]}>⚠ {errors.name}</Text>}

                            <Text style={[s.label, { color: colors.muted }]}>EMAIL</Text>
                            <TextInput style={[s.input, { borderColor: errors.email ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="you@example.com" placeholderTextColor={colors.muted}
                                value={email} onChangeText={t => { setEmail(t); clearError('email'); }}
                                autoCapitalize="none" keyboardType="email-address" />
                            {errors.email && <Text style={[s.error, { color: colors.danger }]}>⚠ {errors.email}</Text>}

                            <Text style={[s.label, { color: colors.muted }]}>PASSWORD</Text>
                            <TextInput style={[s.input, { borderColor: errors.password ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="Min 4 characters" placeholderTextColor={colors.muted}
                                value={password} onChangeText={t => { setPassword(t); clearError('password'); }}
                                secureTextEntry autoComplete="password" textContentType="password" />
                            {errors.password && <Text style={[s.error, { color: colors.danger }]}>⚠ {errors.password}</Text>}

                            <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
                                <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btn}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnText}>Create Account →</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[s.link, { color: colors.muted }]}>Already have an account? <Text style={{ color: colors.blue, fontWeight: '700' }}>Login</Text></Text>
                        </TouchableOpacity>
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
