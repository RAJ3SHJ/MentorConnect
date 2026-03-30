import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';
import { useTheme } from '../../ThemeContext';

export default function AdminLoginScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { login } = useAuth();
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!pin || pin.length < 4) {
            toast.show('Please enter a 4-digit PIN', 'error');
            return;
        }
        setLoading(true);
        try {
            // Updated endpoint to reflect new auth architecture
            const { data } = await api.post('/api/auth/quantum-login', { pin, role: 'admin' });
            await login(data.token, { ...data.user, isAdmin: true });
            toast.show('Executive access granted. Welcome, Admin.', 'success');
        } catch (err) {
            console.error('Admin Login Error:', err);
            let msg = err.response?.data?.error || err.message || 'Access Denied';
            toast.show(msg, 'error');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <LinearGradient colors={['#051c14', '#0a2e22']} style={s.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
                    <View style={[s.glowOrb, { backgroundColor: '#00f260', right: -50, top: -50 }]} />
                    
                    <View style={s.inner}>
                        <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                            <View style={s.iconBox}>
                                <Text style={{ fontSize: 40 }}>🛡️</Text>
                            </View>
                            <Text style={s.title}>Executive Pulse</Text>
                            <Text style={s.subtitle}>Enter 4-digit secure PIN for administrative entry</Text>

                            <TextInput
                                style={[s.pinInput, { borderColor: 'rgba(0,242,96,0.3)' }]}
                                keyboardType="numeric"
                                secureTextEntry
                                maxLength={4}
                                placeholder="••••"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={pin}
                                onChangeText={setPin}
                                autoFocus
                            />

                            <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.submitBtn}>
                                <LinearGradient colors={['#00f260', '#0575e6']} style={s.gradientBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Authenticate ➔</Text>}
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
    glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
    inner: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    glassCard: { 
        width: '100%', 
        maxWidth: 420, 
        padding: 40, 
        borderRadius: 32, 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.08)', 
        alignItems: 'center' 
    },
    iconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(0,242,96,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32, textAlign: 'center', lineHeight: 20 },
    pinInput: {
        width: '100%',
        height: 80,
        fontSize: 32,
        color: '#fff',
        fontWeight: '900',
        textAlign: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 32,
        letterSpacing: 20,
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    submitBtn: { width: '100%' },
    gradientBtn: { width: '100%', paddingVertical: 20, borderRadius: 20, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },
    backText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecorationLine: 'underline' }
});

