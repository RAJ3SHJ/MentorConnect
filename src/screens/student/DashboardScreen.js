import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

const ProgressRing = ({ pct, size = 160, stroke = 12 }) => {
    const accentColor = pct === 100 ? '#00f260' : '#00d2ff';
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: 'rgba(255,255,255,0.05)' }} />
            <View style={{
                position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: stroke,
                borderColor: accentColor,
                borderTopColor: pct > 75 ? accentColor : 'transparent',
                borderRightColor: pct > 50 ? accentColor : 'transparent',
                borderBottomColor: pct > 25 ? accentColor : 'transparent',
                borderLeftColor: pct > 0 ? accentColor : 'transparent',
                transform: [{ rotate: '-90deg' }], opacity: 0.9,
            }} />
            <Text style={{ color: '#FFF', fontSize: 36, fontWeight: '800', letterSpacing: -1 }}>{pct}%</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Complete</Text>
        </View>
    );
};

export default function DashboardScreen() {
    const { user } = useAuth();
    const navigation = useNavigation();
    const [stats, setStats] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try { const res = await api.get('/api/student/dashboard-stats'); setStats(res.data); }
        catch (e) { console.log('Dashboard fetch fail', e.message); }
    };

    useFocusEffect(useCallback(() => { fetchStats(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

    const r = stats?.roadmap || { total: 0, complete: 0, inProgress: 0, yetToStart: 0 };
    const e = stats?.exams || { total: 0, pending: 0, approved: 0, needsImprovement: 0 };

    // Simulated Gamification Data (Would normally come from backend)
    const currentStreak = Math.floor(Math.random() * 10) + 2; 
    const points = (r.complete * 150) + (e.approved * 300) + 450; 

    return (
        <View style={s.container}>
            {/* Immersive Learning Atmosphere */}
            <LinearGradient colors={['#040a18', '#0B132B']} style={StyleSheet.absoluteFillObject} />
            <View style={[s.glowOrb, { backgroundColor: '#4a00e0', top: -150, left: -50 }]} />
            <View style={[s.glowOrb, { backgroundColor: '#00d2ff', bottom: -100, right: -150 }]} />

            <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d2ff" />}>
                
                {/* Header */}
                <View style={s.headerRow}>
                    <View>
                        <Text style={s.greeting}>Welcome, {user?.name?.split(' ')[0]}</Text>
                        <Text style={s.greetingSub}>Let's conquer your objectives today.</Text>
                    </View>
                    <TouchableOpacity style={s.gearBtn} onPress={() => navigation.navigate('Settings')}>
                        <Text style={{ fontSize: 24 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>

                {/* GAMIFICATION WIDGET ROW */}
                <View style={s.widgetRow}>
                    <View style={[s.widgetCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.widgetIconBox}><Text style={{fontSize: 20}}>🔥</Text></View>
                        <View>
                            <Text style={s.widgetValue}>{currentStreak} Day</Text>
                            <Text style={s.widgetLabel}>Learning Streak</Text>
                        </View>
                    </View>
                    <View style={[s.widgetCard, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                        <View style={s.widgetIconBox}><Text style={{fontSize: 20}}>⭐</Text></View>
                        <View>
                            <Text style={s.widgetValue}>{points.toLocaleString()}</Text>
                            <Text style={s.widgetLabel}>Total XP points</Text>
                        </View>
                    </View>
                </View>

                {/* THE ACTIVE ROADMAP HERO CARD */}
                <Text style={s.sectionTitle}>🎯 Active Roadmap</Text>
                <View style={[s.heroCard, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                    <LinearGradient colors={['rgba(0, 210, 255, 0.05)', 'transparent']} style={StyleSheet.absoluteFillObject} />
                    
                    <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 32, alignItems: 'center' }}>
                        <ProgressRing pct={stats?.progressPct || 0} />
                        
                        <View style={{ flex: 1, width: '100%', alignItems: isMobile ? 'center' : 'flex-start' }}>
                            <View style={s.statusBadge}><Text style={s.statusBadgeText}>IN PROGRESS</Text></View>
                            <Text style={s.courseTitle}>Advanced Cloud Architecture</Text>
                            <Text style={s.courseSub}>Module 4: Security & Compliance</Text>
                            
                            <TouchableOpacity style={s.resumeBtn} onPress={() => navigation.navigate('Roadmap')}>
                                <LinearGradient colors={['#00d2ff', '#3a7bd5']} start={{x:0, y:0}} end={{x:1, y:1}} style={s.resumeBtnInner}>
                                    <Text style={s.resumeBtnText}>Resume Learning ➔</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* HIGH PRIORITY MENTOR ASSIGNMENTS */}
                <Text style={[s.sectionTitle, { marginTop: 10 }]}>⚠️ Mentor Assignments</Text>
                <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 16 }}>
                    
                    <View style={[s.taskCard, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                        <View style={s.taskAvatar}><Text style={{fontSize: 24}}>👨‍🏫</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.taskTitle}>{stats?.mentor ? stats.mentor.name : 'No Mentor Assigned'}</Text>
                            <Text style={s.taskSub}>{e.needsImprovement > 0 ? `${e.needsImprovement} exams need revision` : 'Awaiting your submission'}</Text>
                        </View>
                        <TouchableOpacity style={s.actionBtnGhost} onPress={() => navigation.navigate('Assessment')}>
                            <Text style={s.actionBtnText}>View</Text>
                        </TouchableOpacity>
                    </View>
                    
                    <View style={[s.taskCard, { borderColor: 'rgba(255, 71, 87, 0.2)' }, Platform.OS === 'web' && { backdropFilter: 'blur(15px)' }]}>
                        <View style={[s.taskAvatar, { backgroundColor: 'rgba(255, 71, 87, 0.1)' }]}><Text style={{fontSize: 24}}>📝</Text></View>
                        <View style={{ flex: 1 }}>
                            <Text style={s.taskTitle}>Upcoming Exams</Text>
                            <Text style={[s.taskSub, { color: '#ff4757' }]}>{e.total - e.approved} pending completion</Text>
                        </View>
                        <TouchableOpacity style={[s.actionBtnGhost, { borderColor: 'rgba(255, 71, 87, 0.3)' }]} onPress={() => navigation.navigate('TakeExam')}>
                            <Text style={[s.actionBtnText, { color: '#ff4757' }]}>Start</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#040a18' },
    glowOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, filter: 'blur(120px)', opacity: 0.2 },
    scroll: { padding: isMobile ? 20 : 40, paddingBottom: 100 },
    
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, zIndex: 10 },
    greeting: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 4 },
    greetingSub: { fontSize: 16, color: 'rgba(255,255,255,0.5)' },
    gearBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },

    widgetRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    widgetCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 20 },
    widgetIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    widgetValue: { fontSize: 22, color: '#fff', fontWeight: '800', marginBottom: 2 },
    widgetLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 },

    sectionTitle: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16, marginLeft: 4 },
    
    heroCard: { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)', borderRadius: 32, padding: 32, marginBottom: 40, overflow: 'hidden' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0, 210, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.3)', marginBottom: 16 },
    statusBadgeText: { color: '#00d2ff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    courseTitle: { fontSize: 26, color: '#fff', fontWeight: '800', marginBottom: 8, textAlign: isMobile ? 'center' : 'left' },
    courseSub: { fontSize: 15, color: 'rgba(255,255,255,0.5)', marginBottom: 32, textAlign: isMobile ? 'center' : 'left' },
    resumeBtn: { width: isMobile ? '100%' : 'auto', alignSelf: 'flex-start', shadowColor: '#00d2ff', shadowOffset: {width:0, height:8}, shadowOpacity: 0.3, shadowRadius: 20 },
    resumeBtnInner: { paddingHorizontal: 32, paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    resumeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.5 },

    taskCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20 },
    taskAvatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    taskTitle: { fontSize: 17, color: '#fff', fontWeight: '700', marginBottom: 4 },
    taskSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
    actionBtnGhost: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(0, 210, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)' },
    actionBtnText: { color: '#00d2ff', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }
});
