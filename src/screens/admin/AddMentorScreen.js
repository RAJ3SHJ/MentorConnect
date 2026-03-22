import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function AddMentorScreen({ navigation, route }) {
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
    }, []);

    const validate = () => {
        const errs = {};
        if (!name.trim()) errs.name = 'Name is required';
        if (!email.trim()) errs.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) errs.email = 'Enter a valid email';
        if (!isEdit) {
            if (!password) errs.password = 'Password is required';
            else if (password.length < 4) errs.password = 'Password must be at least 4 characters';
            if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
        }
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const save = async () => {
        if (!validate()) return;
        setSaving(true);
        try {
                if (isEdit) {
                if (password && password !== confirmPassword) { toast.show('Passwords do not match', 'error'); return; }
                await api.put(`/api/admin/mentors/${editMentor.id}`, { name, email, expertise, password });
                toast.show(`${name} updated successfully ✅`, 'success');
                setTimeout(() => navigation.goBack(), 800);
            } else {
                await api.post('/api/admin/create-mentor', { name, email, password, expertise });
                toast.show(`Mentor account created for ${name} 🎉`, 'success');
                setName(''); setEmail(''); setPassword(''); setConfirmPassword(''); setExpertise('');
                setErrors({});
            }
        } catch (e) {
            toast.show(e.response?.data?.error || 'Failed to save', 'error');
        } finally { setSaving(false); }
    };

    const Field = ({ label, value, onChangeText, placeholder, error, secureTextEntry, keyboardType, autoCapitalize, right }) => (
        <View style={{ marginBottom: 4 }}>
            <Text style={[s.label, { color: colors.muted }]}>{label}</Text>
            <View style={{ position: 'relative' }}>
                <TextInput
                    style={[s.input, { backgroundColor: colors.glass, borderColor: error ? colors.danger : colors.glassBorder, color: colors.white }]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.muted}
                    value={value}
                    onChangeText={(t) => { onChangeText(t); if (errors[error]) setErrors(prev => ({ ...prev, [error]: undefined })); }}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize || 'none'}
                />
                {right}
            </View>
            {error && errors[Object.keys(errors).find(k => errors[k] === error)] ? (
                <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>
            ) : null}
        </View>
    );

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
                        <Text style={[s.backText, { color: colors.muted }]}>← Back</Text>
                    </TouchableOpacity>

                    <Text style={[s.title, { color: colors.white }]}>
                        {isEdit ? '✏️ Edit Mentor' : '👨‍🏫 Create Mentor Account'}
                    </Text>
                    <Text style={{ color: colors.muted, fontSize: 14, marginTop: 6, marginBottom: 24 }}>
                        {isEdit ? `Editing ${editMentor.name}` : 'Create login credentials so the mentor can sign in'}
                    </Text>

                    {/* Personal Info Card */}
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={[s.sectionTitle, { color: colors.white }]}>👤 Personal Info</Text>

                        <Text style={[s.label, { color: colors.muted }]}>Full Name *</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.glass, borderColor: errors.name ? colors.danger : colors.glassBorder, color: colors.white }]}
                            placeholder="e.g. Dr. Sarah Connor"
                            placeholderTextColor={colors.muted}
                            value={name}
                            onChangeText={(t) => { setName(t); setErrors(prev => ({ ...prev, name: undefined })); }}
                        />
                        {errors.name && <Text style={[s.errorText, { color: colors.danger }]}>{errors.name}</Text>}

                        <Text style={[s.label, { color: colors.muted }]}>Email *</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.glass, borderColor: errors.email ? colors.danger : colors.glassBorder, color: colors.white }]}
                            placeholder="mentor@example.com"
                            placeholderTextColor={colors.muted}
                            value={email}
                            onChangeText={(t) => { setEmail(t); setErrors(prev => ({ ...prev, email: undefined })); }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {errors.email && <Text style={[s.errorText, { color: colors.danger }]}>{errors.email}</Text>}

                        <Text style={[s.label, { color: colors.muted }]}>Expertise (optional)</Text>
                        <TextInput
                            style={[s.input, { backgroundColor: colors.glass, borderColor: colors.glassBorder, color: colors.white }]}
                            placeholder="e.g. Business Analysis, Agile, SQL"
                            placeholderTextColor={colors.muted}
                            value={expertise}
                            onChangeText={setExpertise}
                        />
                    </View>

                    {/* Login Credentials Card - for new and legacy mentors */}
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={[s.sectionTitle, { color: colors.white }]}>🔐 Login Credentials</Text>
                        <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12, lineHeight: 18 }}>
                            The mentor will use these credentials to sign in through the same login page as learners. {isEdit && '(Leave password blank to keep current)'}
                        </Text>

                            <Text style={[s.label, { color: colors.muted }]}>Username (Email) *</Text>
                            <View style={[s.readonlyField, { backgroundColor: colors.blue + '08', borderColor: colors.blue + '22' }]}>
                                <Text style={{ color: colors.blue, fontSize: 14 }}>{email || 'Fill email above ↑'}</Text>
                            </View>

                            <Text style={[s.label, { color: colors.muted }]}>Password *</Text>
                            <View style={{ position: 'relative' }}>
                                <TextInput
                                    style={[s.input, { backgroundColor: colors.glass, borderColor: errors.password ? colors.danger : colors.glassBorder, color: colors.white, paddingRight: 50 }]}
                                    placeholder="Set a password for the mentor"
                                    placeholderTextColor={colors.muted}
                                    value={password}
                                    onChangeText={(t) => { setPassword(t); setErrors(prev => ({ ...prev, password: undefined })); }}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity
                                    style={s.eyeBtn}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁️'}</Text>
                                </TouchableOpacity>
                            </View>
                            {errors.password && <Text style={[s.errorText, { color: colors.danger }]}>{errors.password}</Text>}

                            <Text style={[s.label, { color: colors.muted }]}>Confirm Password *</Text>
                            <TextInput
                                style={[s.input, { backgroundColor: colors.glass, borderColor: errors.confirmPassword ? colors.danger : colors.glassBorder, color: colors.white }]}
                                placeholder="Re-enter the password"
                                placeholderTextColor={colors.muted}
                                value={confirmPassword}
                                onChangeText={(t) => { setConfirmPassword(t); setErrors(prev => ({ ...prev, confirmPassword: undefined })); }}
                                secureTextEntry={!showPassword}
                            />
                            {errors.confirmPassword && <Text style={[s.errorText, { color: colors.danger }]}>{errors.confirmPassword}</Text>}
                        </View>

                    {/* Summary */}
                    {!isEdit && name && email && password && (
                        <View style={[s.card, { backgroundColor: colors.success + '08', borderColor: colors.success + '22' }]}>
                            <Text style={[s.sectionTitle, { color: colors.success }]}>📋 Account Summary</Text>
                            <Text style={{ color: colors.white, fontSize: 14, lineHeight: 22 }}>
                                <Text style={{ fontWeight: '700' }}>Name:</Text> {name}{'\n'}
                                <Text style={{ fontWeight: '700' }}>Login Email:</Text> {email}{'\n'}
                                <Text style={{ fontWeight: '700' }}>Expertise:</Text> {expertise || 'Not specified'}{'\n'}
                                <Text style={{ fontWeight: '700' }}>Role:</Text> Mentor
                            </Text>
                        </View>
                    )}

                    {/* Save Button */}
                    <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
                        <LinearGradient
                            colors={gradients.accent}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.btn}
                        >
                            <Text style={s.btnText}>
                                {saving ? 'Creating...' : isEdit ? '💾 Update Mentor' : '🔐 Create Mentor Account'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    back: { marginTop: 16, marginBottom: 24 },
    backText: { fontSize: 15 },
    title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 20, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
    input: {
        borderRadius: 12, padding: 14, fontSize: 15,
        borderWidth: 1, marginBottom: 4,
    },
    readonlyField: {
        borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 4,
    },
    errorText: { fontSize: 12, marginTop: 2, marginBottom: 4 },
    eyeBtn: { position: 'absolute', right: 14, top: 12 },
    btn: { borderRadius: RADIUS, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
