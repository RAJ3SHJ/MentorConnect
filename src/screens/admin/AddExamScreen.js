import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

const emptyQuestion = () => ({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '' });

export default function AddExamScreen({ navigation, route }) {
    const editExamId = route.params?.editExamId;
    const isEdit = !!editExamId;

    const [examTitle, setExamTitle] = useState('');
    const [questions, setQuestions] = useState([emptyQuestion()]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(isEdit);

    useEffect(() => {
        if (editExamId) {
            api.get(`/api/admin/exams/${editExamId}`)
                .then(res => {
                    setExamTitle(res.data.title || '');
                    setQuestions(res.data.questions?.length > 0 ? res.data.questions : [emptyQuestion()]);
                })
                .catch(() => Alert.alert('Error', 'Failed to load exam'))
                .finally(() => setLoading(false));
        }
    }, []);

    const updateQuestion = (idx, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
    };

    const addQuestion = () => setQuestions(prev => [...prev, emptyQuestion()]);
    const removeQuestion = (idx) => {
        if (questions.length === 1) return Alert.alert('Error', 'At least one question required');
        setQuestions(prev => prev.filter((_, i) => i !== idx));
    };

    const save = async () => {
        if (!examTitle.trim()) return Alert.alert('Error', 'Exam title required');
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.question_text || !q.option_a || !q.option_b || !q.option_c || !q.option_d)
                return Alert.alert('Error', `Question ${i + 1}: all fields are required`);
        }
        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/api/admin/exams/${editExamId}`, { title: examTitle, questions });
                Alert.alert('✅ Updated', `"${examTitle}" has been updated`, [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                await api.post('/api/admin/exams', { title: examTitle, questions });
                Alert.alert('✅ Exam Created', `"${examTitle}" with ${questions.length} question(s) is now available`, [
                    { text: 'Add Another', onPress: () => { setExamTitle(''); setQuestions([emptyQuestion()]); } },
                    { text: 'Done', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <LinearGradient colors={GRADIENTS.bg} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={COLORS.blue} size="large" />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={GRADIENTS.bg} style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

                    <Text style={styles.title}>{isEdit ? 'Edit Exam ✏️' : 'Add Exam 📝'}</Text>
                    <Text style={styles.subtitle}>{isEdit ? `Editing "${examTitle}"` : 'Create an exam with multiple choice questions'}</Text>

                    {/* Exam Title */}
                    <View style={styles.card}>
                        <Text style={styles.label}>Exam Title *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder='e.g. "PO Assessment"'
                            placeholderTextColor={COLORS.muted}
                            value={examTitle} onChangeText={setExamTitle}
                        />
                    </View>

                    {/* Questions */}
                    {questions.map((q, idx) => (
                        <View key={idx} style={styles.questionCard}>
                            <View style={styles.questionHeader}>
                                <Text style={styles.questionNum}>Question {idx + 1}</Text>
                                <TouchableOpacity onPress={() => removeQuestion(idx)} style={styles.removeBtn}>
                                    <Text style={styles.removeBtnText}>🗑 Remove</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Question Text *</Text>
                            <TextInput
                                style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                                placeholder="Enter your question here..."
                                placeholderTextColor={COLORS.muted}
                                value={q.question_text}
                                onChangeText={v => updateQuestion(idx, 'question_text', v)}
                                multiline
                            />

                            {['a', 'b', 'c', 'd'].map(opt => (
                                <View key={opt}>
                                    <Text style={styles.label}>Option {opt.toUpperCase()} *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder={`Option ${opt.toUpperCase()}`}
                                        placeholderTextColor={COLORS.muted}
                                        value={q[`option_${opt}`]}
                                        onChangeText={v => updateQuestion(idx, `option_${opt}`, v)}
                                    />
                                </View>
                            ))}
                        </View>
                    ))}

                    {/* Add Question */}
                    <TouchableOpacity style={styles.addQBtn} onPress={addQuestion}>
                        <Text style={styles.addQBtnText}>+ Add Question ({questions.length} total)</Text>
                    </TouchableOpacity>

                    {/* Submit */}
                    <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
                        <LinearGradient colors={[...GRADIENTS.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                            <Text style={styles.btnText}>{saving ? 'Saving...' : isEdit ? '💾 Update Exam' : '🎓 Create Exam'}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    title: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
    subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 6, marginBottom: 24 },
    card: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.cardBorder, padding: 20, marginBottom: 16,
    },
    label: { color: COLORS.muted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 12, marginBottom: 6 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12,
        color: COLORS.white, fontSize: 14, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 2,
    },
    questionCard: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.cardBorder, padding: 16, marginBottom: 14,
    },
    questionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    questionNum: { color: COLORS.blue, fontSize: 14, fontWeight: '800' },
    removeBtn: { backgroundColor: 'rgba(255,71,87,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)' },
    removeBtnText: { color: COLORS.danger, fontSize: 12, fontWeight: '600' },
    addQBtn: {
        borderWidth: 2, borderColor: COLORS.cardBorder, borderStyle: 'dashed',
        borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginBottom: 20,
    },
    addQBtnText: { color: COLORS.muted, fontWeight: '600', fontSize: 14 },
    btn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
    btnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
