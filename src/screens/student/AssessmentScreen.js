import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, RefreshControl, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

const DEFAULT_SKILLS = ['Agile', 'SQL', 'Business Analysis', 'Requirement Elicitation'];

export default function AssessmentScreen({ navigation }) {
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [tab, setTab] = useState('skills');
    const [goal, setGoal] = useState('');
    const [skills, setSkills] = useState([...DEFAULT_SKILLS]);
    const [newSkill, setNewSkill] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedSkills, setSavedSkills] = useState(null);
    const [skillsSubmitted, setSkillsSubmitted] = useState(false);
    const [exams, setExams] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [errors, setErrors] = useState({});

    const fetchData = async () => {
        try {
            const [skRes, exRes] = await Promise.all([api.get('/api/student/skills'), api.get('/api/exams')]);
            if (skRes.data) {
                setSavedSkills(skRes.data); setGoal(skRes.data.goal || '');
                setSkills(skRes.data.skills?.length ? skRes.data.skills : [...DEFAULT_SKILLS]);
                setSkillsSubmitted(true);
            }
            setExams(exRes.data);
        } catch (e) { console.log(e.message); }
    };

    useFocusEffect(useCallback(() => { fetchData(); setSkillsSubmitted(false); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const addSkill = () => {
        const s = newSkill.trim();
        if (!s) return;
        if (skills.includes(s)) { toast.show('Skill already added', 'warning'); return; }
        setSkills([...skills, s]); setNewSkill('');
    };

    const removeSkill = (s) => setSkills(skills.filter(sk => sk !== s));

    const validate = () => {
        const e = {};
        if (!goal.trim()) e.goal = 'Goal is required';
        if (skills.length === 0) e.skills = 'Add at least one skill';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const saveSkills = async () => {
        if (!validate()) { toast.show('Please fix the errors below', 'error'); return; }
        setSaving(true);
        try {
            await api.post('/api/student/skills', { goal, skills });
            setSkillsSubmitted(true);
            toast.show('Assessment submitted successfully! 🎉', 'success');
            fetchData();
        } catch (e) {
            toast.show(e.response?.data?.error || 'Save failed', 'error');
        } finally { setSaving(false); }
    };

    const statusColor = (s) => s === 'Approved' ? colors.success : s === 'Needs Improvement' ? colors.danger : colors.gold;

    const SubmittedBanner = () => (
        <View style={[st.submittedBanner, { borderColor: colors.success + '33' }]}>
            <View style={[st.submittedIcon, { backgroundColor: colors.success + '15' }]}><Text style={{ fontSize: 32 }}>✅</Text></View>
            <Text style={[st.submittedTitle, { color: colors.success }]}>Assessment Submitted!</Text>
            <Text style={[st.submittedMsg, { color: colors.muted }]}>
                Your skill assessment has been submitted and is under review. Your mentor will be notified.
            </Text>

            {/* Assessment Summary Section */}
            <View style={[st.summaryCard, { backgroundColor: 'rgba(255,255,255,0.03)', borderColor: colors.glassBorder }]}>
                <Text style={[st.summaryLabel, { color: colors.blue }]}>🎯 Primary Goal</Text>
                <Text style={[st.summaryText, { color: colors.white }]}>{goal || savedSkills?.goal}</Text>
                
                <View style={{ height: 1, backgroundColor: colors.glassBorder, marginVertical: 12 }} />
                
                <Text style={[st.summaryLabel, { color: colors.blue }]}>🛠️ Core Skills</Text>
                <View style={st.tagsWrap}>
                    {(skills.length > 0 ? skills : (savedSkills?.skills || [])).map(sk => (
                        <View key={sk} style={[st.tag, { borderColor: colors.blue + '22', opacity: 0.8 }]}>
                            <Text style={[st.tagText, { color: colors.blue }]}>{sk}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {savedSkills?.submitted_at && (
                <Text style={[st.submittedDate, { color: colors.muted }]}>
                    Submitted: {new Date(savedSkills.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
            )}
            <TouchableOpacity style={[st.editAgainBtn, { borderColor: colors.blue + '33' }]} onPress={() => setSkillsSubmitted(false)}>
                <Text style={[st.editAgainText, { color: colors.blue }]}>✏️ Edit Assessment</Text>
            </TouchableOpacity>
        </View>
    );

    const ExamSubmittedCard = ({ exam }) => (
        <View style={[st.examSubmittedCard, { borderColor: colors.success + '22' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View style={[st.examSubmittedIcon, { backgroundColor: colors.success + '15' }]}><Text style={{ fontSize: 22 }}>✅</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={[st.examTitle, { color: colors.white }]}>{exam.title}</Text>
                    <View style={[st.statusPill, { backgroundColor: statusColor(exam.submission.status) + '22', borderColor: statusColor(exam.submission.status) }]}>
                        <Text style={[st.statusPillText, { color: statusColor(exam.submission.status) }]}>{exam.submission.status}</Text>
                    </View>
                </View>
            </View>
            <Text style={[st.examSubmittedMsg, { color: colors.muted }]}>Submitted and under review.</Text>
            {exam.submission.submitted_at && (
                <Text style={[st.examSubmittedDate, { color: colors.muted }]}>
                    Submitted: {new Date(exam.submission.submitted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
            )}
            <TouchableOpacity style={[st.retakeBtn, { borderColor: colors.purple + '33' }]}
                onPress={() => navigation.navigate('TakeExam', { examId: exam.id, examTitle: exam.title })}>
                <Text style={[st.retakeBtnText, { color: colors.purple }]}>📝 Retake Exam</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <LinearGradient colors={gradients.bg} style={st.container}>
            <View style={st.header}>
                <Text style={[st.title, { color: colors.white }]}>Assessment</Text>
                <View style={[st.tabs, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    {['skills', 'exams'].map(t => (
                        <TouchableOpacity key={t} style={[st.tab, tab === t && { backgroundColor: colors.blue }]} onPress={() => setTab(t)}>
                            <Text style={[st.tabText, { color: tab === t ? '#FFF' : colors.muted }]}>{t === 'skills' ? 'Skills' : 'Exams'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView style={{ flex: 1 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>
                {tab === 'skills' ? (
                    <View style={st.section}>
                        {skillsSubmitted && savedSkills ? <SubmittedBanner /> : (
                            <>
                                <Text style={[st.sectionTitle, { color: colors.white }]}>What is your goal?</Text>
                                <TextInput style={[st.input, { borderColor: errors.goal ? colors.danger : colors.glassBorder, color: colors.white }]}
                                    placeholder="e.g. Become a Business Analyst by Q3 2025" placeholderTextColor={colors.muted}
                                    value={goal} onChangeText={(t) => { setGoal(t); if (errors.goal) setErrors(e => ({ ...e, goal: null })); }} multiline />
                                {errors.goal && <Text style={[st.errorText, { color: colors.danger }]}>⚠ {errors.goal}</Text>}

                                <Text style={[st.sectionTitle, { color: colors.white }]}>Your Skills</Text>
                                {errors.skills && <Text style={[st.errorText, { color: colors.danger }]}>⚠ {errors.skills}</Text>}
                                <View style={st.tagsWrap}>
                                    {skills.map(sk => (
                                        <TouchableOpacity key={sk} style={[st.tag, { borderColor: colors.blue + '44' }]} onPress={() => removeSkill(sk)}>
                                            <Text style={[st.tagText, { color: colors.blue }]}>{sk}<Text style={{ color: colors.muted }}> ✕</Text></Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <View style={st.addRow}>
                                    <TextInput style={[st.input, { flex: 1, marginBottom: 0, borderColor: colors.glassBorder, color: colors.white }]}
                                        placeholder="Add custom skill…" placeholderTextColor={colors.muted}
                                        value={newSkill} onChangeText={setNewSkill} onSubmitEditing={addSkill} />
                                    <TouchableOpacity style={[st.addBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]} onPress={addSkill}>
                                        <Text style={[st.addBtnText, { color: colors.blue }]}>+ Add</Text>
                                    </TouchableOpacity>
                                </View>
                                <TouchableOpacity onPress={saveSkills} disabled={saving} activeOpacity={0.85}>
                                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.saveBtn}>
                                        <Text style={st.saveBtnText}>{saving ? 'Submitting…' : '📤 Submit Assessment'}</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                ) : (
                    <View style={st.section}>
                        <Text style={[st.sectionTitle, { color: colors.white }]}>Available Exams</Text>
                        {exams.length === 0 ? (
                            <View style={[st.emptyCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                                <Text style={[st.emptyText, { color: colors.muted }]}>No exams available yet.{'\n'}Ask your admin to create one.</Text>
                            </View>
                        ) : exams.map(exam => (
                            exam.submission ? <ExamSubmittedCard key={exam.id} exam={exam} /> : (
                                <TouchableOpacity key={exam.id} style={[st.examCard, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                                    onPress={() => navigation.navigate('TakeExam', { examId: exam.id, examTitle: exam.title })} activeOpacity={0.8}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[st.examTitle, { color: colors.white }]}>{exam.title}</Text>
                                        <Text style={[st.examSub, { color: colors.muted }]}>Not attempted yet</Text>
                                    </View>
                                    <View style={[st.startBadge, { borderColor: colors.blue + '44' }]}>
                                        <Text style={[st.startBadgeText, { color: colors.blue }]}>Take →</Text>
                                    </View>
                                </TouchableOpacity>
                            )
                        ))}
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const st = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
    tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, borderWidth: 1 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
    tabText: { fontWeight: '600', fontSize: 14 },
    section: { padding: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, marginTop: 8, letterSpacing: -0.3 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, marginBottom: 8 },
    errorText: { fontSize: 12, fontWeight: '600', marginBottom: 8, marginTop: -4 },
    tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    tag: { backgroundColor: 'rgba(66,133,244,0.12)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, borderWidth: 1 },
    tagText: { fontSize: 13, fontWeight: '600' },
    addRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    addBtn: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, justifyContent: 'center' },
    addBtnText: { fontWeight: '700' },
    saveBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginBottom: 16 },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    submittedBanner: { backgroundColor: 'rgba(46,213,115,0.06)', borderWidth: 1, borderRadius: RADIUS, padding: 28, alignItems: 'center' },
    submittedIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    submittedTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
    submittedMsg: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
    submittedDate: { fontSize: 12, fontStyle: 'italic', marginBottom: 16 },
    editAgainBtn: { backgroundColor: 'rgba(66,133,244,0.1)', borderRadius: 12, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 20 },
    editAgainText: { fontWeight: '700', fontSize: 14 },
    summaryCard: { width: '100%', borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 8, marginBottom: 20, alignItems: 'flex-start' },
    summaryLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    summaryText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
    emptyCard: { borderRadius: RADIUS, borderWidth: 1, padding: 24, alignItems: 'center' },
    emptyText: { textAlign: 'center', lineHeight: 22 },
    examCard: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
    examTitle: { fontSize: 15, fontWeight: '700', letterSpacing: -0.3 },
    examSub: { fontSize: 13, marginTop: 4 },
    startBadge: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, backgroundColor: 'rgba(66,133,244,0.08)' },
    startBadgeText: { fontWeight: '700', fontSize: 13 },
    examSubmittedCard: { backgroundColor: 'rgba(46,213,115,0.04)', borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 12 },
    examSubmittedIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    statusPill: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, alignSelf: 'flex-start', marginTop: 4 },
    statusPillText: { fontSize: 11, fontWeight: '700' },
    examSubmittedMsg: { fontSize: 13, lineHeight: 20, marginBottom: 8 },
    examSubmittedDate: { fontSize: 12, fontStyle: 'italic', marginBottom: 12 },
    retakeBtn: { backgroundColor: 'rgba(142,68,173,0.08)', borderRadius: 12, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
    retakeBtnText: { fontWeight: '700', fontSize: 13 },
});
