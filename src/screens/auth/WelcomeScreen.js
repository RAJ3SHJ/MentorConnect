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
                duration: 500,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setShowLogin(false));
        }
    };

    return (
        <View style={[s.container, { backgroundColor: '#0A0A0B' }]}>
            {/* Background Orbs */}
            <View style={[s.orbTop, { backgroundColor: '#1A233A' }]} />
            <View style={[s.orbBottom, { backgroundColor: '#21102B' }]} />

            <ScrollView 
                contentContainerStyle={[s.scrollContent, { paddingTop: insets.top + (height > 800 ? 60 : 30) }]}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={s.hero}>
                    <View style={[s.badgeBox, { backgroundColor: 'rgba(66, 133, 244, 0.15)' }]}>
                        <Text style={[s.badgeText, { color: '#4285F4' }]}>Executive Pulse Platform</Text>
                    </View>
                    
                    <Text style={s.title}>Mentor Connect</Text>
                    
                    <Text style={[s.tagline, { color: 'rgba(255,255,255,0.5)' }]}>
                        The global ecosystem for professional mentorship and industrial skill mastery.
                    </Text>
                </View>

                {/* Features Grid */}
                <View style={s.featureGrid}>
                    <View style={s.featureItem}>
                        <Text style={s.icon}>⚡</Text>
                        <Text style={s.featureLabel}>Skill Mastery</Text>
                        <Text style={s.featureDesc}>Structured paths designed by industry veterans.</Text>
                    </View>
                    
                    <View style={s.featureItem}>
                        <Text style={s.icon}>🛡️</Text>
                        <Text style={s.featureLabel}>Real-time Guidance</Text>
                        <Text style={s.featureDesc}>Instant access to expert reviews and feedback.</Text>
                    </View>
                </View>

                {/* Strategic Mission */}
                <View style={s.missionCard}>
                    <Text style={s.missionTitle}>Our Strategic Mission</Text>
                    <Text style={s.missionText}>
                        Mentor Connect bridges the gap between theoretical knowledge and industrial application by synchronizing expert mentors with ambitious learners in a secure, performance-driven environment.
                    </Text>
                </View>

                {/* Main Action */}
                <TouchableOpacity 
                    style={[s.primaryBtn, { backgroundColor: '#4285F4' }]} 
                    activeOpacity={0.8}
                    onPress={toggleLogin}
                >
                    <Text style={s.primaryBtnText}>Enter Secure Portal</Text>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Portal Selection Overlay */}
            {showLogin && (
                <Animated.View style={[s.overlay, { opacity: fadeAnim }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={toggleLogin} activeOpacity={1} />
                    <View style={[s.portalPanel, { backgroundColor: '#121214' }]}>
                        <View style={s.pullBar} />
                        <Text style={s.portalTitle}>Select Your Gateway</Text>
                        
                        <TouchableOpacity style={s.entryCard} onPress={() => navigation.navigate('Login')}>
                            <View style={[s.entryIcon, { backgroundColor: 'rgba(142, 68, 173, 0.2)' }]}>
                                <Text style={{ fontSize: 24 }}>🎓</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.entryTitle}>Learner Portal</Text>
                                <Text style={s.entryDesc}>Pursuit of mastery and skill acquisition</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.entryCard} onPress={() => navigation.navigate('MentorLogin')}>
                            <View style={[s.entryIcon, { backgroundColor: 'rgba(66, 133, 244, 0.2)' }]}>
                                <Text style={{ fontSize: 24 }}>👨‍🏫</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.entryTitle}>Mentor Dashboard</Text>
                                <Text style={s.entryDesc}>Industrial guidance and expert review</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.entryCard} onPress={() => navigation.navigate('AdminLogin')}>
                            <View style={[s.entryIcon, { backgroundColor: 'rgba(46, 213, 115, 0.2)' }]}>
                                <Text style={{ fontSize: 24 }}>⚖️</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.entryTitle}>Executive Console</Text>
                                <Text style={s.entryDesc}>Infrastructure and identity management</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={s.cancelBtn} onPress={toggleLogin}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)' }}>Back to Intel</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    orbTop: { position: 'absolute', top: -50, right: -100, width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
    orbBottom: { position: 'absolute', bottom: -150, left: -100, width: 450, height: 450, borderRadius: 225, opacity: 0.1 },
    scrollContent: { paddingHorizontal: 32 },
    
    hero: { marginBottom: 48 },
    badgeBox: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 100, marginBottom: 24 },
    badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    title: { fontSize: 44, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
    tagline: { fontSize: 18, fontWeight: '400', lineHeight: 28, marginTop: 12 },

    featureGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
    featureItem: { width: '46%' },
    icon: { fontSize: 28, marginBottom: 12 },
    featureLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 6 },
    featureDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18 },

    missionCard: { backgroundColor: '#161618', padding: 28, borderRadius: 24, marginBottom: 48 },
    missionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 12 },
    missionText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 22 },

    primaryBtn: { height: 60, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    primaryBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },

    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    portalPanel: { padding: 32, borderTopLeftRadius: 32, borderTopRightRadius: 32 },
    pullBar: { width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
    portalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', marginBottom: 28, textAlign: 'center' },
    entryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    entryIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    entryTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    entryDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
    cancelBtn: { padding: 16, alignItems: 'center', marginTop: 8 }
});
