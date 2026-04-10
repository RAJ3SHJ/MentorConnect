import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../ThemeContext';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { colors, gradients } = useTheme();
    const [showLogin, setShowLogin] = useState(false);
    const fadeAnim = React.useRef(new Animated.Value(0)).current;

    const toggleLogin = () => {
        if (!showLogin) {
            setShowLogin(true);
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }).start(() => setShowLogin(false));
        }
    };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.orb, { top: -100, right: -50, backgroundColor: colors.blue }]} />
            <View style={[s.orb, { bottom: -50, left: -100, backgroundColor: colors.purple }]} />

            <ScrollView 
                contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={s.hero}>
                    <Text style={[s.badge, { backgroundColor: colors.blue + '20', color: colors.blue }]}>
                        Executive Pulse Platform
                    </Text>
                    <Text style={[s.title, { color: colors.white }]}>Mentor Connect</Text>
                    <Text style={[s.tagline, { color: colors.muted }]}>
                        The global ecosystem for professional mentorship and industrial skill mastery.
                    </Text>
                </View>

                {/* Info Section */}
                <View style={s.infoGrid}>
                    <View style={s.infoItem}>
                        <Text style={s.infoIcon}>⚡</Text>
                        <Text style={[s.infoLabel, { color: colors.white }]}>Skill Mastery</Text>
                        <Text style={[s.infoText, { color: colors.muted }]}>Structured paths designed by industry veterans.</Text>
                    </View>
                    <View style={s.infoItem}>
                        <Text style={s.infoIcon}>🛡️</Text>
                        <Text style={[s.infoLabel, { color: colors.white }]}>Real-time Guidance</Text>
                        <Text style={[s.infoText, { color: colors.muted }]}>Instant access to expert reviews and feedback.</Text>
                    </View>
                </View>

                {/* Strategic Mission */}
                <View style={[s.missionCard, { backgroundColor: colors.card + '50' }]}>
                    <Text style={[s.missionHeading, { color: colors.white }]}>Our Strategic Mission</Text>
                    <Text style={[s.missionBody, { color: colors.muted }]}>
                        Mentor Connect bridges the gap between theoretical knowledge and industrial application by 
                        synchronizing expert mentors with ambitious learners in a secure, performance-driven environment.
                    </Text>
                </View>

                <TouchableOpacity 
                    style={[s.primaryButton, { backgroundColor: colors.blue }]}
                    onPress={toggleLogin}
                >
                    <Text style={s.buttonText}>Enter Secure Portal</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Login Overlay */}
            {showLogin && (
                <Animated.View style={[s.overlay, { opacity: fadeAnim, backgroundColor: colors.bg + 'F2' }]}>
                    <TouchableOpacity style={s.closeArea} onPress={toggleLogin} />
                    <View style={s.loginPanel}>
                        <Text style={[s.panelTitle, { color: colors.white }]}>Select Entrance</Text>
                        
                        <TouchableOpacity style={s.pathCard} onPress={() => navigation.navigate('Login')}>
                            <View style={[s.pathIcon, { backgroundColor: colors.purple + '20' }]}>
                                <Text style={{ fontSize: 24 }}>🎓</Text>
                            </View>
                            <View style={s.pathInfo}>
                                <Text style={[s.pathTitle, { color: colors.white }]}>Student Login</Text>
                                <Text style={[s.pathDesc, { color: colors.muted }]}>Access your learning portal</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.pathCard} onPress={() => navigation.navigate('MentorLogin')}>
                            <View style={[s.pathIcon, { backgroundColor: colors.blue + '20' }]}>
                                <Text style={{ fontSize: 24 }}>👨‍🏫</Text>
                            </View>
                            <View style={s.pathInfo}>
                                <Text style={[s.pathTitle, { color: colors.white }]}>Mentor Login</Text>
                                <Text style={[s.pathDesc, { color: colors.muted }]}>Access your mentorship dashboard</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.pathCard} onPress={() => navigation.navigate('AdminLogin')}>
                            <View style={[s.pathIcon, { backgroundColor: '#00f26020' }]}>
                                <Text style={{ fontSize: 24 }}>🛡️</Text>
                            </View>
                            <View style={s.pathInfo}>
                                <Text style={[s.pathTitle, { color: colors.white }]}>Admin Access</Text>
                                <Text style={[s.pathDesc, { color: colors.muted }]}>System metrics and provisioning</Text>
                            </View>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={s.cancelButton} onPress={toggleLogin}>
                            <Text style={{ color: colors.muted }}>Go Back to Info</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    orb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
    scrollContent: { paddingHorizontal: 24 },
    hero: { marginBottom: 40 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 12, fontWeight: '700', marginBottom: 16, overflow: 'hidden' },
    title: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
    tagline: { fontSize: 18, marginTop: 12, lineHeight: 26 },
    infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    infoItem: { width: '47%' },
    infoIcon: { fontSize: 24, marginBottom: 12 },
    infoLabel: { fontSize: 16, fontWeight: '700' },
    infoText: { fontSize: 13, marginTop: 4, lineHeight: 18 },
    missionCard: { padding: 24, borderRadius: 24, marginBottom: 40 },
    missionHeading: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
    missionBody: { fontSize: 14, lineHeight: 22 },
    primaryButton: { height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 5 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
    overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end' },
    closeArea: { flex: 1 },
    loginPanel: { padding: 32, borderTopLeftRadius: 32, borderTopRightRadius: 32, backgroundColor: '#121826' },
    panelTitle: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
    pathCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A2233', padding: 16, borderRadius: 20, marginBottom: 16 },
    pathIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    pathInfo: { flex: 1 },
    pathTitle: { fontSize: 16, fontWeight: '700' },
    pathDesc: { fontSize: 12, marginTop: 2 },
    cancelButton: { marginTop: 8, padding: 16, alignItems: 'center' }
});
