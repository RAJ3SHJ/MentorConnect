import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Modal, TextInput, ActivityIndicator, Platform, Alert
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

    const [activeLearnerItems, setActiveLearnerItems] = useState(null); // Consolidated Review Case
    const [gradingRemarks, setGradingRemarks] = useState({}); // mapped by itemId
    const [savingId, setSavingId] = useState(null);

    const fetchData = async () => {
        try {
            const [sRes, aRes] = await Promise.all([
                api.get('/api/mentor/my-students'),
                api.get('/api/mentor/my-assessments')
            ]);
            setRoster(sRes.data || []);
            setAssessments(aRes.data || []);
        } catch (e) { console.error('Failed to fetch Mentor data', e.message); }
    };

    useEffect(() => {
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'exam_submissions' 
            }, (payload) => {
                toast.show('New assessment received! 📝', 'success');
                fetchData();
            })
            .subscribe();
        return () => supabase.removeChannel(channel);
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const handleGradeItem = async (item, status) => {
        setSavingId(item.id);
        try {
            await api.post(`/api/mentor/validate/${item.id}`, { 
                type: item.type, // 'exam' or 'skills'
                status, 
                remarks: gradingRemarks[item.id] || '' 
            });
            fetchData();
            // Remove from active list locally to reflect progress in the "one roof" view
            setActiveLearnerItems(prev => {
                const updated = prev.filter(i => i.id !== item.id);
                if (updated.length === 0) return null;
                return updated;
            });
        } catch (e) { console.error(e); }
        finally { setSavingId(null); }
    };

    return (
        <View style={s.root}>
            <LinearGradient colors={['#020b14', '#061a2e']} style={StyleSheet.absoluteFillObject} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.scroll, { paddingTop: (insets.top > 0 ? insets.top : 20) + 12, paddingBottom: insets.bottom + 80 }]}
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
                    {roster.filter(l => !l.has_roadmap).length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>Inbox Zero. No pending setups.</Text></View>
                    ) : (
                        roster.filter(l => !l.has_roadmap).map(learner => (
                            <View key={learner.id} style={s.rosterCard}>
                                <View style={s.rosterTop}>
                                    <View style={s.rosterAvatar}><Text style={{ fontSize: 24 }}>🎓</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rosterName}>{learner.name}</Text>
                                        <Text style={s.rosterEmail} numberOfLines={1}>{learner.email}</Text>
                                    </View>
                                </View>
                                <View style={s.progressTrack}>
                                    <View style={[s.progressFill, { width: '0%', backgroundColor: C.muted }]} />
                                </View>
                                <TouchableOpacity style={s.rosterBtn} onPress={() => navigation.navigate('AssignCourses', { student: learner })}>
                                    <Text style={s.rosterBtnText}>🗺️ Create Roadmap</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ── Active Roadmaps ── */}
                <Text style={s.sectionTitle}>📈 Active Roadmaps</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rosterScroll}>
                    {roster.filter(l => l.has_roadmap).length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>No active roadmaps yet.</Text></View>
                    ) : (
                        roster.filter(l => l.has_roadmap).map(learner => (
                            <View key={learner.id} style={[s.rosterCard, { borderColor: 'rgba(0,242,96,0.2)' }]}>
                                <View style={s.rosterTop}>
                                    <View style={[s.rosterAvatar, { backgroundColor: 'rgba(0,242,96,0.1)' }]}><Text style={{ fontSize: 24 }}>🚀</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rosterName}>{learner.name}</Text>
                                        <Text style={s.rosterEmail} numberOfLines={1}>{learner.email}</Text>
                                    </View>
                                </View>
                                <View style={s.progressTrack}>
                                    <View style={[s.progressFill, { width: '40%' }]} />
                                </View>
                                <TouchableOpacity style={[s.rosterBtn, { backgroundColor: 'rgba(0,242,96,0.05)' }]} onPress={() => navigation.navigate('AssignCourses', { student: learner })}>
                                    <Text style={[s.rosterBtnText, { color: C.success }]}>✅ Roadmap Set</Text>
                                </TouchableOpacity>
                            </View>
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
                            <View key={learner.student_id} style={s.queueCard}>
                                <View style={s.queueHeader}>
                                    <View style={s.qAvatar}><Text style={{ fontSize: 20 }}>👤</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.queueStudent}>{learner.student_name}</Text>
                                        <Text style={s.queueSub}>{learner.items.length} pending review{learner.items.length > 1 ? 's' : ''}</Text>
                                    </View>
                                </View>
                                
                                <View style={s.qBody}>
                                    {learner.items.map((item, idx) => (
                                        <View key={item.id} style={[s.qRow, idx > 0 && s.qDivider]}>
                                            <Text style={{ fontSize: 16, marginRight: 10 }}>{item.type === 'skills' ? '🎯' : '📝'}</Text>
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.queueTitle}>{item.exam_title || 'Assessment'}</Text>
                                                <Text style={s.queueDate}>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                <TouchableOpacity 
                                    style={s.reviewAllBtn}
                                    onPress={() => setActiveLearnerItems(learner.items)}
                                >
                                    <Text style={s.reviewAllText}>Review All Assessments →</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                <TouchableOpacity style={s.createCourseBtn} onPress={() => navigation.navigate('AssignCourses')}>
                    <LinearGradient colors={['#00d2ff', '#3a7bd5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.createCourseBtnInner}>
                        <Text style={s.createCourseBtnText}>🗺️ Create Roadmap</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Consolidated Grading Modal (Under One Roof) ── */}
            <Modal visible={!!activeLearnerItems} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={s.drawer}>
                        <View style={s.drawerTopBar}>
                            <Text style={s.drawerTitle}>Grade Assessments</Text>
                            <TouchableOpacity onPress={() => setActiveLearnerItems(null)}><Text style={{ color: C.white, fontSize: 24 }}>✕</Text></TouchableOpacity>
                        </View>
                        <ScrollView 
                            style={{ flex: 1 }} 
                            contentContainerStyle={{ paddingBottom: 40 }}
                            showsVerticalScrollIndicator={false}
                        >
                            <Text style={{ color: C.primary, fontWeight: '800', marginBottom: 20 }}>
                                Learner: {activeLearnerItems?.[0]?.student_name}
                            </Text>
                            
                            {activeLearnerItems?.map((item) => (
                                <View key={item.id} style={s.gradeItemBox}>
                                    <View style={s.gradeItemHeader}>
                                        <Text style={{ color: C.white, fontWeight: '800' }}>
                                            {item.type === 'skills' ? '🎯 Skills Assessment' : `📝 ${item.exam_title}`}
                                        </Text>
                                    </View>
                                    
                                    <View style={s.mcqBox}>
                                        <Text style={{ color: C.faint, fontSize: 13, marginBottom: 6 }}>Submission Content:</Text>
                                        <Text style={{ color: C.white }}>
                                            {item.type === 'skills' 
                                                ? (typeof item.answers === 'string' ? JSON.parse(item.answers || '[]').join(', ') : item.answers?.join(', '))
                                                : (Array.isArray(item.answers) ? item.answers.map(a => a.selected).join(', ') : 'No data')}
                                        </Text>
                                    </View>

                                    <TextInput
                                        style={s.feedbackInput}
                                        placeholder="Feedback for this item..."
                                        placeholderTextColor="rgba(255,255,255,0.2)"
                                        multiline
                                        value={gradingRemarks[item.id] || ''}
                                        onChangeText={(val) => setGradingRemarks(prev => ({ ...prev, [item.id]: val }))}
                                    />

                                    <View style={s.gradeActions}>
                                        <TouchableOpacity
                                            style={[s.gradeActionBtn, { borderColor: 'rgba(255,71,87,0.3)' }]}
                                            onPress={() => handleGradeItem(item, 'Needs Improvement')}
                                            disabled={savingId === item.id}
                                        >
                                            {savingId === item.id ? <ActivityIndicator size="small" color={C.danger} /> : <Text style={{ color: C.danger, fontSize: 12, fontWeight: '800' }}>Needs Revision</Text>}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[s.gradeActionBtn, { borderColor: 'rgba(0,242,96,0.3)' }]}
                                            onPress={() => handleGradeItem(item, 'Approved')}
                                            disabled={savingId === item.id}
                                        >
                                            {savingId === item.id ? <ActivityIndicator size="small" color={C.success} /> : <Text style={{ color: C.success, fontSize: 12, fontWeight: '800' }}>Approve</Text>}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#020b14' },
    scroll: { padding: 16, paddingBottom: 60 },
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 36, flexWrap: 'wrap' },
    title: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 15, color: 'rgba(0,210,255,0.8)' },
    signOutBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    signOutText: { color: '#ff4757', fontWeight: '700', fontSize: 13 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: C.faint, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
    rosterScroll: { flexGrow: 0, marginBottom: 36 },
    rosterCard: { width: 280, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)', borderRadius: 24, padding: 20, marginRight: 16 },
    rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
    rosterAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,210,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    rosterName: { color: '#fff', fontSize: 17, fontWeight: '800', marginBottom: 4 },
    rosterEmail: { color: C.muted, fontSize: 12 },
    progressTrack: { width: '100%', height: 5, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 20 },
    progressFill: { height: '100%', backgroundColor: '#00f260', borderRadius: 3 },
    rosterBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    rosterBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    emptyBox: { padding: 28, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center' },
    emptyText: { color: C.muted, fontWeight: '600' },
    queueCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
    queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    qAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    queueStudent: { fontSize: 18, color: '#fff', fontWeight: '800' },
    queueSub: { fontSize: 12, color: C.primary, fontWeight: '600' },
    qBody: { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 16, padding: 16, marginBottom: 16 },
    qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    qDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', marginTop: 4 },
    queueTitle: { fontSize: 15, color: '#fff', fontWeight: '700', marginBottom: 2 },
    queueDate: { fontSize: 11, color: C.muted },
    reviewAllBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(0,210,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    reviewAllText: { color: C.primary, fontWeight: '700', fontSize: 14 },
    createCourseBtn: { marginTop: 28 },
    createCourseBtnInner: { paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    createCourseBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    drawer: { 
        backgroundColor: '#020b14', 
        borderTopLeftRadius: 32, 
        borderTopRightRadius: 32, 
        padding: 24, 
        maxHeight: '90%',
        minHeight: 450 // Ensure it doesn't collapse
    },
    drawerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    drawerTitle: { fontSize: 24, color: '#fff', fontWeight: '800' },
    gradeItemBox: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    gradeItemHeader: { marginBottom: 12 },
    mcqBox: { backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 12, marginBottom: 12 },
    feedbackInput: { backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, padding: 12, color: '#fff', fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 12 },
    gradeActions: { flexDirection: 'row', gap: 10 },
    gradeActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
});
