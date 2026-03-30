import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function AddMentorScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const editMentor = route.params?.editMentor;
    const isEdit = !!editMentor;
    const { colors, gradients } = useTheme();
    const toast = useToast();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [expertise, setExpertise] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (editMentor) {
            setName(editMentor.name || '');
            setEmail(editMentor.email || '');
            setExpertise(editMentor.expertise || '');
        }
    }, [editMentor]);

    const validate = () => {
        const errs = {};
        if (!name.trim()) errs.name = 'Full Name is required';
        if (!email.trim()) errs.email = 'Email address is required';
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid professional email';
        
        if (!isEdit) {
            if (!password) errs.password = 'Initial password is required';
            else if (password.length < 6) errs.password = 'Security policy: Min 6 characters';
            if (password !== confirmPassword) errs.confirmPassword = 'Passwords mismatch';
        }
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            if (isEdit) {
                // Update existing profile (id is fixed UUID now)
                await api.put(`/api/admin/mentors/${editMentor.id}`, { name, email, expertise, password: password || undefined });
                toast.show('Mentor profile synchronized successfully ✅', 'success');
                setTimeout(() => navigation.goBack(), 1000);
            } else {
                // HIGH PRIVILEGE PROVISIONING: Call the server to create Auth user and Profile
                const { data } = await api.post('/api/admin/create-mentor', { 
                    name, 
                    email: email.toLowerCase(), 
                    password, 
                    expertise 
                });
                
                toast.show(`Identity Provisioned: ${name} is now active 🎉`, 'success');
                // Auto-clear or go back
                setTimeout(() => navigation.goBack(), 1500);
            }
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Provisioning failed';
            toast.show(msg, 'error');
            console.error('Provisioning Error:', msg);
        } finally { setSaving(false); }
    };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView 
                    contentContainerStyle={[s.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={s.header}>
                        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                            <Text style={{ color: colors.muted, fontSize: 18 }}>←</Text>
                        </TouchableOpacity>
                        <View>
                            <Text style={[s.title, { color: colors.white }]}>
                                {isEdit ? 'Provisioning Profile' : 'Onboard Mentor'}
                            </Text>
                            <Text style={[s.subtitle, { color: colors.muted }]}>
                                {isEdit ? `Modifying identity for ${editMentor.name}` : 'Provision a new cloud identity for your team'}
                            </Text>
                        </View>
                    </View>

                    {/* Identity Details Card */}
                    <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.sectionHeader}>
                            <View style={[s.iconBox, { backgroundColor: colors.blue + '15' }]}>
                                <Text style={{ fontSize: 20 }}>👤</Text>
                            </View>
                            <Text style={[s.sectionTitle, { color: colors.white }]}>Identity Details</Text>
                        </View>

                        <Text style={s.label}>FULL PROFESSIONAL NAME</Text>
                        <TextInput
                            style={[s.input, errors.name && s.inputError]}
                            placeholder="e.g. Sarah Connor"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={name}
                            onChangeText={setName}
                        />

                        <Text style={[s.label, { marginTop: 20 }]}>PROVISIONED EMAIL (LOGIN)</Text>
                        <TextInput
                            style={[s.input, errors.email && s.inputError]}
                            placeholder="mentor@mentorpath.com"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />

                        <Text style={[s.label, { marginTop: 20 }]}>DOMAIN EXPERTISE</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Full Stack, AI, AWS"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={expertise}
                            onChangeText={setExpertise}
                        />
                    </View>

                    {/* Security Credentials Card */}
                    <View style={[s.glassCard, { marginTop: 20 }]}>
                        <View style={s.sectionHeader}>
                            <View style={[s.iconBox, { backgroundColor: '#00f26015' }]}>
                                <Text style={{ fontSize: 20 }}>🔐</Text>
                            </View>
                            <Text style={[s.sectionTitle, { color: colors.white }]}>Security Credentials</Text>
                        </View>

                        <Text style={s.label}>{isEdit ? 'UPDATE PASSWORD (OPTIONAL)' : 'INITIAL PASSWORD'}</Text>
                        <View style={{ position: 'relative' }}>
                            <TextInput
                                style={[s.input, errors.password && s.inputError]}
                                placeholder="Min 6 characters"
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                            />
                            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                                <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                            </TouchableOpacity>
                        </View>

                        {!isEdit && (
                            <>
                                <Text style={[s.label, { marginTop: 20 }]}>CONFIRM PASSWORD</Text>
                                <TextInput
                                    style={[s.input, errors.confirmPassword && s.inputError]}
                                    placeholder="Re-type for security"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showPassword}
                                />
                            </>
                        )}
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity 
                        onPress={save} 
                        disabled={saving} 
                        activeOpacity={0.85}
                        style={s.submitBtn}
                    >
                        <LinearGradient
                            colors={isEdit ? ['#3a7bd5', '#00d2ff'] : gradients.accent}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.btnGrad}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={s.btnText}>
                                    {isEdit ? '💾 Update Profile' : '🚀 Finalize Provisioning'}
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.cancelLink}>
                        <Text style={{ color: 'rgba(255,255,255,0.3)', textDecorationLine: 'underline' }}>Abort Action</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 32 },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    subtitle: { fontSize: 13, marginTop: 2, opacity: 0.6 },

    glassCard: {
        padding: 24,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
    
    label: { fontSize: 10, fontWeight: '800', opacity: 0.4, letterSpacing: 1, marginBottom: 8 },
    input: {
        borderRadius: 14,
        padding: 16,
        fontSize: 15,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
        color: '#fff',
    },
    inputError: { borderColor: '#ff475733', backgroundColor: '#ff475708' },
    eyeBtn: { position: 'absolute', right: 16, top: 14 },
    
    submitBtn: { marginTop: 32 },
    btnGrad: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
    cancelLink: { alignItems: 'center', marginTop: 24, paddingVertical: 10 }
});', fontWeight: '700', fontSize: 16 },
});
