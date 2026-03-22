import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function TakeExamScreen({ route, navigation }) {
    const { examId, examTitle } = route.params;
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [exam, setExam] = useState(null);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        api.get(`/api/exams/${examId}`)
            .then(res => setExam(res.data))
            .catch(e => toast.show('Failed to load exam', 'error'))
            .finally(() => setLoading(false));
    }, []);

    const selectAnswer = (qId, opt) => setAnswers(prev => ({ ...prev, [qId]: opt }));

    const submit = () => {
        if (!exam) return;
        const answered = Object.keys(answers).length;
        const total = exam.questions.length;
        if (answered < total) { toast.show(`Answer all questions (${answered}/${total})`, 'warning'); return; }

        const doSubmit = async () => {
            setSubmitting(true);
            try {
                const ansArray = exam.questions.map(q => ({ question_id: q.id, selected: answers[q.id] }));
                await api.post(`/api/exams/${examId}/submit`, { answers: ansArray });
                setSubmitted(true);
                toast.show('Exam submitted successfully! 🎉', 'success');
            } catch (e) { toast.show(e.response?.data?.error || 'Submission failed', 'error'); }
            finally { setSubmitting(false); }
        };

        if (Platform.OS === 'web') {
            if (window.confirm('Submit this exam? You cannot change answers after.')) doSubmit();
        } else {
            const { Alert } = require('react-native');
            Alert.alert('Submit', 'Are you sure?', [{ text: 'Cancel' }, { text: 'Submit', onPress: doSubmit }]);
        }
    };

    if (loading) return (
        <LinearGradient colors={gradients.bg} style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator color={colors.blue} size="large" />
        </LinearGradient>
    );

    if (submitted) return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.submittedWrap}>
                <View style={[s.submittedCircle, { backgroundColor: colors.success + '15' }]}><Text style={{ fontSize: 48 }}>✅</Text></View>
                <Text style={[s.submittedTitle, { color: colors.success }]}>Exam Submitted!</Text>
                <Text style={{ color: colors.white, fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 }}>
                    Your exam "{examTitle}" has been submitted successfully.
                </Text>
                <View style={[s.reviewBanner, { borderColor: colors.gold + '33' }]}>
                    <Text style={{ fontSize: 20, marginBottom: 8 }}>⏳</Text>
                    <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 6 }}>Under Review</Text>
                    <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 }}>Exam is being assessed and it is under review.{"\n"}Mentor will be notified.</Text>
                </View>
                <Text style={{ color: colors.muted, fontSize: 12, fontStyle: 'italic', marginBottom: 20 }}>
                    Submitted: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85} style={{ width: '100%' }}>
                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.backGrad}>
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>← Back to Assessments</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 12 }}>← Back</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: colors.white }]}>{examTitle}</Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 10 }}>
                    {Object.keys(answers).length} / {exam?.questions?.length || 0} answered
                </Text>
                <View style={[s.progressTrack]}>
                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={[s.progressFill, { width: `${exam?.questions?.length ? (Object.keys(answers).length / exam.questions.length) * 100 : 0}%` }]} />
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
                {exam?.questions?.map((q, idx) => (
                    <View key={q.id} style={[s.questionCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <View style={s.qHeader}>
                            <LinearGradient colors={gradients.accent} style={s.qNumBadge}>
                                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{idx + 1}</Text>
                            </LinearGradient>
                            <Text style={{ color: colors.white, fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 22 }}>{q.question_text}</Text>
                        </View>
                        {['a', 'b', 'c', 'd'].map(opt => {
                            const val = q[`option_${opt}`];
                            const selected = answers[q.id] === opt;
                            return (
                                <TouchableOpacity key={opt}
                                    style={[s.option, { borderColor: selected ? colors.blue : colors.glassBorder, backgroundColor: selected ? colors.blue + '10' : 'rgba(255,255,255,0.04)' }]}
                                    onPress={() => selectAnswer(q.id, opt)} activeOpacity={0.8}>
                                    <View style={[s.optCircle, selected && { backgroundColor: colors.blue, borderColor: colors.blue }, !selected && { borderColor: colors.muted }]}>
                                        <Text style={{ color: selected ? '#FFF' : colors.muted, fontWeight: '700', fontSize: 12 }}>{opt.toUpperCase()}</Text>
                                    </View>
                                    <Text style={{ color: selected ? colors.white : colors.muted, fontSize: 14, flex: 1, fontWeight: selected ? '600' : '400' }}>{val}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
                <TouchableOpacity onPress={submit} disabled={submitting} activeOpacity={0.85}>
                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.submitBtn}>
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 16 }}>{submitting ? 'Submitting…' : '📤 Submit Exam'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    progressTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },
    questionCard: { borderRadius: RADIUS, borderWidth: 1, padding: 18, marginBottom: 16 },
    qHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
    qNumBadge: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    option: { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5 },
    optCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    submitBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    submittedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    submittedCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    submittedTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
    reviewBanner: { backgroundColor: 'rgba(255,182,39,0.06)', borderRadius: RADIUS, borderWidth: 1, padding: 20, alignItems: 'center', marginBottom: 16, width: '100%' },
    backGrad: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
});
