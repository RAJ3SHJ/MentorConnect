import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { RADIUS } from '../../theme';

const ProgressRing = ({ pct, size = 140, stroke = 10, accentColor }) => (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.05)' }} />
        <View style={{
            position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke,
            borderColor: accentColor,
            borderTopColor: pct > 75 ? accentColor : 'transparent',
            borderRightColor: pct > 50 ? accentColor : 'transparent',
            borderBottomColor: pct > 25 ? accentColor : 'transparent',
            borderLeftColor: pct > 0 ? accentColor : 'transparent',
            transform: [{ rotate: '-90deg' }], opacity: 0.9,
        }} />
        <Text style={{ color: '#FFF', fontSize: 30, fontWeight: '800', letterSpacing: -1 }}>{pct}%</Text>
        <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>Complete</Text>
    </View>
);

const BarChart = ({ data, gradientColors, colors }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 160, gap: 4, paddingTop: 10 }}>
            {data.map((d, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: colors?.white || 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>{d.value}</Text>
                    <LinearGradient colors={d.value > 0 ? gradientColors : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.06)']}
                        style={{ width: '80%', borderRadius: 6, height: Math.max(10, (d.value / max) * 120) }} />
                    <Text style={{ color: colors?.muted || 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: '600', marginTop: 6 }}>{d.label}</Text>
                </View>
            ))}
        </View>
    );
};

export default function DashboardScreen() {
    const { colors, gradients } = useTheme();
    const navigation = useNavigation();
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try { const res = await api.get('/api/student/dashboard-stats'); setStats(res.data); }
        catch (e) { console.log(e.message); }
    };

    useFocusEffect(useCallback(() => { fetchStats(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

    const r = stats?.roadmap || { total: 0, complete: 0, inProgress: 0, yetToStart: 0 };
    const e = stats?.exams || { total: 0, pending: 0, approved: 0, needsImprovement: 0 };
    const activity = stats?.weeklyActivity || [];

    return (
        <LinearGradient colors={gradients.bg} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>

                {/* Header with Gear Icon */}
                <View style={styles.headerRow}>
                    <View>
                        <Text style={[styles.greeting, { color: colors.white }]}>Dashboard</Text>
                        <Text style={[styles.greetingSub, { color: colors.muted }]}>Your learning progress at a glance</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.gearBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                        onPress={() => navigation.navigate('Settings')}
                        activeOpacity={0.75}
                    >
                        <Text style={{ fontSize: 20 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* Progress Ring + Stats */}
                <View style={styles.topRow}>
                    <View style={[styles.ringCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <ProgressRing pct={stats?.progressPct || 0} accentColor={colors.blue} />
                    </View>
                    <View style={styles.quickGrid}>
                        {[
                            { n: r.total, l: 'Total Courses', c: colors.blue },
                            { n: r.complete, l: 'Completed', c: colors.success },
                            { n: r.inProgress, l: 'In Progress', c: colors.gold },
                            { n: r.yetToStart, l: 'Yet to Start', c: colors.danger },
                        ].map((s, i) => (
                            <View key={i} style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderLeftColor: s.c }]}>
                                <Text style={[styles.quickNum, { color: s.c }]}>{s.n}</Text>
                                <Text style={[styles.quickLabel, { color: colors.muted }]}>{s.l}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Exam Performance */}
                <Text style={[styles.sectionTitle, { color: colors.white }]}>📝 Exam Performance</Text>
                <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        {[
                            { n: e.pending, l: 'Under Review', c: colors.gold, icon: '⏳' },
                            { n: e.approved, l: 'Approved', c: colors.success, icon: '✅' },
                            { n: e.needsImprovement, l: 'Needs Work', c: colors.danger, icon: '⚠️' },
                        ].map((s, i) => (
                            <View key={i} style={[styles.examStat, { borderColor: s.c + '33' }]}>
                                <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                                <Text style={[styles.examNum, { color: s.c }]}>{s.n}</Text>
                                <Text style={[styles.examLabel, { color: colors.muted }]}>{s.l}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Weekly Activity */}
                <Text style={[styles.sectionTitle, { color: colors.white }]}>📈 Weekly Activity</Text>
                <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <BarChart data={activity.map(a => ({ value: a.count, label: a.day }))} gradientColors={gradients.accent} colors={colors} />
                </View>

                {/* Category Breakdown */}
                {stats?.categories && Object.keys(stats.categories).length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.white }]}>📁 Category Breakdown</Text>
                        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                            {Object.entries(stats.categories).map(([cat, val]) => {
                                const pct = val.total > 0 ? Math.round((val.complete / val.total) * 100) : 0;
                                return (
                                    <View key={cat} style={{ marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: colors.white, fontSize: 13, fontWeight: '600' }}>{cat}</Text>
                                            <Text style={{ color: colors.muted, fontSize: 12 }}>{pct}%</Text>
                                        </View>
                                        <View style={styles.progressTrack}>
                                            <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                style={[styles.progressFill, { width: `${pct}%` }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </>
                )}

                {/* Info Cards */}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={{ fontSize: 24, marginBottom: 8 }}>{stats?.hasSkills ? '✅' : '❌'}</Text>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>Skills</Text>
                        <Text style={[styles.infoValue, { color: colors.white }]}>{stats?.hasSkills ? 'Completed' : 'Not started'}</Text>
                    </View>
                    <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={{ fontSize: 24, marginBottom: 8 }}>{stats?.mentor ? '👨‍🏫' : '⏳'}</Text>
                        <Text style={[styles.infoLabel, { color: colors.muted }]}>Mentor</Text>
                        <Text style={[styles.infoValue, { color: colors.white }]}>{stats?.mentor?.name || 'Not assigned'}</Text>
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 20, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    greeting: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    greetingSub: { fontSize: 14, marginTop: 4 },
    gearBtn: {
        width: 44, height: 44, borderRadius: 22,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    topRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
    ringCard: { borderRadius: RADIUS, borderWidth: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
    quickGrid: { flex: 1, gap: 8 },
    quickCard: { borderRadius: 12, borderWidth: 1, borderLeftWidth: 3, paddingHorizontal: 14, paddingVertical: 10 },
    quickNum: { fontSize: 20, fontWeight: '800' },
    quickLabel: { fontSize: 10, marginTop: 1 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10, marginTop: 8, letterSpacing: -0.3 },
    glassCard: { borderRadius: RADIUS, borderWidth: 1, padding: 20, marginBottom: 16 },
    examStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
    examNum: { fontSize: 22, fontWeight: '800' },
    examLabel: { fontSize: 10, textAlign: 'center' },
    progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginTop: 6 },
    progressFill: { height: 6, borderRadius: 3 },
    infoCard: { flex: 1, borderRadius: RADIUS, borderWidth: 1, padding: 16, alignItems: 'center' },
    infoLabel: { fontSize: 11, marginBottom: 4 },
    infoValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
