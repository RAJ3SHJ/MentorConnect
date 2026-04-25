import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Modal, TextInput, ActivityIndicator, Platform, Alert, SafeAreaView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const C = {
    bg: '#020b14',
    card: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.06)',
    borderTop: 'rgba(255,255,255,0.08)',
    primary: '#00d2ff',
    danger: '#ff4757',
    success: '#00f260',
    white: '#fff',
    muted: 'rgba(255,255,255,0.30)',
    faint: 'rgba(255,255,255,0.50)',
};

export default function MentorDashboardScreen({ navigation }) {
    const { user, logout } = useAuth();
    const toast = useToast();
    const insets = useSafeAreaInsets();
    const [roster, setRoster] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Review / Profile states
    const [activeLearnerItems, setActiveLearnerItems] = useState(null); // Items awaiting review
    const [selectedProfile, setSelectedProfile] = useState(null); // Historical view
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [gradingRemarks, setGradingRemarks] = useState({});
    const [savingId, setSavingId] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            const [sRes, aRes] = await Promise.allSettled([
                api.get(`/api/mentor/my-students?t=${Date.now()}`),
                api.get(`/api/mentor/my-assessments?t=${Date.now()}`)
            ]);
            setRoster(sRes.status === 'fulfilled' ? (sRes.value.data || []) : []);
            setAssessments(aRes.status === 'fulfilled' ? (aRes.value.data || []) : []);
        } catch (e) { console.error('Failed to fetch Mentor data', e.message); }
    }, []);

    useEffect(() => {
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'exam_submissions' 
            }, () => {
                toast.show('New assessment received! 📝', 'success');
                fetchData();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, [fetchData]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [fetchData])
    );
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const fetchStudentDetail = async (studentId) => {
        setLoadingProfile(true);
        try {
            const res = await api.get(`/api/mentor/student-detail/${studentId}`);
            setSelectedProfile(res.data);
        } catch (e) {
            console.error(e);
            toast.show('Failed to load learner profile', 'error');
        } finally { setLoadingProfile(false); }
    };

    const handleGradeItem = async (item, status) => {
        setSavingId(item.id);
        try {
            await api.post(`/api/mentor/validate/${item.id}`, { 
                type: item.type,
                status, 
                remarks: gradingRemarks[item.id] || '' 
            });
            fetchData();
            setActiveLearnerItems(prev => {
                const updated = prev.filter(i => i.id !== item.id);
                return updated.length === 0 ? null : updated;
            });
        } catch (e) {
            console.error(e);
            toast.show('Save failed', 'error');
        } finally { setSavingId(null); }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
            <View style={s.root}>
            <ScrollView 
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 20 }}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
            >
                {/* ── Header ── */}
                <View style={s.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.title}>Mentor Dashboard</Text>
                        <Text style={s.subtitle}>
                            Welcome back, {user?.name}. You have {assessments.length} pending reviews.
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={s.signOutBtn}
                        onPress={() => {
                            if (Platform.OS === 'web') logout();
                            else Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }]);
                        }}
                    >
                        <Text style={s.signOutText}>⬡ Sign Out</Text>
                    </TouchableOpacity>
                </View>

                {/* ── Pending Roadmaps ── */}
                <Text style={s.sectionTitle}>🔗 Pending Roadmaps</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rosterScroll}>
                    {roster.filter(l => l.status === 'pending_roadmap').length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>Inbox Zero. No pending setups.</Text></View>
                    ) : (
                        roster.filter(l => l.status === 'pending_roadmap').map(learner => (
                            <TouchableOpacity 
                                key={learner.id} 
                                style={s.rosterCard}
                                onPress={() => fetchStudentDetail(learner.id)}
                            >
                                <View style={s.rosterTop}>
                                    <View style={s.rosterAvatar}><Text style={{ fontSize: 18 }}>🎓</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rosterName} numberOfLines={1}>{learner.name}</Text>
                                    </View>
                                </View>
                                <View style={s.progressTrack}>
                                    <View style={[s.progressFill, { width: '0%', backgroundColor: C.muted }]} />
                                </View>
                                <View style={s.rosterBtn}>
                                    <Text style={s.rosterBtnText}>🗺️ Create</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                {/* ── Active Roadmaps ── */}
                <Text style={s.sectionTitle}>📈 Active Roadmaps</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rosterScroll}>
                    {roster.filter(l => l.status === 'active').length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>No active roadmaps yet.</Text></View>
                    ) : (
                        roster.filter(l => l.status === 'active').map(learner => (
                            <TouchableOpacity 
                                key={learner.id} 
                                style={[s.rosterCard, { borderColor: 'rgba(0,242,96,0.2)' }]}
                                onPress={() => fetchStudentDetail(learner.id)}
                            >
                                <View style={s.rosterTop}>
                                    <View style={[s.rosterAvatar, { backgroundColor: 'rgba(0,242,96,0.1)' }]}><Text style={{ fontSize: 18 }}>🚀</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rosterName} numberOfLines={1}>{learner.name}</Text>
                                    </View>
                                </View>
                                <View style={s.progressTrack}>
                                    <View style={[s.progressFill, { width: '40%' }]} />
                                </View>
                                <View style={[s.rosterBtn, { backgroundColor: 'rgba(0,242,96,0.05)' }]}>
                                    <Text style={[s.rosterBtnText, { color: C.success }]}>✅ Set</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </ScrollView>

                {/* ── Assessment Queue (Consolidated) ── */}
                <Text style={s.sectionTitle}>⚠️ Action Required: Assessments</Text>
                <View style={{ gap: 14 }}>
                    {assessments.length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>Inbox Zero. Excellent work.</Text></View>
                    ) : (
                        Object.values(assessments.reduce((acc, alert) => {
                            if (!acc[alert.student_id]) {
                                acc[alert.student_id] = { student_id: alert.student_id, student_name: alert.student_name, items: [] };
                            }
                            acc[alert.student_id].items.push(alert);
                            return acc;
                        }, {})).map(learner => (
                            <TouchableOpacity 
                                key={learner.student_id} 
                                style={s.queueCard}
                                onPress={() => setActiveLearnerItems(learner.items)}
                            >
                                <View style={[s.queueHeader, { marginBottom: 0 }]}>
                                    <View style={s.qAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.queueStudent}>{learner.student_name}</Text>
                                        <Text style={s.queueSub}>{learner.items.length} pending review{learner.items.length > 1 ? 's' : ''}</Text>
                                    </View>
                                    <Text style={{ color: C.primary, fontSize: 18 }}>→</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* ── Learner Profile drawer (Historical) ── */}
            <Modal visible={!!selectedProfile} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={s.drawer}>
                        <View style={s.drawerTopBar}>
                            <Text style={s.drawerTitle}>Learner Profile</Text>
                            <TouchableOpacity onPress={() => setSelectedProfile(null)}><Text style={{ color: C.white, fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {selectedProfile && (
                                <>
                                    <View style={s.profileHeader}>
                                        <Text style={s.pName}>{selectedProfile.student.name}</Text>
                                        <Text style={s.pEmail}>{selectedProfile.student.email}</Text>
                                    </View>

                                    <Text style={s.pSectionTitle}>🎯 Skills Assessment</Text>
                                    {selectedProfile.skills ? (
                                        <View style={s.historyCard}>
                                            <Text style={s.pGoal}>Goal: {selectedProfile.skills.goal}</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                {selectedProfile.skills.skills?.map((sk, i) => (
                                                    <View key={i} style={s.pSkillChip}><Text style={{ color: C.primary, fontSize: 12 }}>{sk}</Text></View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={s.pEmpty}>No skills assessment submitted yet.</Text>
                                    )}

                                    <Text style={[s.pSectionTitle, { marginTop: 24 }]}>📋 Exam History</Text>
                                    {selectedProfile.submissions && selectedProfile.submissions.length > 0 ? (
                                        selectedProfile.submissions.map((sub) => (
                                            <View key={sub.id} style={s.historyCard}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <Text style={{ color: C.white, fontWeight: '700' }}>{sub.exam_title}</Text>
                                                    <Text style={{ color: sub.status === 'Approved' ? C.success : C.danger, fontSize: 12, fontWeight: '800' }}>
                                                        {sub.status.toUpperCase()}
                                                    </Text>
                                                </View>
                                                {sub.mentor_remarks && (
                                                    <View style={s.pFeedbackBox}>
                                                        <Text style={s.pFeedbackLabel}>Previous Feedback:</Text>
                                                        <Text style={s.pFeedbackText}>{sub.mentor_remarks}</Text>
                                                    </View>
                                                )}
                                                <Text style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                                                    Reviewed: {sub.reviewed_at ? new Date(sub.reviewed_at).toLocaleDateString() : 'N/A'}
                                                </Text>
                                            </View>
                                        ))
                                    ) : (
                                        <Text style={s.pEmpty}>No exams completed yet.</Text>
                                    )}

                                    <TouchableOpacity 
                                        style={[s.reviewAllBtn, { marginTop: 32, backgroundColor: C.primary + '15' }]}
                                        onPress={() => {
                                            const student = selectedProfile.student;
                                            setSelectedProfile(null);
                                            navigation.navigate('AssignCourses', { student });
                                        }}
                                    >
                                        <Text style={[s.reviewAllText, { color: C.primary }]}>Build Roadmap →</Text>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* ── Grading Modal (Pending) ── */}
            <Modal visible={!!activeLearnerItems} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={s.drawer}>
                        <View style={s.drawerTopBar}>
                            <Text style={s.drawerTitle}>Grade Assessments</Text>
                            <TouchableOpacity onPress={() => setActiveLearnerItems(null)}><Text style={{ color: C.white, fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={{ color: C.primary, fontWeight: '800', marginBottom: 20 }}>
                                Learner: {activeLearnerItems?.[0]?.student_name}
                            </Text>
                            {(() => {
                                const sorted = [...(activeLearnerItems || [])].sort((a, b) => (a.sort_rank || 99) - (b.sort_rank || 99));
                                const primaryGoal = sorted.find(i => i.goal)?.goal;
                                
                                return (
                                    <>
                                        {primaryGoal && (
                                            <View style={s.goalHeaderBox}>
                                                <Text style={s.goalHeaderLabel}>🎯 LEARNER'S PRIMARY GOAL</Text>
                                                <Text style={s.goalHeaderText}>{primaryGoal}</Text>
                                            </View>
                                        )}

                                        {sorted.map((item) => (
                                            <View key={item.id} style={s.gradeItemBox}>
                                                <View style={s.gradeItemHeader}>
                                                    <Text style={{ color: C.white, fontWeight: '900', fontSize: 16 }}>
                                                        {item.type === 'skills' ? '🛠️ Core Skills Assessment' : `📝 ${item.exam_title}`}
                                                    </Text>
                                                </View>
                                                
                                                {/* Skills list (Goal is now at top of drawer) */}
                                                {item.type === 'skills' && (
                                                    <View style={{ marginBottom: 12 }}>
                                                        <Text style={{ color: C.faint, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 }}>Selected Skills:</Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                                            {(typeof item.answers === 'string' ? JSON.parse(item.answers || '[]') : item.answers)?.map((sk, i) => (
                                                                <View key={i} style={s.pSkillChip}><Text style={{ color: C.primary, fontSize: 12, fontWeight: '700' }}>{sk}</Text></View>
                                                            ))}
                                                        </View>
                                                    </View>
                                                )}

                                                {/* Exams Full Context */}
                                                {item.type === 'exam' && (
                                                    <View style={{ marginBottom: 16 }}>
                                                        {item.questions && item.questions.length > 0 ? (
                                                            item.questions.map((q, qIdx) => {
                                                                const userAnswerRaw = item.answers?.find(a => String(a.question_id) === String(q.id))?.selected;
                                                                return (
                                                                    <View key={q.id} style={{ marginBottom: 20, borderBottomWidth: qIdx === item.questions.length - 1 ? 0 : 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 }}>
                                                                        <Text style={{ color: C.white, fontSize: 14, fontWeight: '700', marginBottom: 12 }}>
                                                                            {qIdx + 1}. {q.question_text}
                                                                        </Text>
                                                                        {['a', 'b', 'c', 'd'].map(opt => (
                                                                            <View 
                                                                                key={opt} 
                                                                                style={{ 
                                                                                    flexDirection: 'row', 
                                                                                    alignItems: 'center', 
                                                                                    gap: 10, 
                                                                                    padding: 8, 
                                                                                    borderRadius: 8, 
                                                                                    backgroundColor: userAnswerRaw === opt ? C.primary + '15' : 'transparent',
                                                                                    borderWidth: 1,
                                                                                    borderColor: userAnswerRaw === opt ? C.primary + '40' : 'transparent',
                                                                                    marginBottom: 4
                                                                                }}
                                                                            >
                                                                                <View style={{ 
                                                                                    width: 22, height: 22, borderRadius: 11, 
                                                                                    alignItems: 'center', justifyContent: 'center',
                                                                                    backgroundColor: userAnswerRaw === opt ? C.primary : 'rgba(255,255,255,0.05)',
                                                                                    borderWidth: 1, borderColor: userAnswerRaw === opt ? C.primary : 'rgba(255,255,255,0.2)'
                                                                                }}>
                                                                                    <Text style={{ color: userAnswerRaw === opt ? '#000' : C.muted, fontSize: 10, fontWeight: '900' }}>{opt.toUpperCase()}</Text>
                                                                                </View>
                                                                                <Text style={{ color: userAnswerRaw === opt ? C.white : C.muted, fontSize: 13, flex: 1 }}>{q[`option_${opt}`]}</Text>
                                                                            </View>
                                                                        ))}
                                                                    </View>
                                                                );
                                                            })
                                                        ) : (
                                                            <View style={{ backgroundColor: 'rgba(255,71,87,0.05)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)' }}>
                                                                <Text style={{ color: C.danger, fontSize: 12, fontWeight: '800', marginBottom: 8 }}>⚠️ QUESTIONS SYNC MISSING</Text>
                                                                <Text style={{ color: C.muted, fontSize: 13 }}>
                                                                    The actual questions couldn't be loaded from the cloud.
                                                                    Raw selection: {Array.isArray(item.answers) ? item.answers.map(a => a.selected).join(', ') : 'No data'}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>
                                                )}

                                                <TextInput
                                                    style={s.feedbackInput}
                                                    placeholder="Add your feedback/remarks here..."
                                                    placeholderTextColor="rgba(255,255,255,0.2)"
                                                    multiline
                                                    value={gradingRemarks[item.id] || ''}
                                                    onChangeText={(val) => setGradingRemarks(prev => ({ ...prev, [item.id]: val }))}
                                                />

                                                <View style={s.gradeActions}>
                                                    <TouchableOpacity style={[s.gradeActionBtn, { borderColor: C.danger + '30', backgroundColor: C.danger + '05' }]} onPress={() => handleGradeItem(item, 'Needs Improvement')}>
                                                        {savingId === item.id ? <ActivityIndicator size="small" color={C.danger} /> : <Text style={{ color: C.danger, fontSize: 12, fontWeight: '900' }}>REVISE</Text>}
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={[s.gradeActionBtn, { borderColor: C.success + '30', backgroundColor: C.success + '05' }]} onPress={() => handleGradeItem(item, 'Approved')}>
                                                        {savingId === item.id ? <ActivityIndicator size="small" color={C.success} /> : <Text style={{ color: C.success, fontSize: 12, fontWeight: '900' }}>APPROVE</Text>}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </>
                                );
                            })()}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {loadingProfile && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }]}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            )}
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#020b14' },
    scroll: { padding: 16 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
    title: { fontSize: 26, fontWeight: '900', color: '#fff' },
    subtitle: { fontSize: 14, color: C.primary, opacity: 0.8 },
    signOutBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
    signOutText: { color: '#ff4757', fontWeight: '700', fontSize: 12 },
    sectionTitle: { fontSize: 11, fontWeight: '900', color: C.faint, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 },
    rosterScroll: { marginBottom: 24 },
    rosterCard: { width: 140, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.15)', borderRadius: 20, padding: 12, marginRight: 12 },
    rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    rosterAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,210,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    rosterName: { color: '#fff', fontSize: 13, fontWeight: '800' },
    progressTrack: { width: '100%', height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginBottom: 12 },
    progressFill: { height: '100%', backgroundColor: '#00f260', borderRadius: 2 },
    rosterBtn: { paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    rosterBtnText: { color: '#fff', fontWeight: '800', fontSize: 10 },
    emptyBox: { padding: 24, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    emptyText: { color: C.muted, fontSize: 13 },
    queueCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 16, marginBottom: 12 },
    queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    qAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    queueStudent: { fontSize: 16, color: '#fff', fontWeight: '800' },
    queueSub: { fontSize: 12, color: C.primary, fontWeight: '600' },
    reviewAllBtn: { alignItems: 'center', paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(0,210,255,0.08)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    reviewAllText: { color: C.white, fontWeight: '800', fontSize: 13 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    drawer: { backgroundColor: '#020b14', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%', minHeight: 450 },
    drawerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    drawerTitle: { fontSize: 22, color: '#fff', fontWeight: '900' },
    profileHeader: { marginBottom: 24 },
    pName: { color: '#fff', fontSize: 22, fontWeight: '900', marginBottom: 4 },
    pEmail: { color: C.muted, fontSize: 14 },
    pSectionTitle: { color: C.faint, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 12 },
    historyCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    pGoal: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 10 },
    pSkillChip: { backgroundColor: 'rgba(0,210,255,0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    pEmpty: { color: C.muted, fontSize: 13, fontStyle: 'italic', marginBottom: 16 },
    pFeedbackBox: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
    pFeedbackLabel: { color: C.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 4 },
    pFeedbackText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
    gradeItemBox: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    gradeItemHeader: { marginBottom: 10 },
    feedbackInput: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
    gradeActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    gradeActionBtn: { flex: 1, height: 40, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    goalHeaderBox: { 
        backgroundColor: 'rgba(0,210,255,0.08)', 
        padding: 16, 
        borderRadius: 16, 
        marginBottom: 20, 
        borderWidth: 1.5, 
        borderColor: 'rgba(0,210,255,0.25)',
        shadowColor: C.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10
    },
    goalHeaderLabel: { color: C.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    goalHeaderText: { color: C.white, fontSize: 18, fontWeight: '800', lineHeight: 26 },
});
