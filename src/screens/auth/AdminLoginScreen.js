import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginScreen({ navigation }) {
    const { colors, gradients } = useTheme();
    const { login } = useAuth();
    const toast = useToast();
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const submitPasscode = async (passcode) => {
        if (passcode.length !== 4) return;
        setLoading(true);
        try {
            const res = await api.post('/api/auth/admin-login', { passcode });
            toast.show('Admin authentication successful', 'success');
            login(res.data.token, res.data.user);
        } catch (e) {
            toast.show(e.response?.data?.error || 'Invalid passcode', 'error');
            setCode('');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (text) => {
        const clean = text.replace(/[^0-9]/g, '').slice(0, 4);
        setCode(clean);
        if (clean.length === 4) {
            submitPasscode(clean);
        }
    };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                <Text style={{ color: colors.muted, fontSize: 16 }}>← Back to Login</Text>
            </TouchableOpacity>

            <View style={[s.orb, { backgroundColor: colors.gold }]} />
            <Text style={s.icon}>🔐</Text>
            <Text style={[s.title, { color: colors.white }]}>Admin Portal</Text>
            <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 32 }}>Enter 4-digit security pin</Text>

            <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                style={[s.hiddenInput, { color: colors.white, borderColor: colors.glassBorder, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                placeholder="Type pin..."
                placeholderTextColor={colors.muted}
                editable={!loading}
            />

            {loading && <ActivityIndicator size="large" color={colors.gold} style={{ marginBottom: 20 }} />}
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    backBtn: { position: 'absolute', top: 50, left: 24, padding: 8 },
    orb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, opacity: 0.04, top: 50 },
    icon: { fontSize: 52, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
    hiddenInput: {
        width: 200, textAlign: 'center', fontSize: 24, fontWeight: '700',
        letterSpacing: 12, borderRadius: 14, borderWidth: 1,
        paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20,
    },
});
