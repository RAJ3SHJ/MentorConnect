import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function QuantumLoginScreen({ navigation }) {
    const { login } = useAuth();
    const toast = useToast();
    const [role, setRole] = useState('admin'); // 'admin' or 'mentor'
    const [pin, setPin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    // Dynamic styles based on role
    const isAd = role === 'admin';
    const activeColor = isAd ? '#00f260' : '#00d2ff'; // Emerald vs Electric Blue
    const bgColors = isAd ? ['#051c14', '#0a2e22'] : ['#02101f', '#061c36'];
    const glowPos = isAd ? { right: -50, top: -50 } : { left: -50, bottom: -50 };

    const handleLogin = async () => {
        if (!pin || pin.length < 4) {
            toast.show('Please enter a 4-digit PIN', 'error');
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.post('/api/auth/quantum-login', { pin, role });
            await login(data.token, data.user);
        } catch (err) {
            console.error('Quantum Login Error:', err);
            let msg = err.response?.data?.error || err.message || 'Access Denied';
            if (err.message === 'Network Error') {
                msg = '🔌 Connection Error: Cannot reach server. Please check your Render logs.';
            }
            toast.show(msg, 'error');
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={s.container}>
            <LinearGradient colors={bgColors} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glowOrb, { backgroundColor: activeColor, ...glowPos }]} />

            <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                
                {/* Segmented Control */}
                <View style={s.segmentContainer}>
                    <TouchableOpacity 
                        style={[s.segmentBtn, isAd && { backgroundColor: 'rgba(255,255,255,0.08)' }]} 
                        onPress={() => { setRole('admin'); setPin(''); }}
                    >
                        <Text style={{ fontSize: 18, marginBottom: 4 }}>🛡️</Text>
                        <Text style={[s.segmentText, isAd && { color: '#00f260', fontWeight: '800' }]}>Admin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[s.segmentBtn, !isAd && { backgroundColor: 'rgba(255,255,255,0.08)' }]} 
                        onPress={() => { setRole('mentor'); setPin(''); }}
                    >
                        <Text style={{ fontSize: 18, marginBottom: 4 }}>👨‍🏫</Text>
                        <Text style={[s.segmentText, !isAd && { color: '#00d2ff', fontWeight: '800' }]}>Mentor</Text>
                    </TouchableOpacity>
                </View>

                {/* Title */}
                <Text style={s.title}>{isAd ? 'System Administrator' : 'Mentor Command Center'}</Text>
                <Text style={s.subtitle}>Enter 4-digit secure PIN to continue</Text>

                {/* PIN Input */}
                <TextInput
                    style={[s.pinInput, { borderColor: `${activeColor}4D` }]}
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                    placeholder="••••"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    value={pin}
                    onChangeText={setPin}
                    autoFocus
                />

                {/* Submit */}
                <TouchableOpacity onPress={handleLogin} disabled={loading} style={s.submitBtn}>
                    <LinearGradient colors={isAd ? ['#00f260', '#0575e6'] : ['#00d2ff', '#3a7bd5']} style={s.gradientBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Authenticate ➔</Text>}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 24 }}>
                    <Text style={s.backText}>Cancel Request</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
    glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, filter: 'blur(100px)', opacity: 0.15 },
    glassCard: { width: '90%', maxWidth: 420, padding: 32, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center' },
    
    segmentContainer: { flexDirection: 'row', width: '100%', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 6, marginBottom: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
    segmentText: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
    
    title: { color: '#fff', fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginBottom: 8, textAlign: 'center' },
    subtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginBottom: 32, textAlign: 'center' },

    pinInput: {
        width: '100%',
        height: 72,
        fontSize: 24,
        color: '#fff',
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 32,
        letterSpacing: 10,
        backgroundColor: 'rgba(255,255,255,0.03)'
    },
    
    label: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    textInput: { width: '100%', height: 56, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)', color: '#fff', fontSize: 16, paddingHorizontal: 16 },

    submitBtn: { width: '100%', shadowColor: '#00d2ff', shadowOffset: {width:0, height:8}, shadowOpacity: 0.3, shadowRadius: 20 },
    gradientBtn: { width: '100%', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1, textTransform: 'uppercase' },

    backText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecorationLine: 'underline' }
});
