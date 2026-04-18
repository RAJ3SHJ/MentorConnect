import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function AlertDetailScreen({ route, navigation }) {
    const { alert } = route.params;
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);

    // Review state
    const [skillsFeedback, setSkillsFeedback] = useState('');
    const [examsFeedback, setExamsFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [reviewed, setReviewed] = useState(false);

    const studentId = alert?.student_id;

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        Promise.all([
            api.get(`/api/mentor/student-detail/${studentId}`),
            alert?.id ? api.patch(`/api/notifications/${alert.id}/read`).catch(() => { }) : Promise.resolve(),
        ]).then(([res]) => {
            setDetail(res.data);
            // Pre-fill if already reviewed
            if (res.data.skills?.status && res.data.skills.status !== 'Pending Review') {
                setSkillsFeedback(res.data.skills.mentor_remarks || '');
                setReviewed(true);
            }
            // Also pre-fill exams feedback from the first submission if available
            if (res.data.submissions?.length > 0 && res.data.submissions[0].mentor_remarks) {
                setExamsFeedback(res.data.submissions[0].mentor_remarks);
            }
        }).catch(console.log).finally(() => setLoading(false));
    }, [studentId]);

    const handleConnect = async () => {
        if (connecting) return;

        const doConnect = async () => {
            setConnecting(true);
            try {
                await api.post(`/api/mentor/connect/${studentId}`);
                toast.show(`🔗 Connected! You can now review assessments.`, 'success');
                // Refresh detail to unlock review panel
                const res = await api.get(`/api/mentor/student-detail/${studentId}`);
                setDetail(res.data);
            } catch (e) {
                const msg = e.response?.data?.error || 'Connection failed';
                toast.show(msg === 'Student already connected to another mentor'
                    ? '⚡ Student already has a mentor' : msg, 'error');
            } finally { setConnecting(false); }
        };

        // On web, skip native Alert dialog — just connect directly
        if (Platform.OS === 'web') {
            doConnect();
        } else {
            Alert.alert(
                'Connect with Student',
                `Connect with ${detail?.student?.name}? They will be added to your roster.`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Connect', onPress: doConnect }
                ]
            );
        }
    };

    const handleUnifiedReview = async () => {
        // Validation: At least one feedback should be provided if assessments exist
        if (!skillsFeedback && !examsFeedback) {
            toast.show('Please provide feedback for at least one assessment', 'warning');
            return;
        }

        setSaving(true);
        try {
            await api.post(`/api/mentor/unified-review/${studentId}`, {
                skillRemarks: skillsFeedback,
                examRemarks: examsFeedback,
            });
            setReviewed(true);
            toast.show('Unified review submitted! ✅', 'success');
            // Refresh detail to show updated statuses
            const res = await api.get(`/api/mentor/student-detail/${studentId}`);
            setDetail(res.data);

            // Navigate to Dashboard tab after 1 second so user sees learner in active roster
            setTimeout(() => {
                const parent = navigation.getParent();
                if (parent) {
                    parent.navigate('Dashboard', { screen: 'MentorHome' });
                } else {
                    navigation.navigate('Dashboard', { screen: 'MentorHome' });
                }
            }, 1000);
        } catch (e) {
            toast.show(e.response?.data?.error || 'Failed to save review', 'error');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <LinearGradient colors={gradients.bg} style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.blue} size="large" />
            </LinearGradient>
        );
    }

    if (!detail) return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[s.back, { color: colors.muted }]}>← Back</Text>
                </TouchableOpacity>
            </View>
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
                <Text style={{ color: colors.white, fontSize: 18, fontWeight: '700' }}>No details available</Text>
                <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8 }}>
                    The learner data could not be loaded.
                </Text>
            </View>
        </LinearGradient>
    );

    const { student, skills, submissions } = detail;

    const resultOptions = [
        { value: 'Approved', emoji: '✅', label: 'Approved', color: colors.success },
        { value: 'Needs Improvement', emoji: '🔄', label: 'Needs Work', color: colors.danger },
    ];

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[s.back, { color: colors.muted }]}>← Back</Text>
                </TouchableOpacity>
                <View style={s.profileRow}>
                    <View style={[s.avatar, { backgroundColor: colors.blue + '20' }]}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.title, { color: colors.white }]}>{student.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 13 }}>{student.email}</Text>
                    </View>
                    {/* Connect Button in Header - Hide if already connected */}
                    <TouchableOpacity
                        style={[
                            s.connectBtn, 
                            { borderColor: detail.isConnected ? colors.success + '55' : colors.blue + '55', opacity: connecting ? 0.6 : 1 }
                        ]}
                        onPress={handleConnect}
                        disabled={connecting || detail.isConnected}
                    >
                        <LinearGradient 
                            colors={detail.isConnected ? ['#00f260', '#0575E6'] : ['#00d2ff', '#3a7bd5']} 
                            style={s.connectBtnInner}
                        >
                            <Text style={s.connectBtnText}>
                                {connecting ? '…' : detail.isConnected ? '✅ Connected' : '🔗 Connect'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: insets.bottom + 40 }]}>
                {/* Skills / Goal Card */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>🎯 Skills Assessment</Text>
                    {skills ? (
                        <>
                            <Text style={[s.label, { color: colors.muted }]}>Goal</Text>
                            <Text style={[s.value, { color: colors.white }]}>{skills.goal || '—'}</Text>
                            <Text style={[s.label, { color: colors.muted }]}>Skills</Text>
                            <View style={s.tagsWrap}>
                                {(Array.isArray(skills.skills) ? skills.skills : []).map((sk, i) => (
                                    <View key={i} style={[s.tag, { backgroundColor: colors.blue + '12', borderColor: colors.blue + '33' }]}>
                                        <Text style={[s.tagText, { color: colors.blue }]}>{sk}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 4 }}>
                                Submitted: {new Date(skills.submitted_at).toLocaleDateString()}
                            </Text>

                            {/* ── Inline Skills Review Panel ── */}
                            <View style={[s.reviewDivider, { backgroundColor: colors.glassBorder }]} />
                            
                            {!detail.isConnected ? (
                                <View style={[s.lockedPanel, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                                    <View style={[s.lockIcon, { backgroundColor: colors.gold + '15' }]}>
                                        <Text style={{ fontSize: 24 }}>🔒</Text>
                                    </View>
                                    <Text style={[s.lockedTitle, { color: colors.white }]}>Reviews Locked</Text>
                                    <Text style={[s.lockedSub, { color: colors.muted }]}>
                                        Click the "Connect" button in the header to unlock assessment reviews for this student.
                                    </Text>
                                </View>
                            ) : (
                                <>
                                    <Text style={[s.cardTitle, { color: colors.white, marginBottom: 12, marginTop: 8 }]}>
                                        📊 {reviewed ? 'Review Submitted' : 'Submit Master Review (Skills & Exams)'}
                                    </Text>

                                    {reviewed && (
                                        <View style={[s.reviewedBanner, { backgroundColor: colors.success + '10', borderColor: colors.success + '33' }]}>
                                            <Text style={{ color: colors.success, fontWeight: '700', marginBottom: 8 }}>✅ Review Processed</Text>
                                            {skillsFeedback ? (
                                                <View style={{ marginBottom: 8 }}>
                                                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>SKILLS FEEDBACK:</Text>
                                                    <Text style={{ color: colors.white, fontSize: 13, marginTop: 2 }}>{skillsFeedback}</Text>
                                                </View>
                                            ) : null}
                                            {examsFeedback ? (
                                                <View>
                                                    <Text style={{ color: colors.muted, fontSize: 11, fontWeight: '700' }}>EXAM FEEDBACK:</Text>
                                                    <Text style={{ color: colors.white, fontSize: 13, marginTop: 2 }}>{examsFeedback}</Text>
                                                </View>
                                            ) : null}
                                            <TouchableOpacity onPress={() => setReviewed(false)} style={{ marginTop: 12 }}>
                                                <Text style={{ color: colors.blue, fontSize: 13, fontWeight: '600' }}>✏️ Edit Feedback</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}

                                    {!reviewed && (
                                        <>
                                            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 8 }}>SKILL ASSESSMENT FEEDBACK</Text>
                                            <TextInput
                                                style={[s.input, { borderColor: colors.glassBorder, color: colors.white, marginTop: 8, height: 80 }]}
                                                placeholder="Provide feedback on learner's skills & goals..."
                                                placeholderTextColor={colors.muted}
                                                value={skillsFeedback}
                                                onChangeText={setSkillsFeedback}
                                                multiline
                                            />

                                            <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 16 }}>EXAM ASSESSMENT FEEDBACK</Text>
                                            <TextInput
                                                style={[s.input, { borderColor: colors.glassBorder, color: colors.white, marginTop: 8, height: 80 }]}
                                                placeholder="Provide feedback on exam performance..."
                                                placeholderTextColor={colors.muted}
                                                value={examsFeedback}
                                                onChangeText={setExamsFeedback}
                                                multiline
                                            />

                                            <TouchableOpacity
                                                onPress={handleUnifiedReview}
                                                disabled={saving}
                                                style={{ marginTop: 20 }}
                                            >
                                                <LinearGradient
                                                    colors={gradients.accent}
                                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                    style={s.submitBtn}
                                                >
                                                    <Text style={s.submitBtnText}>
                                                        {saving ? 'Processing...' : '💾 Submit Master Review'}
                                                    </Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </>
                            )}
                        </>
                    ) : (
                        <Text style={{ color: colors.muted, fontSize: 14, fontStyle: 'italic' }}>
                            No skills assessment submitted yet.
                        </Text>
                    )}
                </View>

                {/* Exam Submissions */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>📤 Exam Submissions</Text>
                    {submissions.length === 0 ? (
                        <Text style={{ color: colors.muted, fontSize: 14, fontStyle: 'italic' }}>
                            No exams submitted yet.
                        </Text>
                    ) : submissions.map(sub => {
                        const statusColor = sub.status === 'Approved' ? colors.success
                            : sub.status === 'Needs Improvement' ? colors.danger : colors.gold;
                        return (
                            <View key={sub.id} style={[s.submissionRow, { borderBottomColor: colors.glassBorder }]}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.examTitle, { color: colors.white }]}>{sub.exam_title}</Text>
                                    <Text style={{ color: colors.muted, fontSize: 12, marginTop: 3 }}>
                                        Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                                    </Text>
                                    {sub.mentor_remarks ? (
                                        <Text style={{ color: colors.gold, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>
                                            💬 {sub.mentor_remarks}
                                        </Text>
                                    ) : null}
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                    <View style={[s.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '44' }]}>
                                        <Text style={[s.statusText, { color: statusColor }]}>{sub.status}</Text>
                                    </View>
                                    {/* Exam Assessment - Review button */}
                                    <TouchableOpacity 
                                        style={[s.miniReviewBtn, { borderColor: colors.blue + '44' }]}
                                        onPress={() => navigation.navigate('Validation', {
                                            submissionId: sub.id,
                                            examTitle: sub.exam_title,
                                            studentName: student.name,
                                            studentId: student.id,
                                            studentEmail: student.email,
                                            answers: sub.answers,
                                            existingStatus: sub.status,
                                            existingRemarks: sub.mentor_remarks
                                        })}
                                    >
                                        <Text style={[s.miniReviewText, { color: colors.blue }]}>🔍 Review Answers</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 12 },
    back: { fontSize: 15, marginBottom: 16 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    connectBtn: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
    connectBtnInner: { paddingHorizontal: 14, paddingVertical: 8 },
    connectBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    scroll: { padding: 24, paddingTop: 0 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
    value: { fontSize: 14, lineHeight: 22 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    tag: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
    tagText: { fontSize: 12, fontWeight: '600' },
    reviewDivider: { height: 1, marginVertical: 16 },
    optionsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    optionBtn: { flex: 1, borderRadius: 14, borderWidth: 2, padding: 16, alignItems: 'center' },
    optionLabel: { fontSize: 12, fontWeight: '700' },
    input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, fontSize: 14, borderWidth: 1, height: 90, textAlignVertical: 'top' },
    submitBtn: { borderRadius: RADIUS, paddingVertical: 13, alignItems: 'center' },
    submitBtnText: { fontWeight: '700', fontSize: 15 },
    reviewedBanner: { borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 4 },
    submissionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
    examTitle: { fontSize: 14, fontWeight: '700' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700' },
    reviewBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, backgroundColor: 'rgba(66,133,244,0.06)' },
    reviewBtnText: { fontSize: 12, fontWeight: '700' },
    connectedTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    lockedPanel: { borderRadius: RADIUS, borderWidth: 1, padding: 24, alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,255,255,0.02)' },
    lockIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    lockedTitle: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
    lockedSub: { fontSize: 14, textAlign: 'center', lineHeight: 22, opacity: 0.7 },
    miniReviewBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, backgroundColor: 'rgba(0,210,255,0.05)', marginTop: 8 },
    miniReviewText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
