import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Dimensions, Platform, Modal, TextInput, Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

// ── Star Rating Component ──
function StarRating({ value, onChange }) {
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12, justifyContent: 'center' }}>
            {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => onChange(star)}>
                    <Text style={{ fontSize: 36, opacity: star <= value ? 1 : 0.2 }}>⭐</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ── Feedback Drawer Modal ──


// ── Main Notification Feed ──
export default function NotificationFeedScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const toast = useToast();
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [connecting, setConnecting] = useState(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/mentor/notifications');
            setNotifications(res.data);
        } catch (e) { console.log('Notification fetch error:', e.message); }
    };

    useEffect(() => {
        fetchNotifications();

        // Subscribe to changes in mentor_notifications for real-time list updates
        const channel = supabase
            .channel('mentor-notifs-feed')
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'mentor_notifications' }, 
                () => {
                    console.log('🔄 List change detected, refreshing feed...');
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);
    const onRefresh = async () => { setRefreshing(true); await fetchNotifications(); setRefreshing(false); };

    const handleConnect = async (notification) => {
        if (connecting) return;
        setConnecting(notification.student_id);
        try {
            await api.post(`/api/mentor/connect/${notification.student_id}`);
            toast.show(`🔗 Connected with ${notification.student_name}!`, 'success');
            fetchNotifications(); // refresh list — this notification vanishes
        } catch (e) {
            const msg = e.response?.data?.error || 'Connection failed';
            toast.show(msg === 'Student already connected to another mentor'
                ? '⚡ Another mentor just claimed this learner!'
                : msg, 'error');
            fetchNotifications(); // refresh to remove card
        } finally { setConnecting(null); }
    };

    const TriggerBadge = ({ type }) => {
        let color = '#00d2ff';
        let bg = 'rgba(0,210,255,0.15)';
        let border = 'rgba(0,210,255,0.4)';
        let label = '✅ COURSE COMPLETED';

        if (type === 'exam') {
            color = '#bf80ff';
            bg = 'rgba(138,43,226,0.2)';
            border = 'rgba(138,43,226,0.5)';
            label = '📝 EXAM SUBMITTED';
        } else if (type === 'skills') {
            color = '#ff9f43';
            bg = 'rgba(255,159,67,0.15)';
            border = 'rgba(255,159,67,0.4)';
            label = '🎯 SKILLS SUBMITTED';
        }

        return (
            <View style={[s.badge, { backgroundColor: bg, borderColor: border }]}>
                <Text style={[s.badgeText, { color }]}>{label}</Text>
            </View>
        );
    };

    const groupedNotifications = notifications.reduce((acc, n) => {
        if (!acc[n.student_id]) {
            acc[n.student_id] = {
                student_id: n.student_id,
                student_name: n.student_name,
                student_email: n.student_email,
                alerts: []
            };
        }
        acc[n.student_id].alerts.push(n);
        return acc;
    }, {});
    const groupedList = Object.values(groupedNotifications);

    return (
        <View style={s.container}>
            <LinearGradient colors={['#040a18', '#0B132B']} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glowOrb, { backgroundColor: '#8a2be2', top: -80, right: -80 }]} />

            <ScrollView 
                contentContainerStyle={[s.scroll, { paddingTop: insets.top > 0 ? insets.top : 20, paddingBottom: insets.bottom + 100 }]} 
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />}
            >
                <Text style={s.heading}>🔔 Learner Alerts</Text>
                <Text style={s.sub}>{groupedList.length} learner{groupedList.length !== 1 ? 's' : ''} awaiting review</Text>

                {groupedList.length === 0 ? (
                    <View style={s.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                        <Text style={s.emptyTitle}>All caught up!</Text>
                        <Text style={s.emptySub}>No new learner alerts. Check back after learners submit exams or complete courses.</Text>
                    </View>
                ) : groupedList.map(student => (
                    <View
                        key={student.student_id}
                        style={[s.card, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}
                    >
                        <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFillObject} />

                        {/* Student Info Header */}
                        <View style={s.cardHeader}>
                            <View style={s.avatar}><Text style={{ fontSize: 24 }}>🎓</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.studentName}>{student.student_name || 'Learner'}</Text>
                                <Text style={s.studentEmail}>{student.student_email}</Text>
                            </View>
                        </View>

                        {/* Stacked Pending Items */}
                        <View style={s.cardBody}>
                            <Text style={s.sectionLabel}>Pending Submissions:</Text>
                            {student.alerts.map((alert, idx) => (
                                <TouchableOpacity 
                                    key={alert.id}
                                    style={[s.alertItem, idx > 0 && s.alertDivider]}
                                    onPress={() => navigation.navigate('AlertDetail', { alert })}
                                    activeOpacity={0.7}
                                >
                                    <View style={s.alertMain}>
                                        <TriggerBadge type={alert.trigger_type} />
                                        <Text style={s.alertTitle}>{alert.reference_title || 'Assessment'}</Text>
                                    </View>
                                    <View style={s.alertMeta}>
                                        <Text style={s.timestamp}>
                                            {new Date(alert.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                        <Text style={s.viewLink}>View Details →</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Connect Button (Consolidated) */}
                        <TouchableOpacity
                            style={[s.connectBtn, connecting === student.student_id && { opacity: 0.6 }]}
                            onPress={() => handleConnect(student.alerts[0])}
                            disabled={!!connecting}
                        >
                            <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={s.connectInner}>
                                <Text style={s.connectText}>
                                    {connecting === student.student_id ? '🔄 Connecting…' : '🔗 Connect with Learner'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#040a18' },
    glowOrb: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15 },
    scroll: { padding: isMobile ? 20 : 40, paddingBottom: 100 },
    heading: { fontSize: 32, fontWeight: '800', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
    sub: { fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 32, textTransform: 'uppercase', letterSpacing: 1 },

    emptyState: { alignItems: 'center', paddingVertical: 80 },
    emptyTitle: { fontSize: 24, color: '#fff', fontWeight: '800', marginBottom: 12 },
    emptySub: { fontSize: 15, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 22, maxWidth: 380 },

    card: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 24, padding: 24, marginBottom: 20, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    studentName: { fontSize: 18, color: '#fff', fontWeight: '700', marginBottom: 2 },
    studentEmail: { fontSize: 13, color: 'rgba(255,255,255,0.3)', marginBottom: 4 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    cardBody: { backgroundColor: 'rgba(255,255,255,0.015)', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    sectionLabel: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    alertItem: { paddingVertical: 8 },
    alertDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 12, paddingTop: 16 },
    alertMain: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    alertTitle: { fontSize: 15, color: '#fff', fontWeight: '600' },
    alertMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timestamp: { fontSize: 12, color: 'rgba(255,255,255,0.25)' },
    viewLink: { fontSize: 12, color: '#00d2ff', fontWeight: '700' },

    connectBtn: { width: '100%' },
    connectInner: { paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    connectText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.8 },
});

const fd = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    drawer: { backgroundColor: '#0d1f35', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 32, paddingBottom: 48, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,210,255,0.1)' },
    title: { fontSize: 22, color: '#fff', fontWeight: '800', marginBottom: 4 },
    sub: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
    label: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    verdictBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)' },
    verdictText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' },
    textArea: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 14, minHeight: 100, textAlignVertical: 'top' },
    cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    submitBtn: { flex: 2 },
    submitInner: { paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
});
