import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function RoadmapScreen() {
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [roadmap, setRoadmap] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRoadmap = async () => {
        try { const res = await api.get('/api/roadmap'); setRoadmap(res.data); }
        catch (e) { console.log(e.message); }
    };

    useFocusEffect(useCallback(() => { fetchRoadmap(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchRoadmap(); setRefreshing(false); };

    const updateStatus = async (item, newStatus) => {
        const prev = item.status;
        setRoadmap(r => r.map(c => c.id === item.id ? { ...c, status: newStatus } : c));
        try {
            await api.patch(`/api/roadmap/${item.id}`, { status: newStatus });
            if (newStatus === 'Complete') toast.show(`🎉 "${item.title}" completed!`, 'success');
            else if (newStatus === 'In Progress') toast.show(`Started "${item.title}"`, 'info');
        } catch {
            toast.show('Failed to update', 'error');
            setRoadmap(r => r.map(c => c.id === item.id ? { ...c, status: prev } : c));
        }
    };

    const statusConfig = {
        'Complete': { icon: '✅', color: colors.success, bg: colors.success + '15' },
        'In Progress': { icon: '🔄', color: colors.gold, bg: colors.gold + '15' },
        'Yet to Start': { icon: '⏳', color: colors.muted, bg: 'rgba(255,255,255,0.03)' },
    };

    const complete = roadmap.filter(r => r.status === 'Complete').length;
    const pct = roadmap.length > 0 ? Math.round((complete / roadmap.length) * 100) : 0;

    const renderItem = ({ item, index }) => {
        const cfg = statusConfig[item.status] || statusConfig['Yet to Start'];
        const isLast = index === roadmap.length - 1;
        return (
            <View style={s.timelineRow}>
                {/* Timeline Line */}
                <View style={s.timelineLeft}>
                    <View style={[s.timelineDot, { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                        <Text style={{ fontSize: 12 }}>{cfg.icon}</Text>
                    </View>
                    {!isLast && <View style={[s.timelineLine, { backgroundColor: cfg.color + '33' }]} />}
                </View>

                {/* Card */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderLeftColor: cfg.color, borderLeftWidth: 3 }]}>
                    <View style={s.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.cardTitle, { color: colors.white }]}>{item.title}</Text>
                            {item.category && <Text style={[s.cardCategory, { color: colors.muted }]}>{item.category}</Text>}
                        </View>
                        <View style={[s.badge, { backgroundColor: cfg.bg, borderColor: cfg.color + '44' }]}>
                            <Text style={[s.badgeText, { color: cfg.color }]}>{item.status}</Text>
                        </View>
                    </View>

                    {item.description ? <Text style={[s.desc, { color: colors.muted }]} numberOfLines={2}>{item.description}</Text> : null}

                    {item.link ? (
                        <TouchableOpacity onPress={() => { try { Linking.openURL(item.link); } catch { } }}>
                            <Text style={[s.link, { color: colors.blue }]} numberOfLines={1}>🔗 {item.link}</Text>
                        </TouchableOpacity>
                    ) : null}

                    {/* Status Stepper */}
                    <View style={[s.stepper, { borderTopColor: colors.glassBorder }]}>
                        {['Yet to Start', 'In Progress', 'Complete'].map((st, i) => {
                            const active = item.status === st;
                            const stCfg = statusConfig[st];
                            return (
                                <TouchableOpacity
                                    key={st}
                                    style={[s.stepBtn, active && { backgroundColor: stCfg.color, borderColor: stCfg.color }, !active && { borderColor: colors.glassBorder }]}
                                    onPress={() => updateStatus(item, st)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[s.stepText, { color: active ? (st === 'Complete' ? '#000' : '#000') : colors.muted }]}>
                                        {st === 'Yet to Start' ? 'Not Started' : st}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.title, { color: colors.white }]}>My Roadmap 🗺️</Text>
                    <Text style={[s.subtitle, { color: colors.muted }]}>{roadmap.length} course{roadmap.length !== 1 ? 's' : ''} assigned</Text>
                </View>
                {roadmap.length > 0 && (
                    <View style={[s.pctBadge, { backgroundColor: colors.blue + '15', borderColor: colors.blue + '33' }]}>
                        <Text style={[s.pctText, { color: colors.blue }]}>{pct}%</Text>
                        <Text style={[s.pctLabel, { color: colors.muted }]}>done</Text>
                    </View>
                )}
            </View>

            {/* Progress bar */}
            {roadmap.length > 0 && (
                <View style={s.progressWrap}>
                    <View style={[s.progressTrack, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                        <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={[s.progressFill, { width: `${pct}%` }]} />
                    </View>
                    <View style={s.progressLabels}>
                        <Text style={[s.progressLabel, { color: colors.success }]}>✅ {complete} done</Text>
                        <Text style={[s.progressLabel, { color: colors.gold }]}>🔄 {roadmap.filter(r => r.status === 'In Progress').length} active</Text>
                        <Text style={[s.progressLabel, { color: colors.muted }]}>⏳ {roadmap.filter(r => r.status === 'Yet to Start').length} pending</Text>
                    </View>
                </View>
            )}

            {roadmap.length === 0 ? (
                <View style={s.empty}>
                    <Text style={{ fontSize: 56, marginBottom: 16 }}>📋</Text>
                    <Text style={[s.emptyTitle, { color: colors.white }]}>No courses yet</Text>
                    <Text style={[s.emptyMsg, { color: colors.muted }]}>Your mentor will assign courses to your roadmap soon.</Text>
                </View>
            ) : (
                <FlatList
                    data={roadmap}
                    keyExtractor={i => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
                />
            )}
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
    title: { fontSize: 28, fontWeight: '800' },
    subtitle: { fontSize: 14, marginTop: 4 },
    pctBadge: { borderRadius: 16, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
    pctText: { fontSize: 20, fontWeight: '800' },
    pctLabel: { fontSize: 10, marginTop: 1 },
    progressWrap: { paddingHorizontal: 24, paddingBottom: 16 },
    progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
    progressFill: { height: 8, borderRadius: 4 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    progressLabel: { fontSize: 11, fontWeight: '600' },
    // Timeline
    timelineRow: { flexDirection: 'row', marginBottom: 4 },
    timelineLeft: { width: 36, alignItems: 'center' },
    timelineDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    timelineLine: { width: 2, flex: 1, marginVertical: 4 },
    card: { flex: 1, borderRadius: RADIUS, borderWidth: 1, padding: 14, marginLeft: 10, marginBottom: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardCategory: { fontSize: 12, marginTop: 2 },
    badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    desc: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
    link: { fontSize: 13, marginBottom: 10 },
    stepper: { borderTopWidth: 1, paddingTop: 10, marginTop: 4, flexDirection: 'row', gap: 6 },
    stepBtn: { flex: 1, borderRadius: 8, paddingVertical: 6, alignItems: 'center', borderWidth: 1 },
    stepText: { fontSize: 11, fontWeight: '600' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    emptyMsg: { textAlign: 'center', lineHeight: 22 },
});
