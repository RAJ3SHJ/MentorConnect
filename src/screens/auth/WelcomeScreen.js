import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../ThemeContext';
import { RADIUS } from '../../theme';

export default function WelcomeScreen({ navigation }) {
    const { colors, gradients } = useTheme();

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.orb} />
            <View style={s.orbPurple} />
            <View style={s.content}>
                <Text style={{ fontSize: 64, marginBottom: 16 }}>🎓</Text>
                <Text style={[s.title, { color: colors.white }]}>MentorPath</Text>
                <Text style={[s.subtitle, { color: colors.muted }]}>
                    Connect with expert mentors,{'\n'}master in-demand skills,{'\n'}and accelerate your career.
                </Text>
                <View style={s.badges}>
                    {['Skill Assessments', 'Guided Roadmaps', 'Expert Mentors'].map(b => (
                        <View key={b} style={[s.badge, { borderColor: colors.blue + '33', backgroundColor: colors.blue + '10' }]}>
                            <Text style={[s.badgeText, { color: colors.blue }]}>✦ {b}</Text>
                        </View>
                    ))}
                </View>
            </View>
            <View style={s.buttons}>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.85}>
                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.btnGrad}>
                        <Text style={s.primaryText}>Get Started</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.secondaryBtn, { borderColor: colors.blue + '44', backgroundColor: colors.blue + '08' }]}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.85}
                >
                    <Text style={[s.secondaryText, { color: colors.blue }]}>I already have an account</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, backgroundColor: '#4285F4', opacity: 0.04, top: -50, right: -80 },
    orbPurple: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#8E44AD', opacity: 0.04, bottom: 100, left: -60 },
    content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 42, fontWeight: '800', letterSpacing: -1, textAlign: 'center' },
    subtitle: { fontSize: 16, textAlign: 'center', marginTop: 12, lineHeight: 24 },
    badges: { marginTop: 32, gap: 8 },
    badge: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 1 },
    badgeText: { fontSize: 13, fontWeight: '600' },
    buttons: { paddingHorizontal: 32, paddingBottom: 48, gap: 12 },
    btnGrad: { borderRadius: RADIUS + 4, paddingVertical: 16, alignItems: 'center' },
    primaryText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    secondaryBtn: { borderWidth: 1.5, borderRadius: RADIUS + 4, paddingVertical: 14, alignItems: 'center' },
    secondaryText: { fontSize: 15, fontWeight: '600' },
});
