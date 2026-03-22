import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    RefreshControl, Modal, TextInput, ActivityIndicator, Dimensions, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function MentorDashboardScreen({ navigation }) {
    const { user, logout } = useAuth();
    const [roster, setRoster] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Modals state
    const [gradingItem, setGradingItem] = useState(null);
    const [gradingRemarks, setGradingRemarks] = useState('');
    
    const [courseModalVisible, setCourseModalVisible] = useState(false);
    const [courseForm, setCourseForm] = useState({ title: '', category: '', link: '' });
    const [saving, setSaving] = useState(false);

    const fetchData = async () => {
        try {
            const [sRes, aRes] = await Promise.all([
                api.get('/api/mentor/my-students'),
                api.get('/api/mentor/my-assessments')
            ]);
            setRoster(sRes.data || []);
            setAssessments(aRes.data || []);
        } catch (e) {
            console.error('Failed to fetch Mentor data', e.message);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

    const handleGrade = async (status) => {
        if(!gradingItem) return;
        setSaving(true);
        try {
            await api.post(`/api/mentor/validate/${gradingItem.id}`, {
                status, remarks: gradingRemarks
            });
            setGradingItem(null);
            setGradingRemarks('');
            fetchData();
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleCreateCourse = async () => {
        if(!courseForm.title) return alert("Course Name is required");
        setSaving(true);
        try {
            await api.post('/api/mentor/courses', courseForm);
            setCourseModalVisible(false);
            setCourseForm({ title: '', category: '', link: '' });
            alert("Course successfully deployed to the lab!");
        } catch(e) {
            alert("Failed to create course");
        } finally {
            setSaving(false);
        }
    };

    return (
        <View style={s.container}>
            {/* Deep Workspace Background */}
            <LinearGradient colors={['#020b14', '#061a2e']} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glowOrb, { backgroundColor: '#00d2ff', top: -100, right: -100 }]} />
            <View style={[s.glowOrb, { backgroundColor: '#8a2be2', bottom: -150, left: -100 }]} />

            <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />}>
                
                <View style={s.header}>
                    <View>
                        <Text style={s.title}>Mentor Dashboard</Text>
                        <Text style={s.subtitle}>Welcome back, {user?.name}. You have {assessments.length} pending reviews.</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => {
                            if (Platform.OS === 'web') {
                                logout();
                            } else {
                                Alert.alert('Sign Out', 'Are you sure?', [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: 'Sign Out', style: 'destructive', onPress: logout }
                                ]);
                            }
                        }}
                        style={{ backgroundColor: 'rgba(255,71,87,0.12)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 }}
                    >
                        <Text style={{ color: '#ff4757', fontWeight: '700', fontSize: 13 }}>⬡ Sign Out</Text>
                    </TouchableOpacity>
                </View>

                {/* MODULE 1: Student-Mentor Connect Hub (Horizontal Roster) */}
                <Text style={s.sectionTitle}>🔗 Student Roster</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 40, overflow: 'visible' }}>
                    {roster.length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>No students currently assigned.</Text></View>
                    ) : (
                        roster.map(student => (
                            <View key={student.id} style={[s.rosterCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                                <View style={s.rosterTop}>
                                    <View style={s.rosterAvatar}><Text style={{fontSize: 24}}>🎓</Text></View>
                                    <View>
                                        <Text style={s.rosterName}>{student.name}</Text>
                                        <Text style={s.rosterEmail} numberOfLines={1}>{student.email}</Text>
                                    </View>
                                </View>
                                <View style={s.progressTrack}>
                                    {/* Fake Progress Bar mapping to spec */}
                                    <View style={[s.progressFill, { width: `${Math.floor(Math.random() * 60) + 20}%` }]} />
                                </View>
                                <TouchableOpacity style={s.directActionBtn} onPress={() => navigation.navigate('LinkStudent')}>
                                    <Text style={s.directActionText}>Assign Objectives</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>

                {/* MODULE 2: Assessment Review Queue */}
                <Text style={s.sectionTitle}>⚠️ Action Required: Assessments</Text>
                <View style={s.queueContainer}>
                    {assessments.length === 0 ? (
                        <View style={s.emptyBox}><Text style={s.emptyText}>Inbox Zero. Excellent work.</Text></View>
                    ) : (
                        assessments.map(item => (
                            <View key={item.id} style={[s.queueCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                                <View style={s.queueHeader}>
                                    <Text style={s.queueTitle}>{item.exam_title}</Text>
                                    <View style={s.queueBadge}><Text style={s.queueBadgeText}>SUBMITTED</Text></View>
                                </View>
                                <Text style={s.queueStudent}>By: {item.student_name}</Text>
                                <Text style={s.queueDate}>Submitted: {new Date(item.submitted_at).toLocaleDateString()}</Text>
                                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 }} />
                                
                                <TouchableOpacity style={s.gradeBtn} onPress={() => setGradingItem(item)}>
                                    <Text style={s.gradeBtnText}>Grade Now ➔</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </View>

            </ScrollView>

            {/* MODULE 3: Course Lab FAB */}
            <TouchableOpacity style={s.fab} onPress={() => setCourseModalVisible(true)}>
                <LinearGradient colors={['#8a2be2', '#4a00e0']} style={s.fabInner} start={{x:0,y:0}} end={{x:1,y:1}}>
                    <Text style={s.fabIcon}>+</Text>
                </LinearGradient>
            </TouchableOpacity>

            {/* GRADING MODAL (Side-Drawer Illusion) */}
            <Modal visible={!!gradingItem} animationType="slide" transparent>
                <View style={s.modalOverlay}>
                    <View style={[s.drawerPanel, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 }}>
                            <Text style={s.drawerTitle}>Grade Submission</Text>
                            <TouchableOpacity onPress={() => setGradingItem(null)}><Text style={{color: '#fff', fontSize: 24}}>✕</Text></TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ flex: 1 }}>
                            <Text style={{color: '#00d2ff', fontWeight: '800', marginBottom: 4}}>{gradingItem?.student_name}</Text>
                            <Text style={{color: 'rgba(255,255,255,0.4)', marginBottom: 24}}>{gradingItem?.exam_title}</Text>
                            
                            <View style={s.mcqBox}>
                                <Text style={{color: '#fff', fontWeight: '800', marginBottom: 12}}>MCQ Results Data</Text>
                                <Text style={{color: 'rgba(255,255,255,0.6)'}}>
                                    Student selected: {gradingItem?.answers?.map(a=>a.selected).join(', ') || 'None captured'}
                                </Text>
                            </View>

                            <Text style={{color: '#fff', fontWeight: '800', marginBottom: 12, marginTop: 24}}>Mentor Feedback</Text>
                            <TextInput 
                                style={s.feedbackInput} 
                                placeholder="Type construction feedback here..." 
                                placeholderTextColor="rgba(255,255,255,0.2)"
                                multiline 
                                value={gradingRemarks} 
                                onChangeText={setGradingRemarks} 
                            />
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 16, marginTop: 24 }}>
                            <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(255, 71, 87, 0.1)', borderColor: 'rgba(255, 71, 87, 0.3)' }]} onPress={() => handleGrade('Needs Improvement')}>
                                {saving ? <ActivityIndicator color="#ff4757" /> : <Text style={{color: '#ff4757', fontWeight: '800'}}>Needs Revision</Text>}
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.actionBtn, { backgroundColor: 'rgba(0, 242, 96, 0.1)', borderColor: 'rgba(0, 242, 96, 0.3)' }]} onPress={() => handleGrade('Approved')}>
                                {saving ? <ActivityIndicator color="#00f260" /> : <Text style={{color: '#00f260', fontWeight: '800'}}>Approve Exam</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* COURSE LAB MODAL */}
            <Modal visible={courseModalVisible} animationType="fade" transparent>
                <View style={s.modalOverlayCenter}>
                    <View style={[s.courseLabCard, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                        <Text style={s.drawerTitle}>Course Lab</Text>
                        <Text style={{color: 'rgba(255,255,255,0.4)', marginBottom: 24}}>Define a new track and deploy resources.</Text>
                        
                        <TextInput style={s.labInput} placeholder="Course Name (e.g. SQL Basics)" placeholderTextColor="rgba(255,255,255,0.2)" 
                            value={courseForm.title} onChangeText={t => setCourseForm({...courseForm, title: t})} />
                        <TextInput style={s.labInput} placeholder="Category (e.g. Database)" placeholderTextColor="rgba(255,255,255,0.2)" 
                            value={courseForm.category} onChangeText={t => setCourseForm({...courseForm, category: t})} />
                        <TextInput style={s.labInput} placeholder="Resource Link (PDF/Video URL)" placeholderTextColor="rgba(255,255,255,0.2)" 
                            value={courseForm.link} onChangeText={t => setCourseForm({...courseForm, link: t})} />
                        
                        <TouchableOpacity style={[s.gradeBtn, {marginTop: 16}]} onPress={handleCreateCourse}>
                            {saving ? <ActivityIndicator color="#00d2ff" /> : <Text style={s.gradeBtnText}>Deploy Course 🚀</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity style={{marginTop: 20, alignItems: 'center'}} onPress={() => setCourseModalVisible(false)}>
                            <Text style={{color: 'rgba(255,255,255,0.4)'}}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020b14' },
    glowOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, filter: 'blur(120px)', opacity: 0.15 },
    scroll: { padding: isMobile ? 20 : 40, paddingBottom: 120 },
    
    header: { marginBottom: 40, zIndex: 10, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    title: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 8 },
    subtitle: { fontSize: 16, color: 'rgba(0, 210, 255, 0.8)' },

    sectionTitle: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 },
    
    emptyBox: { padding: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    emptyText: { color: 'rgba(255,255,255,0.3)', fontWeight: '600' },

    rosterCard: { width: 300, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)', borderRadius: 24, padding: 24, marginRight: 24 },
    rosterTop: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
    rosterAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(0, 210, 255, 0.1)', alignItems: 'center', justifyContent: 'center' },
    rosterName: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
    rosterEmail: { color: 'rgba(255,255,255,0.4)', fontSize: 12 },
    progressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3, marginBottom: 24 },
    progressFill: { height: '100%', backgroundColor: '#00f260', borderRadius: 3, shadowColor: '#00f260', shadowOffset: {width:0, height:0}, shadowOpacity: 0.5, shadowRadius: 5 },
    directActionBtn: { paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    directActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    queueContainer: { gap: 16 },
    queueCard: { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 20, padding: 24 },
    queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    queueTitle: { fontSize: 20, color: '#fff', fontWeight: '800' },
    queueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255, 71, 87, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.3)' },
    queueBadgeText: { color: '#ff4757', fontSize: 10, fontWeight: '800' },
    queueStudent: { color: 'rgba(255,255,255,0.6)', marginBottom: 4 },
    queueDate: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
    gradeBtn: { paddingVertical: 14, borderRadius: 12, backgroundColor: 'rgba(0, 210, 255, 0.1)', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.3)' },
    gradeBtnText: { color: '#00d2ff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },

    fab: { position: 'absolute', bottom: 40, right: 40, zIndex: 100, shadowColor: '#8a2be2', shadowOffset: {width:0, height:10}, shadowOpacity: 0.4, shadowRadius: 20 },
    fabInner: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
    fabIcon: { color: '#fff', fontSize: 32, fontWeight: '300', marginTop: -4 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', flexDirection: isMobile ? 'column' : 'row' },
    drawerPanel: { width: isMobile ? '100%' : 500, height: isMobile ? '80%' : '100%', backgroundColor: 'rgba(6, 26, 46, 0.95)', borderTopLeftRadius: 32, borderTopRightRadius: isMobile ? 32 : 0, borderTopWidth: 1, borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 32 },
    drawerTitle: { fontSize: 28, color: '#fff', fontWeight: '800', letterSpacing: -0.5 },
    mcqBox: { padding: 20, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    feedbackInput: { height: 160, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 20, color: '#fff', fontSize: 16, textAlignVertical: 'top' },
    actionBtn: { flex: 1, paddingVertical: 18, borderRadius: 16, alignItems: 'center', borderWidth: 1 },

    modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    courseLabCard: { width: '100%', maxWidth: 500, backgroundColor: 'rgba(6, 26, 46, 0.95)', padding: 40, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    labInput: { width: '100%', height: 56, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', paddingHorizontal: 20, marginBottom: 16 }
});
