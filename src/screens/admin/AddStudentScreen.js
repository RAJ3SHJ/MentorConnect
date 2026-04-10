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

export default function AddStudentScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const { colors, gradients } = useTheme();
    const toast = useToast();
    
    const editStudent = route.params?.editStudent;
    const isEdit = !!editStudent;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [qualification, setQualification] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (editStudent) {
            setFirstName(editStudent.first_name || '');
            setLastName(editStudent.last_name || '');
            setQualification(editStudent.qualification || '');
            setUsername(editStudent.username || '');
        }
    }, [editStudent]);

    const validate = () => {
        const errs = {};
        if (!firstName.trim()) errs.firstName = 'First Name is required';
        if (!username.trim()) errs.username = 'Username is required';
        
        if (!isEdit) {
            if (!password) errs.password = 'Password is required';
            else if (password.length < 6) errs.password = 'Min 6 characters';
            if (password !== confirmPassword) errs.confirmPassword = 'Passwords mismatch';
        }
        
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
            const payload = { 
                firstName, 
                lastName, 
                qualification, 
                username, 
                password 
            };

            if (isEdit) {
                await api.put(`/api/admin/students/${editStudent.id}`, payload);
                toast.show('Learner profile updated successfully ✅', 'success');
            } else {
                await api.post('/api/admin/create-student', payload);
                toast.show(`Identity Provisioned: ${firstName} is active 🎉`, 'success');
            }
            
            setTimeout(() => navigation.goBack(), 1500);
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Action failed';
            toast.show(msg, 'error');
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
                                {isEdit ? 'Update Learner' : 'Onboard Learner'}
                            </Text>
                            <Text style={[s.subtitle, { color: colors.muted }]}>
                                {isEdit ? 'Refresh student credentials and info' : 'Provision a new student identity'}
                            </Text>
                        </View>
                    </View>

                    {/* Section 1: Personal Information */}
                    <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.sectionHeader}>
                            <View style={[s.iconBox, { backgroundColor: colors.blue + '15' }]}>
                                <Text style={{ fontSize: 20 }}>👤</Text>
                            </View>
                            <Text style={[s.sectionTitle, { color: colors.white }]}>Personal Information</Text>
                        </View>

                        <View style={s.row}>
                            <View style={{ flex: 1, marginRight: 12 }}>
                                <Text style={s.label}>FIRST NAME</Text>
                                <TextInput
                                    style={[s.input, errors.firstName && s.inputError]}
                                    placeholder="e.g. John"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={firstName}
                                    onChangeText={setFirstName}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.label}>LAST NAME</Text>
                                <TextInput
                                    style={s.input}
                                    placeholder="e.g. Doe"
                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                    value={lastName}
                                    onChangeText={setLastName}
                                />
                            </View>
                        </View>

                        <Text style={[s.label, { marginTop: 20 }]}>QUALIFICATION</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. B.Tech Computer Science"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={qualification}
                            onChangeText={setQualification}
                        />
                    </View>

                    {/* Section 2: Account Credentials */}
                    <View style={[s.glassCard, { marginTop: 20 }]}>
                        <View style={s.sectionHeader}>
                            <View style={[s.iconBox, { backgroundColor: '#FFD70015' }]}>
                                <Text style={{ fontSize: 20 }}>🔐</Text>
                            </View>
                            <Text style={[s.sectionTitle, { color: colors.white }]}>Account Credentials</Text>
                        </View>

                        <Text style={s.label}>USERNAME</Text>
                        <TextInput
                            style={[s.input, errors.username && s.inputError]}
                            placeholder="Set login username"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            value={username}
                            onChangeText={setUsername}
                            autoCapitalize="none"
                        />

                        <Text style={[s.label, { marginTop: 20 }]}>
                            {isEdit ? 'RESET PASSWORD (OPTIONAL)' : 'INITIAL PASSWORD'}
                        </Text>
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

                    <TouchableOpacity 
                        onPress={save} 
                        disabled={saving} 
                        activeOpacity={0.85}
                        style={s.submitBtn}
                    >
                        <LinearGradient
                            colors={gradients.accent}
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
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    submitBtn: { marginTop: 32 },
    btnGrad: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
    cancelLink: { alignItems: 'center', marginTop: 24, paddingVertical: 10 }
});
