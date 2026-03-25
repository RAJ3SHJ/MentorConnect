import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const C = {
    bg: '#040a18',
    card: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.06)',
    borderPrimary: 'rgba(0,210,255,0.2)',
    borderDanger: 'rgba(255,71,87,0.2)',
    primary: '#00d2ff',
    danger: '#ff4757',
    white: '#fff',
    muted: 'rgba(255,255,255,0.30)',
    faint: 'rgba(255,255,255,0.50)',
};

// Accessible progress ring with no fixed absolute positioning issues
const ProgressRing = ({ pct, size = 130, stroke = 10 }) => {
    const accentColor = pct === 100 ? '#00f260' : C.primary;
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.05)' }} />
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2,
                borderWidth: stroke, borderColor: accentColor,
                borderTopColor: pct > 75 ? accentColor : 'transparent',
                borderRightColor: pct > 50 ? accentColor : 'transparent',
                borderBottomColor: pct > 25 ? accentColor : 'transparent',
                borderLeftColor: pct > 0 ? accentColor : 'transparent',
                transform: [{ rotate: '-90deg' }], opacity: 0.9,
            }} />
            <Text style={{ color: C.white, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>{pct}%</Text>
            <Text style={{ color: C.muted, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Complete</Text>
        </View>
    );
};

export default function DashboardScreen() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/student/dashboard-stats');
            setStats(res.data);
        } catch (e) { console.log('Dashboard fetch fail', e.message); }
    };

    useFocusEffect(useCallback(() => { fetchStats(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

    const r = stats?.roadmap || { total: 0, complete: 0 };
    const e = stats?.exams || { total: 0, approved: 0, needsImprovement: 0 };
    const currentStreak = Math.floor(Math.random() * 10) + 2;
    const points = (r.complete * 150) + (e.approved * 300) + 450;

    return (
        <View style={s.root}>
            <LinearGradient colors={['#040a18', '#0B132B']} style={StyleSheet.absoluteFillObject} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            >
                {/* ── Header ── */}
                <View style={s.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.greeting}>Welcome, {user?.name?.split(' ')[0]}</Text>
                        <Text style={s.greetingSub}>Let's conquer your objectives today.</Text>
                    </View>
                    <TouchableOpacity style={s.gearBtn} onPress={() => navigation.navigate('Settings')}>
                        <Text style={{ fontSize: 22 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Gamification widgets — 2-per-row with flex-wrap ── */}
                <View style={s.widgetRow}>
                    <View style={[s.widgetCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.widgetIconBox}>
                            <Text style={{ fontSize: 20 }}>🔥</Text>
                        </View>
                        <View>
                            <Text style={s.widgetValue}>{currentStreak} Day</Text>
                            <Text style={s.widgetLabel}>Learning Streak</Text>
                        </View>
                    </View>
                    <View style={[s.widgetCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.widgetIconBox}>
                            <Text style={{ fontSize: 20 }}>⭐</Text>
                        </View>
                        <View>
                            <Text style={s.widgetValue}>{points.toLocaleString()}</Text>
                            <Text style={s.widgetLabel}>Total XP Points</Text>
                        </View>
                    </View>
                </View>

                {/* ── Active Roadmap Hero ── */}
                <Text style={s.sectionTitle}>🎯 Active Roadmap</Text>
                <View style={[s.heroCard, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                    <LinearGradient
                        colors={['rgba(0,210,255,0.05)', 'transparent']}
                        style={StyleSheet.absoluteFillObject}
                    />
                    {/* Ring + info stacked vertically for clean mobile layout */}
                    <View style={s.heroInner}>
                        <View style={{ alignItems: 'center', marginBottom: 24 }}>
                            <ProgressRing pct={stats?.progressPct || 0} />
                        </View>
                        <View style={s.heroContent}>
                            <View style={s.statusBadge}>
                                <Text style={s.statusBadgeText}>IN PROGRESS</Text>
                            </View>
                            <Text style={s.courseTitle}>Advanced Cloud Architecture</Text>
                            <Text style={s.courseSub}>Module 4: Security &amp; Compliance</Text>
                            <TouchableOpacity
                                style={{ width: '100%' }}
                                onPress={() => navigation.navigate('Roadmap')}
                            >
                                <LinearGradient
                                    colors={['#00d2ff', '#3a7bd5']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={s.resumeBtn}
                                >
                                    <Text style={s.resumeBtnText}>Resume Learning ➔</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Mentor Assignments — vertical stack always ── */}
                <Text style={[s.sectionTitle, { marginTop: 8 }]}>⚠️ Mentor Assignments</Text>
                <View style={{ gap: 14 }}>
                    {/* Mentor card */}
                    <View style={[s.taskCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                        <View style={s.taskAvatar}>
                            <Text style={{ fontSize: 24 }}>👨‍🏫</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.taskTitle}>
                                {stats?.mentor ? stats.mentor.name : 'No Mentor Assigned'}
                            </Text>
                            <Text style={s.taskSub}>
                                {e.needsImprovement > 0 ? `${e.needsImprovement} exams need revision` : 'Awaiting your submission'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={s.taskActionBtn}
                            onPress={() => navigation.navigate('Assessment')}
                        >
                            <Text style={s.taskActionText}>View</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Exams card */}
                    <View style={[s.taskCard, { borderColor: C.borderDanger }, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                        <View style={[s.taskAvatar, { backgroundColor: 'rgba(255,71,87,0.1)' }]}>
                            <Text style={{ fontSize: 24 }}>📝</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.taskTitle}>Upcoming Exams</Text>
                            <Text style={[s.taskSub, { color: C.danger }]}>
                                {e.total - e.approved} pending completion
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[s.taskActionBtn, { borderColor: 'rgba(255,71,87,0.3)' }]}
                            onPress={() => navigation.navigate('TakeExam')}
                        >
                            <Text style={[s.taskActionText, { color: C.danger }]}>Start</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#040a18' },
    scroll: { padding: 16, paddingBottom: 80 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, gap: 12 },
    greeting: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 4 },
    greetingSub: { fontSize: 15, color: C.faint },
    gearBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

    // Gamification widgets — flex-wrap handles 2-per-row naturally
    widgetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
    widgetCard: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 20, padding: 18 },
    widgetIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    widgetValue: { fontSize: 20, color: '#fff', fontWeight: '800', marginBottom: 2 },
    widgetLabel: { fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },

    sectionTitle: { fontSize: 12, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 14, marginLeft: 2 },

    // Hero roadmap card — vertical layout, no fixed heights
    heroCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: C.borderPrimary, borderRadius: 28, padding: 24, marginBottom: 32, overflow: 'hidden' },
    heroInner: { alignItems: 'stretch' },
    heroContent: { alignItems: 'center' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,210,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)', marginBottom: 14 },
    statusBadgeText: { color: C.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    courseTitle: { fontSize: 22, color: '#fff', fontWeight: '800', marginBottom: 6, textAlign: 'center', letterSpacing: -0.5 },
    courseSub: { fontSize: 14, color: C.faint, marginBottom: 24, textAlign: 'center' },
    resumeBtn: { paddingHorizontal: 28, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resumeBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Task/assignment cards — always full width rows with action button
    taskCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 24, padding: 18 },
    taskAvatar: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    taskTitle: { fontSize: 16, color: '#fff', fontWeight: '700', marginBottom: 4 },
    taskSub: { fontSize: 13, color: C.muted, fontWeight: '500' },
    taskActionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0,210,255,0.04)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)', flexShrink: 0 },
    taskActionText: { color: C.primary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
});
