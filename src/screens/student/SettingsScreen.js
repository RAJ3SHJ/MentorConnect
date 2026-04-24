    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Platform, ActivityIndicator, SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { RADIUS } from '../../theme';

export default function SettingsScreen({ navigation }) {
    const { colors, gradients, themeKey, switchTheme, themes, themeKeys } = useTheme();
    const { logout } = useAuth();
    const toast = useToast();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileSection, setProfileSection] = useState(false);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        api.get('/api/auth/profile')
            .then(res => { setName(res.data.name); setEmail(res.data.email); })
            .catch(e => console.log(e.message))
            .finally(() => setLoading(false));
    }, []);

    const validateProfile = () => {
        const e = {};
        if (!name.trim()) e.name = 'Name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
        if (newPassword && newPassword.length < 4) e.newPassword = 'Password must be at least 4 characters';
        if (newPassword && !currentPassword) e.currentPassword = 'Current password is required';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const saveProfile = async () => {
        if (!validateProfile()) { toast.show('Please fix the errors', 'error'); return; }
        setSaving(true);
        try {
            const body = { name: name.trim(), email: email.trim() };
            if (newPassword) { body.currentPassword = currentPassword; body.newPassword = newPassword; }
            await api.put('/api/auth/profile', body);
            toast.show('Profile updated! ✨', 'success');
            setCurrentPassword(''); setNewPassword(''); setErrors({});
        } catch (e) {
            toast.show(e.response?.data?.error || 'Update failed', 'error');
        } finally { setSaving(false); }
    };

    const handleThemeSwitch = (key) => {
        switchTheme(key);
        toast.show(`Switched to ${themes[key].name} theme ${themes[key].icon}`, 'success');
    };

    const [confirmLogout, setConfirmLogout] = useState(false);

    const handleLogout = async () => {
        if (!confirmLogout) {
            setConfirmLogout(true);
            toast.show('Tap Log Out again to confirm', 'warning');
            setTimeout(() => setConfirmLogout(false), 4000);
            return;
        }
        try {
            await logout();
        } catch (e) {
            console.log('Logout error:', e);
        }
    };

    if (loading) return (
        <LinearGradient colors={gradients.bg} style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.blue} size="large" />
        </LinearGradient>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <LinearGradient colors={gradients.bg} style={s.container}>
                <ScrollView contentContainerStyle={s.scroll}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerRow}>
                        <Text style={{ color: colors.muted, fontSize: 15 }}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={[s.title, { color: colors.white }]}>Settings</Text>
                    <Text style={[s.subtitle, { color: colors.muted }]}>Customize your experience</Text>

                    {/* Theme Picker */}
                    <Text style={[s.sectionTitle, { color: colors.white }]}>🎨 Color Theme</Text>
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <View style={s.themeGrid}>
                            {themeKeys.map(key => {
                                const t = themes[key]; const active = key === themeKey;
                                return (
                                    <TouchableOpacity key={key}
                                        style={[s.themeItem, { borderColor: active ? t.blue : colors.glassBorder, backgroundColor: active ? t.blue + '15' : 'transparent' }]}
                                        onPress={() => handleThemeSwitch(key)} activeOpacity={0.8}>
                                        <View style={s.themePreview}>
                                            <View style={[s.previewDot, { backgroundColor: t.bg }]} />
                                            <View style={[s.previewDot, { backgroundColor: t.blue }]} />
                                            <View style={[s.previewDot, { backgroundColor: t.accent[1] || t.purple }]} />
                                        </View>
                                        <Text style={[s.themeName, { color: active ? t.blue : colors.muted }]}>{t.icon} {t.name}</Text>
                                        {active && <View style={[s.activeBadge, { backgroundColor: t.blue }]}><Text style={s.activeBadgeText}>✓</Text></View>}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Profile */}
                    <TouchableOpacity onPress={() => setProfileSection(!profileSection)} activeOpacity={0.8}>
                        <Text style={[s.sectionTitle, { color: colors.white }]}>👤 User Profile {profileSection ? '▾' : '▸'}</Text>
                    </TouchableOpacity>
                    {profileSection && (
                        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            <Text style={[s.label, { color: colors.muted }]}>FULL NAME</Text>
                            <TextInput style={[s.input, { borderColor: errors.name ? colors.danger : colors.glassBorder, color: colors.white }]}
                                value={name} onChangeText={t => { setName(t); if (errors.name) setErrors(e => ({ ...e, name: null })); }}
                                placeholderTextColor={colors.muted} />
                            {errors.name && <Text style={[s.errorText, { color: colors.danger }]}>⚠ {errors.name}</Text>}

                            <Text style={[s.label, { color: colors.muted }]}>EMAIL</Text>
                            <TextInput style={[s.input, { borderColor: errors.email ? colors.danger : colors.glassBorder, color: colors.white }]}
                                value={email} onChangeText={t => { setEmail(t); if (errors.email) setErrors(e => ({ ...e, email: null })); }}
                                keyboardType="email-address" autoCapitalize="none" placeholderTextColor={colors.muted} />
                            {errors.email && <Text style={[s.errorText, { color: colors.danger }]}>⚠ {errors.email}</Text>}

                            <View style={[s.divider, { borderColor: colors.glassBorder }]} />
                            <Text style={[s.label, { color: colors.muted }]}>CHANGE PASSWORD (optional)</Text>
                            <TextInput style={[s.input, { borderColor: errors.currentPassword ? colors.danger : colors.glassBorder, color: colors.white }]}
                                value={currentPassword} onChangeText={setCurrentPassword}
                                placeholder="Current password" placeholderTextColor={colors.muted} secureTextEntry />
                            {errors.currentPassword && <Text style={[s.errorText, { color: colors.danger }]}>⚠ {errors.currentPassword}</Text>}
                            <TextInput style={[s.input, { borderColor: errors.newPassword ? colors.danger : colors.glassBorder, color: colors.white }]}
                                value={newPassword} onChangeText={setNewPassword}
                                placeholder="New password" placeholderTextColor={colors.muted} secureTextEntry />
                            {errors.newPassword && <Text style={[s.errorText, { color: colors.danger }]}>⚠ {errors.newPassword}</Text>}

                            <TouchableOpacity onPress={saveProfile} disabled={saving} activeOpacity={0.85}>
                                <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtn}>
                                    <Text style={s.saveBtnText}>{saving ? 'Saving…' : '💾 Save Changes'}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Logout */}
                    <TouchableOpacity
                        style={[s.logoutBtn, { borderColor: colors.danger + '33' },
                        confirmLogout && { backgroundColor: colors.danger, borderColor: colors.danger }]}
                        onPress={handleLogout} activeOpacity={0.85}>
                        <Text style={[s.logoutText, { color: confirmLogout ? '#FFF' : colors.danger }]}>
                            {confirmLogout ? '⚠️ Tap Again to Confirm' : '🚪 Log Out'}
                        </Text>
                    </TouchableOpacity>
                    <Text style={[s.version, { color: colors.muted }]}>
                        MentorPath v{Constants.expoConfig?.version || '1.0.x'} • Build {Constants.expoConfig?.android?.versionCode || '1'} • Made with ❤️
                    </Text>
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    headerRow: { marginTop: 16, marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4, marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 16, letterSpacing: -0.3 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 8 },
    themeGrid: { gap: 10 },
    themeItem: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 12 },
    themePreview: { flexDirection: 'row', gap: 4 },
    previewDot: { width: 16, height: 16, borderRadius: 8 },
    themeName: { flex: 1, fontSize: 14, fontWeight: '600' },
    activeBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    activeBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1 },
    errorText: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4 },
    divider: { borderTopWidth: 1, marginVertical: 16 },
    saveBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    logoutBtn: { borderRadius: RADIUS, borderWidth: 1, paddingVertical: 14, alignItems: 'center', marginTop: 24, backgroundColor: 'rgba(255,71,87,0.06)' },
    logoutText: { fontWeight: '700', fontSize: 15 },
    version: { textAlign: 'center', marginTop: 24, fontSize: 12 },
});
