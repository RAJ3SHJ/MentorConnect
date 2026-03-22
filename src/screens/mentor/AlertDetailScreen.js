import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { RADIUS } from '../../theme';

export default function AlertDetailScreen({ route, navigation }) {
    const { alert } = route.params;
    const { colors, gradients } = useTheme();
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    const studentId = alert?.student_id;

    useEffect(() => {
        if (!studentId) { setLoading(false); return; }
        Promise.all([
            api.get(`/api/mentor/student-detail/${studentId}`),
            alert?.id ? api.patch(`/api/notifications/${alert.id}/read`).catch(() => { }) : Promise.resolve(),
        ]).then(([res]) => {
            setDetail(res.data);
        }).catch(console.log).finally(() => setLoading(false));
    }, [studentId]);

    if (loading) {
        return (
            <LinearGradient colors={gradients.bg} style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.blue} size="large" />
            </LinearGradient>
        );
    }

    if (!detail) return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
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

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[s.back, { color: colors.muted }]}>← Back</Text>
                </TouchableOpacity>
                <View style={s.profileRow}>
                    <View style={[s.avatar, { backgroundColor: colors.blue + '20' }]}>
                        <Text style={{ fontSize: 24 }}>👤</Text>
                    </View>
                    <View>
                        <Text style={[s.title, { color: colors.white }]}>{student.name}</Text>
                        <Text style={{ color: colors.muted, fontSize: 13 }}>{student.email}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                {/* Skills / Goal */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>🎯 Skills Assessment</Text>
                    {skills ? (
                        <>
                            <Text style={[s.label, { color: colors.muted }]}>Goal</Text>
                            <Text style={[s.value, { color: colors.white }]}>{skills.goal || '—'}</Text>
                            <Text style={[s.label, { color: colors.muted }]}>Skills</Text>
                            <View style={s.tagsWrap}>
                                {skills.skills.map((sk, i) => (
                                    <View key={i} style={[s.tag, { backgroundColor: colors.blue + '12', borderColor: colors.blue + '33' }]}>
                                        <Text style={[s.tagText, { color: colors.blue }]}>{sk}</Text>
                                    </View>
                                ))}
                            </View>
                            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 8 }}>
                                Submitted: {new Date(skills.submitted_at).toLocaleDateString()}
                            </Text>
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
                                    <TouchableOpacity
                                        style={[s.reviewBtn, { borderColor: colors.blue + '33' }]}
                                        onPress={() => navigation.navigate('Validation', {
                                            submissionId: sub.id,
                                            examTitle: sub.exam_title,
                                            studentName: student.name,
                                            answers: sub.answers,
                                            existingStatus: sub.status,
                                            existingRemarks: sub.mentor_remarks,
                                        })}
                                    >
                                        <Text style={[s.reviewBtnText, { color: colors.blue }]}>
                                            {sub.status === 'Pending Review' ? '📝 Review' : '✏️ Edit'}
                                        </Text>
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
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
    back: { fontSize: 15, marginBottom: 16 },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    scroll: { padding: 24, paddingTop: 0 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 },
    value: { fontSize: 14, lineHeight: 22 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    tag: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
    tagText: { fontSize: 12, fontWeight: '600' },
    submissionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
    examTitle: { fontSize: 14, fontWeight: '700' },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    statusText: { fontSize: 11, fontWeight: '700' },
    reviewBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, backgroundColor: 'rgba(66,133,244,0.06)' },
    reviewBtnText: { fontSize: 12, fontWeight: '700' },
});
