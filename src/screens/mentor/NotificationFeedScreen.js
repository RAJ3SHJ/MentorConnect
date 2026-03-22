import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Dimensions, Platform, Modal, TextInput, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
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
function FeedbackDrawer({ visible, notification, onClose, onSubmitted }) {
    const [rating, setRating] = useState(0);
    const [verdict, setVerdict] = useState(null); // 'Approved' | 'Needs Improvement'
    const [comment, setComment] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const submit = async () => {
        if (!verdict) { toast.show('Please select a verdict', 'error'); return; }
        if (!rating) { toast.show('Please give a star rating', 'error'); return; }
        setSaving(true);
        try {
            await api.post(`/api/mentor/feedback/${notification.reference_id}`, { rating, verdict, comment });
            toast.show('Feedback submitted! ✅', 'success');
            onSubmitted();
            onClose();
            setRating(0); setVerdict(null); setComment('');
        } catch (e) {
            toast.show(e.response?.data?.error || 'Failed to submit', 'error');
        } finally { setSaving(false); }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={fd.overlay}>
                <View style={fd.drawer}>
                    <LinearGradient colors={['#0d1f35', '#06111f']} style={StyleSheet.absoluteFillObject} />
                    <View style={{ borderBottomWidth: 1, borderColor: 'rgba(0,210,255,0.15)', paddingBottom: 16, marginBottom: 20 }}>
                        <Text style={fd.title}>📊 Exam Feedback</Text>
                        <Text style={fd.sub}>{notification?.student_name} · {notification?.reference_title}</Text>
                    </View>

                    <Text style={fd.label}>STAR RATING</Text>
                    <StarRating value={rating} onChange={setRating} />

                    <Text style={fd.label}>VERDICT</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                        {['Approved', 'Needs Improvement'].map(v => (
                            <TouchableOpacity key={v}
                                style={[fd.verdictBtn,
                                    verdict === v && { borderColor: v === 'Approved' ? '#00f260' : '#ff4757', backgroundColor: v === 'Approved' ? 'rgba(0,242,96,0.1)' : 'rgba(255,71,87,0.1)' }
                                ]}
                                onPress={() => setVerdict(v)}>
                                <Text style={[fd.verdictText, verdict === v && { color: v === 'Approved' ? '#00f260' : '#ff4757', fontWeight: '800' }]}>
                                    {v === 'Approved' ? '✅ Approved' : '⚠️ Needs Improvement'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={fd.label}>COMMENTS (optional)</Text>
                    <TextInput
                        style={fd.textArea}
                        placeholder="Write your feedback for the student..."
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        value={comment}
                        onChangeText={setComment}
                        multiline
                        numberOfLines={4}
                    />

                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                        <TouchableOpacity style={fd.cancelBtn} onPress={onClose}>
                            <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '600' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={fd.submitBtn} onPress={submit} disabled={saving}>
                            <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={fd.submitInner}>
                                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                                    {saving ? 'Submitting…' : 'Submit Feedback ➔'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

// ── Main Notification Feed ──
export default function NotificationFeedScreen() {
    const { user } = useAuth();
    const toast = useToast();
    const [notifications, setNotifications] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [feedbackTarget, setFeedbackTarget] = useState(null);
    const [connecting, setConnecting] = useState(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/api/mentor/notifications');
            setNotifications(res.data);
        } catch (e) { console.log('Notification fetch error:', e.message); }
    };

    useFocusEffect(useCallback(() => { fetchNotifications(); }, []));
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
                ? '⚡ Another mentor just claimed this student!'
                : msg, 'error');
            fetchNotifications(); // refresh to remove card
        } finally { setConnecting(null); }
    };

    const TriggerBadge = ({ type }) => (
        <View style={[s.badge, { backgroundColor: type === 'exam' ? 'rgba(138,43,226,0.2)' : 'rgba(0,210,255,0.15)', borderColor: type === 'exam' ? 'rgba(138,43,226,0.5)' : 'rgba(0,210,255,0.4)' }]}>
            <Text style={[s.badgeText, { color: type === 'exam' ? '#bf80ff' : '#00d2ff' }]}>
                {type === 'exam' ? '📝 EXAM SUBMITTED' : '✅ COURSE COMPLETED'}
            </Text>
        </View>
    );

    return (
        <View style={s.container}>
            <LinearGradient colors={['#040a18', '#0B132B']} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glowOrb, { backgroundColor: '#8a2be2', top: -80, right: -80 }]} />

            <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />}>
                <Text style={s.heading}>🔔 Student Alerts</Text>
                <Text style={s.sub}>{notifications.length} student{notifications.length !== 1 ? 's' : ''} awaiting review</Text>

                {notifications.length === 0 ? (
                    <View style={s.emptyState}>
                        <Text style={{ fontSize: 48, marginBottom: 16 }}>🎉</Text>
                        <Text style={s.emptyTitle}>All caught up!</Text>
                        <Text style={s.emptySub}>No new student alerts. Check back after students submit exams or complete courses.</Text>
                    </View>
                ) : notifications.map(n => (
                    <View key={n.id} style={[s.card, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <LinearGradient colors={['rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFillObject} />

                        <View style={s.cardHeader}>
                            <View style={s.avatar}><Text style={{ fontSize: 24 }}>🎓</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.studentName}>{n.student_name}</Text>
                                <Text style={s.studentEmail}>{n.student_email}</Text>
                            </View>
                            <TriggerBadge type={n.trigger_type} />
                        </View>

                        <View style={s.cardBody}>
                            <Text style={s.refTitle}>{n.reference_title || 'Unknown'}</Text>
                            <Text style={s.timestamp}>
                                {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>

                        <View style={s.cardActions}>
                            {n.trigger_type === 'exam' && (
                                <TouchableOpacity style={s.feedbackBtn} onPress={() => setFeedbackTarget(n)}>
                                    <Text style={s.feedbackBtnText}>📊 Give Feedback</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                style={[s.connectBtn, connecting === n.student_id && { opacity: 0.6 }]}
                                onPress={() => handleConnect(n)}
                                disabled={!!connecting}
                            >
                                <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={s.connectInner}>
                                    <Text style={s.connectText}>
                                        {connecting === n.student_id ? 'Connecting…' : '🔗 Connect'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <FeedbackDrawer
                visible={!!feedbackTarget}
                notification={feedbackTarget}
                onClose={() => setFeedbackTarget(null)}
                onSubmitted={fetchNotifications}
            />
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
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    studentName: { fontSize: 18, color: '#fff', fontWeight: '700', marginBottom: 2 },
    studentEmail: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
    badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

    cardBody: { borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 16, marginBottom: 20 },
    refTitle: { fontSize: 16, color: '#fff', fontWeight: '600', marginBottom: 4 },
    timestamp: { fontSize: 12, color: 'rgba(255,255,255,0.3)' },

    cardActions: { flexDirection: 'row', gap: 12 },
    feedbackBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(138,43,226,0.1)', borderWidth: 1, borderColor: 'rgba(138,43,226,0.3)', alignItems: 'center' },
    feedbackBtnText: { color: '#bf80ff', fontWeight: '700', fontSize: 13 },
    connectBtn: { flex: 1 },
    connectInner: { paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    connectText: { color: '#fff', fontWeight: '800', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
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
