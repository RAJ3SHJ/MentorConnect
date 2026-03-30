import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../ThemeContext';
import { RADIUS } from '../../theme';

const { width } = Dimensions.get('window');
const isSmall = width < 380;

export default function WelcomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, gradients } = useTheme();

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.orb, { top: -100, right: -50, backgroundColor: colors.blue }]} />
            <View style={[s.orb, { bottom: -50, left: -100, backgroundColor: colors.purple }]} />

            <View style={[s.content, { paddingTop: Math.max(insets.top, 60) }]}>
                <Text style={[s.title, { color: colors.white }]}>MentorPath</Text>
                <Text style={[s.subtitle, { color: colors.muted }]}>
                    The global standard for professional{'\n'}mentorship & skill mastery.
                </Text>

                <View style={s.cardStack}>
                    {/* Path A: Mentor Login */}
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('MentorLogin')}
                        style={s.touchable}
                    >
                        <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                            <View style={[s.cardIcon, { backgroundColor: colors.blue + '15' }]}>
                                <Text style={{ fontSize: 32 }}>👨‍🏫</Text>
                            </View>
                            <View style={s.cardInfo}>
                                <Text style={[s.cardTitle, { color: colors.white }]}>Mentor Portal</Text>
                                <Text style={[s.cardDesc, { color: colors.muted }]}>Access your assignments, reviews, and guidance tools.</Text>
                            </View>
                            <View style={s.arrowBox}>
                                <Text style={{ color: colors.blue, fontSize: 20 }}>→</Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Path B: Administrative Access */}
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('AdminLogin')}
                        style={s.touchable}
                    >
                        <View style={[s.glassCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                            <View style={[s.cardIcon, { backgroundColor: '#00f26015' }]}>
                                <Text style={{ fontSize: 32 }}>🛡️</Text>
                            </View>
                            <View style={s.cardInfo}>
                                <Text style={[s.cardTitle, { color: colors.white }]}>Administrative Access</Text>
                                <Text style={[s.cardDesc, { color: colors.muted }]}>"Executive Pulse" overview of system metrics and provisioning.</Text>
                            </View>
                            <View style={s.arrowBox}>
                                <Text style={{ color: '#00f260', fontSize: 20 }}>→</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Legacy login/register access below if needed, or simplified for students */}
                <TouchableOpacity onPress={() => navigation.navigate('Login')} style={s.learnerPath}>
                    <Text style={{ color: colors.muted }}>Are you a learner? <Text style={{ color: colors.blue, fontWeight: '700' }}>Login Here</Text></Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.1 },
    content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
    title: { fontSize: 42, fontWeight: '900', letterSpacing: -1, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, textAlign: 'center', marginBottom: 48, opacity: 0.8, lineHeight: 24 },
    
    cardStack: { width: '100%', gap: 20 },
    touchable: { width: '100%' },
    glassCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        gap: 20
    },
    cardIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
    cardDesc: { fontSize: 13, lineHeight: 18, opacity: 0.7 },
    arrowBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    
    learnerPath: { marginTop: 'auto', marginBottom: 40, padding: 20 }
});

