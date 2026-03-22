import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

export default function ValidationScreen({ route, navigation }) {
    const { submissionId, examTitle, studentName, answers, existingStatus, existingRemarks } = route.params;
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [status, setStatus] = useState(existingStatus === 'Pending Review' ? '' : (existingStatus || ''));
    const [remarks, setRemarks] = useState(existingRemarks || '');
    const [feedback, setFeedback] = useState('');
    const [saving, setSaving] = useState(false);
    const [submission, setSubmission] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load the submission details (questions + answers)
    useEffect(() => {
        api.get(`/api/exams/${submissionId}/submission-detail`)
            .then(res => setSubmission(res.data))
            .catch(() => { /* might not have this endpoint yet, that's ok */ })
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        if (!status) { toast.show('Please select a result', 'warning'); return; }
        setSaving(true);
        const allRemarks = [remarks, feedback].filter(Boolean).join('\n\n');
        try {
            await api.post(`/api/mentor/validate/${submissionId}`, {
                status,
                remarks: allRemarks || null,
            });
            toast.show('Validation saved! ✅', 'success');
            setTimeout(() => navigation.goBack(), 1000);
        } catch (e) {
            toast.show(e.response?.data?.error || 'Save failed', 'error');
        } finally { setSaving(false); }
    };

    const resultOptions = [
        { value: 'Approved', emoji: '✅', label: 'Approved', color: colors.success },
        { value: 'Needs Improvement', emoji: '🔄', label: 'Needs Work', color: colors.danger },
    ];

    const feedbackSuggestions = [
        'Great understanding of the concepts!',
        'Please revisit the fundamentals.',
        'Good effort, minor improvements needed.',
        'Excellent analytical thinking!',
        'Review the study materials again.',
        'Well-structured and thoughtful answers.',
    ];

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[s.back, { color: colors.muted }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: colors.white }]}>Review Assessment</Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                    {studentName} — {examTitle}
                </Text>
            </View>

            <ScrollView contentContainerStyle={s.scroll}>
                {/* Learner's Answers */}
                {answers && answers.length > 0 && (
                    <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                        <Text style={[s.cardTitle, { color: colors.white }]}>📋 Learner's Answers</Text>
                        {answers.map((a, idx) => (
                            <View key={idx} style={[s.answerRow, { borderBottomColor: colors.glassBorder }]}>
                                <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '700' }}>Q{idx + 1}</Text>
                                <Text style={{ color: colors.white, fontSize: 14, flex: 1, marginLeft: 10 }}>
                                    Selected: <Text style={{ fontWeight: '700', color: colors.blue }}>{(a.selected || '—').toUpperCase()}</Text>
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Result Selection */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>📊 Result</Text>
                    <View style={s.optionsRow}>
                        {resultOptions.map(opt => {
                            const selected = status === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    style={[s.optionBtn, {
                                        borderColor: selected ? opt.color : colors.glassBorder,
                                        backgroundColor: selected ? opt.color + '15' : 'transparent',
                                    }]}
                                    onPress={() => setStatus(opt.value)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={{ fontSize: 28, marginBottom: 6 }}>{opt.emoji}</Text>
                                    <Text style={[s.optionLabel, { color: selected ? opt.color : colors.muted }]}>{opt.label}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* Remarks */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>💬 Mentor Remarks</Text>
                    <TextInput
                        style={[s.input, { borderColor: colors.glassBorder, color: colors.white }]}
                        placeholder="Write your detailed feedback here..."
                        placeholderTextColor={colors.muted}
                        value={remarks}
                        onChangeText={setRemarks}
                        multiline
                    />
                </View>

                {/* Quick Feedback Suggestions */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>⚡ Quick Feedback</Text>
                    <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 12 }}>
                        Tap to add to remarks
                    </Text>
                    <View style={s.suggestionsWrap}>
                        {feedbackSuggestions.map((sug, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[s.suggestionChip, { backgroundColor: colors.blue + '10', borderColor: colors.blue + '25' }]}
                                onPress={() => setRemarks(prev => prev ? prev + '\n' + sug : sug)}
                                activeOpacity={0.7}
                            >
                                <Text style={[s.suggestionText, { color: colors.blue }]}>{sug}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Additional Notes */}
                <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>📝 Additional Notes / Suggestions</Text>
                    <TextInput
                        style={[s.input, { borderColor: colors.glassBorder, color: colors.white }]}
                        placeholder="Any additional suggestions for the learner..."
                        placeholderTextColor={colors.muted}
                        value={feedback}
                        onChangeText={setFeedback}
                        multiline
                    />
                </View>

                {/* Save */}
                <TouchableOpacity onPress={save} disabled={saving || !status} activeOpacity={0.85}>
                    <LinearGradient
                        colors={status ? gradients.accent : [colors.glass, colors.glass]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.saveBtn}
                    >
                        <Text style={[s.saveBtnText, { color: status ? '#FFF' : colors.muted }]}>
                            {saving ? 'Saving...' : '💾 Save Review'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12 },
    back: { fontSize: 15, marginBottom: 12 },
    title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    scroll: { padding: 24, paddingTop: 8, paddingBottom: 40 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 16 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    answerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
    optionsRow: { flexDirection: 'row', gap: 12 },
    optionBtn: { flex: 1, borderRadius: RADIUS, borderWidth: 2, padding: 20, alignItems: 'center', justifyContent: 'center' },
    optionLabel: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
    input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, height: 100, textAlignVertical: 'top' },
    suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestionChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
    suggestionText: { fontSize: 13, fontWeight: '500' },
    saveBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
    saveBtnText: { fontWeight: '700', fontSize: 16 },
});
