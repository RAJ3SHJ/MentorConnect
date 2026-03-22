import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function MentorDashboardScreen({ navigation }) {
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [alerts, setAlerts] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAlerts = async () => {
        try { const res = await api.get('/api/notifications'); setAlerts(res.data); }
        catch (e) { console.log(e.message); }
    };

    useFocusEffect(useCallback(() => { fetchAlerts(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchAlerts(); setRefreshing(false); };

    const markRead = async (id) => {
        try {
            await api.patch(`/api/notifications/${id}/read`);
            setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: 1 } : a));
            toast.show('Marked as read', 'info');
        } catch { toast.show('Failed to update', 'error'); }
    };

    const typeInfo = (type) => {
        if (type === 'skill_assessment') return { emoji: '🎯', label: 'Skill Assessment', color: colors.blue, bg: colors.blue + '12' };
        if (type === 'exam_submitted') return { emoji: '📤', label: 'Exam Submitted', color: colors.purple, bg: colors.purple + '12' };
        return { emoji: '🔔', label: 'Notification', color: colors.gold, bg: colors.gold + '12' };
    };

    const unread = alerts.filter(a => !a.is_read).length;

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <ScrollView contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>

                <Text style={[s.title, { color: colors.white }]}>Mentor Hub 👨‍🏫</Text>
                <Text style={[s.subtitle, { color: colors.muted }]}>
                    {alerts.length} alert{alerts.length !== 1 ? 's' : ''}{unread > 0 ? ` • ${unread} unread` : ''}
                </Text>

                {/* Quick Actions */}
                <View style={s.actions}>
                    {[
                        { icon: '🔗', label: 'Link Learner', screen: 'LinkStudent', color: colors.blue },
                        { icon: '📚', label: 'Assign Courses', screen: 'AssignCourses', color: colors.gold },
                    ].map(a => (
                        <TouchableOpacity key={a.label} style={[s.actionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                            onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
                            <Text style={{ fontSize: 28, marginBottom: 8 }}>{a.icon}</Text>
                            <Text style={[s.actionLabel, { color: a.color }]}>{a.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Alerts */}
                <Text style={[s.sectionTitle, { color: colors.white }]}>📬 Learner Alerts</Text>

                {alerts.length === 0 ? (
                    <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>📭</Text>
                        <Text style={[s.emptyTitle, { color: colors.white }]}>No alerts yet</Text>
                        <Text style={{ color: colors.muted, textAlign: 'center', lineHeight: 22 }}>
                            Learner submissions will appear here.
                        </Text>
                    </View>
                ) : alerts.map(alert => {
                    const info = typeInfo(alert.type);
                    return (
                        <View key={alert.id} style={[s.alertCard, { backgroundColor: colors.card, borderColor: colors.glassBorder, borderLeftColor: info.color, borderLeftWidth: 3, opacity: alert.is_read ? 0.6 : 1 }]}>
                            <View style={s.alertHeader}>
                                <View style={[s.alertIcon, { backgroundColor: info.bg }]}>
                                    <Text style={{ fontSize: 20 }}>{info.emoji}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.alertLabel, { color: info.color }]}>{info.label}</Text>
                                    <Text style={[s.alertStudent, { color: colors.white }]}>{alert.student_name}</Text>
                                    <Text style={[s.alertEmail, { color: colors.muted }]}>{alert.student_email}</Text>
                                </View>
                                {!alert.is_read && (
                                    <View style={[s.newBadge, { backgroundColor: info.color }]}>
                                        <Text style={s.newBadgeText}>NEW</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={[s.alertDate, { color: colors.muted }]}>
                                {new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <View style={s.alertActions}>
                                <TouchableOpacity style={[s.alertBtn, { borderColor: colors.blue + '33' }]}
                                    onPress={() => navigation.navigate('AlertDetail', { alert })}>
                                    <Text style={[s.alertBtnText, { color: colors.blue }]}>View Details</Text>
                                </TouchableOpacity>
                                {!alert.is_read && (
                                    <TouchableOpacity style={[s.alertBtn, { borderColor: colors.success + '33' }]}
                                        onPress={() => markRead(alert.id)}>
                                        <Text style={[s.alertBtnText, { color: colors.success }]}>✓ Read</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, marginTop: 4, marginBottom: 20 },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    actionCard: { flex: 1, borderRadius: RADIUS, borderWidth: 1, padding: 20, alignItems: 'center' },
    actionLabel: { fontWeight: '700', fontSize: 13 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: -0.3 },
    emptyCard: { borderRadius: RADIUS, borderWidth: 1, padding: 32, alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    alertCard: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 12 },
    alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    alertLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    alertStudent: { fontSize: 15, fontWeight: '700', marginTop: 2 },
    alertEmail: { fontSize: 12, marginTop: 1 },
    newBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    newBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    alertDate: { fontSize: 11, marginBottom: 10 },
    alertActions: { flexDirection: 'row', gap: 8 },
    alertBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    alertBtnText: { fontWeight: '600', fontSize: 13 },
});
