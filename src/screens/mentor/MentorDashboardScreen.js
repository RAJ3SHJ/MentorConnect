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

    const [gradingItem, setGradingItem] = useState(null);
    const [gradingRemarks, setGradingRemarks] = useState('');

    const [saving, setSaving] = useState(false);

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

    // Real-time listener for new submissions
    useEffect(() => {
        const channel = supabase
            .channel('db-changes')
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'exam_submissions' 
            }, (payload) => {
                console.log('⚡ Real-time Submission Received!', payload);
                toast.show('New assessment received! 📝', 'success');
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const handleGrade = async (status) => {
        if (!gradingItem) return;
        setSaving(true);
        try {
            await api.post(`/api/mentor/validate/${gradingItem.id}`, { status, remarks: gradingRemarks });
            setGradingItem(null);
            setGradingRemarks('');
            fetchData();
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
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

                {/* ── Student Roster (horizontal scroll) ── */}
                <Text style={s.sectionTitle}>🔗 Student Roster</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rosterScroll}>
                    {roster.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={s.emptyText}>No students currently assigned.</Text>
                        </View>
                    ) : (
                        roster.map(student => (
                            <View key={student.id} style={[s.rosterCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                                <View style={s.rosterTop}>
                                    <View style={s.rosterAvatar}>
                                        <Text style={{ fontSize: 24 }}>🎓</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.rosterName}>{student.name}</Text>
                                        <Text style={s.rosterEmail} numberOfLines={1}>{student.email}</Text>
                                    </View>
                                </View>
                                {/* Progress bar */}
                                <View style={s.progressTrack}>
                                    <View style={[s.progressFill, { width: `${Math.floor(Math.random() * 60) + 20}%` }]} />
                                </View>
                                {student.has_roadmap ? (
                                    <View style={[s.rosterBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'transparent' }]}>
                                        <Text style={[s.rosterBtnText, { color: C.muted }]}>✅ Roadmap Set</Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        style={s.rosterBtn}
                                        onPress={() => navigation.navigate('AssignCourses', { student })}
                                    >
                                        <Text style={s.rosterBtnText}>🗺️ Create Roadmap</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* ── Assessment Queue (Grouped by Student) ── */}
                <Text style={s.sectionTitle}>⚠️ Action Required: Assessments</Text>
                <View style={{ gap: 14 }}>
                    {assessments.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={s.emptyText}>Inbox Zero. Excellent work.</Text>
                        </View>
                    ) : (
                        // Grouping assessments by student ID
                        Object.values(assessments.reduce((acc, alert) => {
                            if (!acc[alert.student_id]) {
                                acc[alert.student_id] = {
                                    student_id: alert.student_id,
                                    student_name: alert.student_name,
                                    items: []
                                };
                            }
                            acc[alert.student_id].items.push(alert);
                            return acc;
                        }, {})).map(student => (
                            <View key={student.student_id} style={[s.queueCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                                <View style={s.queueHeader}>
                                    <View style={s.qAvatar}><Text style={{ fontSize: 20 }}>🎓</Text></View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.queueStudent}>{student.student_name}</Text>
                                        <Text style={s.queueSub}>{student.items.length} pending assessment{student.items.length > 1 ? 's' : ''}</Text>
                                    </View>
                                </View>
                                
                                <View style={s.qBody}>
                                    {student.items.map((item, idx) => (
                                        <TouchableOpacity 
                                            key={item.id} 
                                            style={[s.qRow, idx > 0 && s.qDivider]} 
                                            onPress={() => setGradingItem(item)}
                                            activeOpacity={0.7}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={s.queueTitle}>{item.exam_title || 'Assessment'}</Text>
                                                <Text style={s.queueDate}>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</Text>
                                            </View>
                                            <TouchableOpacity style={s.gradeBadge} onPress={() => setGradingItem(item)}>
                                                <Text style={s.gradeBadgeText}>Grade →</Text>
                                            </TouchableOpacity>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Optional: Unified navigation to student profile or detailed review */}
                                <TouchableOpacity 
                                    style={s.viewProfileBtn}
                                    onPress={() => navigation.navigate('StudentDetail', { studentId: student.student_id })}
                                >
                                    <Text style={s.viewProfileText}>View Student Progress ➔</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

                {/* ── Create Course — inline button instead of floating FAB ── */}
                <TouchableOpacity style={s.createCourseBtn} onPress={() => navigation.navigate('AssignCourses')}>
                    <LinearGradient
                        colors={['#00d2ff', '#3a7bd5']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={s.createCourseBtnInner}
                    >
                        <Text style={s.createCourseBtnText}>🗺️ Create Roadmap</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Grading Modal ── */}
            <Modal visible={!!gradingItem} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={[s.drawer, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                        <View style={s.drawerTopBar}>
                            <Text style={s.drawerTitle}>Grade Submission</Text>
                            <TouchableOpacity onPress={() => setGradingItem(null)}>
                                <Text style={{ color: C.white, fontSize: 24 }}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ flex: 1 }}>
                            <Text style={{ color: C.primary, fontWeight: '800', marginBottom: 4 }}>{gradingItem?.student_name}</Text>
                            <Text style={{ color: C.muted, marginBottom: 20 }}>{gradingItem?.exam_title}</Text>
                            <View style={s.mcqBox}>
                                <Text style={{ color: C.white, fontWeight: '800', marginBottom: 10 }}>
                                    {gradingItem?.type === 'skills' ? 'Skillset Submitted' : 'MCQ Results'}
                                </Text>
                                <Text style={{ color: C.faint }}>
                                    {gradingItem?.type === 'skills' 
                                        ? (typeof gradingItem.answers === 'string' 
                                            ? JSON.parse(gradingItem.answers || '[]').join(' • ') 
                                            : gradingItem.answers?.join(' • '))
                                        : (Array.isArray(gradingItem?.answers) 
                                            ? gradingItem.answers.map(a => a.selected).join(', ') 
                                            : 'No answers provided')}
                                </Text>
                            </View>
                            <Text style={{ color: C.white, fontWeight: '800', marginBottom: 10, marginTop: 20 }}>Mentor Feedback</Text>
                            <TextInput
                                style={s.feedbackInput}
                                placeholder="Type constructive feedback here..."
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                multiline
                                value={gradingRemarks}
                                onChangeText={setGradingRemarks}
                            />
                        </ScrollView>
                        <View style={s.gradeActions}>
                            <TouchableOpacity
                                style={[s.gradeActionBtn, { backgroundColor: 'rgba(255,71,87,0.1)', borderColor: 'rgba(255,71,87,0.3)' }]}
                                onPress={() => handleGrade('Needs Improvement')}
                            >
                                {saving ? <ActivityIndicator color={C.danger} /> : <Text style={{ color: C.danger, fontWeight: '800' }}>Needs Revision</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.gradeActionBtn, { backgroundColor: 'rgba(0,242,96,0.1)', borderColor: 'rgba(0,242,96,0.3)' }]}
                                onPress={() => handleGrade('Approved')}
                            >
                                {saving ? <ActivityIndicator color={C.success} /> : <Text style={{ color: C.success, fontWeight: '800' }}>Approve Exam</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>


        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#020b14' },
    scroll: { padding: 16, paddingBottom: 60 },

    // Header
    header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 36, flexWrap: 'wrap' },
    title: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginBottom: 8 },
    subtitle: { fontSize: 15, color: 'rgba(0,210,255,0.8)' },
    signOutBtn: { backgroundColor: 'rgba(255,71,87,0.1)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    signOutText: { color: '#ff4757', fontWeight: '700', fontSize: 13 },

    sectionTitle: { fontSize: 12, fontWeight: '800', color: C.faint, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },

    // Roster
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

    // Queue cards
    emptyBox: { padding: 28, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center' },
    emptyText: { color: C.muted, fontWeight: '600' },
    queueCard: { backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 24, padding: 20, marginBottom: 16 },
    queueHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    qAvatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    queueStudent: { fontSize: 16, color: '#fff', fontWeight: '800' },
    queueSub: { fontSize: 12, color: C.primary, fontWeight: '600' },
    qBody: { backgroundColor: 'rgba(255,255,255,0.015)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)', marginBottom: 16 },
    qRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
    qDivider: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', marginTop: 8, paddingTop: 16 },
    queueTitle: { fontSize: 14, color: '#fff', fontWeight: '700', marginBottom: 2 },
    queueDate: { fontSize: 11, color: C.muted },
    gradeBadge: { backgroundColor: 'rgba(0,210,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    gradeBadgeText: { color: '#00d2ff', fontSize: 11, fontWeight: '800' },
    viewProfileBtn: { alignItems: 'center', paddingVertical: 12 },
    viewProfileText: { color: C.primary, fontSize: 13, fontWeight: '700' },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 14 },

    // Create course button (inline)
    createCourseBtn: { marginTop: 28 },
    createCourseBtnInner: { paddingVertical: 18, borderRadius: 20, alignItems: 'center' },
    createCourseBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },

    // Grading modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    drawer: { backgroundColor: 'rgba(6,26,46,0.97)', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 28, maxHeight: '85%' },
    drawerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    drawerTitle: { fontSize: 26, color: '#fff', fontWeight: '800', letterSpacing: -0.5 },
    mcqBox: { padding: 18, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    feedbackInput: { minHeight: 120, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, textAlignVertical: 'top', marginBottom: 4 },
    gradeActions: { flexDirection: 'row', gap: 14, marginTop: 20, flexWrap: 'wrap' },
    gradeActionBtn: { flex: 1, paddingVertical: 16, borderRadius: 14, alignItems: 'center', borderWidth: 1 },

    // Course modal
    modalCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    courseCard: { width: '100%', maxWidth: 500, backgroundColor: 'rgba(6,26,46,0.97)', padding: 32, borderRadius: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    labInput: { width: '100%', height: 52, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', paddingHorizontal: 16, marginBottom: 14 },
});
