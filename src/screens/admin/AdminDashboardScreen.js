import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, RefreshControl, Platform, Alert, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

export default function AdminDashboardScreen({ navigation }) {
    const toast = useToast();
    const { logout } = useAuth();
    const [tab, setTab] = useState('overview');
    const [stats, setStats] = useState(null);
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [exams, setExams] = useState([]);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = async () => {
        try {
            const [sRes, m, c, e, st] = await Promise.all([
                api.get('/api/admin/students'),
                api.get('/api/admin/mentors'),
                api.get('/api/admin/courses'),
                api.get('/api/admin/exams'),
                api.get('/api/admin/stats')
            ]);
            setStudents(sRes.data); setMentors(m.data); setCourses(c.data); setExams(e.data);
            setStats(st.data);
        } catch (e) { toast.show('Failed to load data', 'error'); }
    };

    useFocusEffect(useCallback(() => { fetchAll(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

    const confirmDelete = async (type, id, name) => {
        const msg = `Delete "${name}"? This cannot be undone.`;
        const doDelete = async () => {
            try {
                await api.delete(`/api/admin/${type}/${id}`);
                toast.show(`${name} deleted`, 'success');
                fetchAll();
            } catch (e) { toast.show('Delete failed', 'error'); }
        };
        if (Platform.OS === 'web') { doDelete(); }
        else { Alert.alert('Delete', msg, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]); }
    };

    const filterList = (list, key) => search ? list.filter(i => (i[key] || '').toLowerCase().includes(search.toLowerCase())) : list;
    
    let activeList = [];
    if (tab === 'students') activeList = filterList(students, 'name');
    else if (tab === 'mentors') activeList = filterList(mentors, 'name');
    else if (tab === 'courses') activeList = filterList(courses, 'title');
    else if (tab === 'exams') activeList = filterList(exams, 'title');

    const renderHeader = () => (
        <View style={s.header}>
            <Text style={s.headerTitle}>Admin Panel</Text>
            <View style={s.userHub}>
                <View style={s.userInfo}>
                    <Text style={s.userName}>Rajesh J.</Text>
                    <Text style={s.userRole}>Administrator</Text>
                </View>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>RJ</Text>
                </View>
                <TouchableOpacity style={s.logoutBtn} onPress={() => {
                    if (Platform.OS === 'web') {
                        logout();
                    } else {
                        Alert.alert('Log Out', 'Are you sure you want to log out?', [
                            { text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: logout }
                        ]);
                    }
                }}>
                    <Text style={s.logoutBtnText}>➔</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTabs = () => {
        const tabs = [
            { key: 'overview', label: 'OVERVIEW' },
            { key: 'students', label: `LEARNERS (${students.length})` },
            { key: 'mentors', label: `MENTORS (${mentors.length})` },
            { key: 'courses', label: `COURSES (${courses.length})` },
            { key: 'exams', label: `EXAMS (${exams.length})` },
        ];
        
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 32, zIndex: 2 }}>
                <View style={[s.tabContainer, Platform.OS === 'web' && { backdropFilter: 'blur(25px)' }]}>
                    {tabs.map(t => {
                        const active = tab === t.key;
                        return (
                            <TouchableOpacity key={t.key} style={[s.tabPill, active && s.tabPillActive]} onPress={() => { setTab(t.key); setSearch(''); }}>
                                <Text style={[s.tabText, active && s.tabTextActive]}>{t.label}</Text>
                                {active && <View style={s.tabIndicator} />}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        );
    };

    const renderOverview = () => {
        if (!stats) return null;
        
        const StatCard = ({ title, val, icon }) => (
            <View style={[s.glassCard, s.statCard]}>
                <View style={s.statIconBox}><Text style={{ fontSize: 26 }}>{icon}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={s.statVal}>{val}</Text>
                    <Text style={s.statTitle}>{title}</Text>
                </View>
            </View>
        );

        return (
            <View style={[s.grid, isMobile && s.gridMobile]}>
                {/* Column 1: Cyan */}
                <View style={[s.col, isMobile && s.colMobile]}>
                    <View style={[s.glowOrb, { backgroundColor: '#00d2ff', left: -80, top: 0, opacity: 0.15 }]} />
                    <StatCard title="LEARNERS" val={stats.totalStudents} icon="🎓" />
                    <StatCard title="MENTORS" val={stats.totalMentors} icon="👨‍🏫" />
                </View>

                {/* Column 2: Blue/Purple, Dominant */}
                <View style={[s.colDom, isMobile && s.colMobile]}>
                    <View style={[s.glowOrb, { backgroundColor: '#8a2be2', right: -50, top: 20, opacity: 0.15, width: 300, height: 300 }]} />
                    <View style={[s.glassCard, s.centerCard]}>
                        <Text style={s.centerCardTitle}>Platform Performance</Text>
                        <View style={s.graphPlaceholder}>
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '30%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '55%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '40%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '80%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '65%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '100%' }]} />
                            <LinearGradient colors={['#00d2ff', 'transparent']} style={[s.bar, { height: '85%' }]} />
                        </View>
                        <View style={s.centerCardMetrics}>
                            <View style={s.badge}><Text style={s.badgeText}>{stats.totalCourses} Courses</Text></View>
                            <Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: 24, fontWeight: '300' }}>|</Text>
                            <View style={[s.badge, { borderColor: 'rgba(138,43,226,0.5)', backgroundColor: 'rgba(138,43,226,0.05)' }]}><Text style={s.badgeText}>{stats.totalExams} Live Exams</Text></View>
                        </View>
                    </View>
                </View>

                {/* Column 3: Red/Amber */}
                <View style={[s.col, isMobile && s.colMobile]}>
                    <View style={[s.glowOrb, { backgroundColor: '#ff416c', right: -20, bottom: -20, opacity: 0.15 }]} />
                    <StatCard title="SUBMISSIONS" val={stats.totalSubmissions} icon="📝" />
                    <StatCard title="PENDING" val={stats.pendingReviews} icon="⏳" />
                </View>
            </View>
        );
    };

    const renderEntity = (item, emojis, type, titleKey, subKey) => (
        <View key={item.id} style={[s.glassCard, s.listItem]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1 }}>
                <View style={s.listAvatar}><Text style={{ fontSize: 24 }}>{emojis}</Text></View>
                <View>
                    <Text style={s.listTitle}>{item[titleKey]}</Text>
                    <Text style={s.listSub}>{item[subKey] || 'N/A'}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                {type !== 'students' && (
                    <TouchableOpacity style={s.listBtnGhost} onPress={() => {
                        if(type==='mentors') navigation.navigate('AddMentor', {editMentor: item});
                        if(type==='courses') navigation.navigate('AddCourse', {editCourse: item});
                        if(type==='exams') navigation.navigate('AddExam', {editExamId: item.id});
                    }}>
                        <Text style={{ color: '#00d2ff', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Edit</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={s.listBtnDangerGhost} onPress={() => confirmDelete(type, item.id, item[titleKey])}>
                    <Text style={{ color: '#ff4757', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={s.container}>
            {/* Deep Radial Gradient Illusion */}
            <LinearGradient colors={['#04161F', '#0c2431']} style={StyleSheet.absoluteFillObject} />

            <ScrollView contentContainerStyle={s.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
                {renderHeader()}
                {renderTabs()}

                {tab === 'overview' ? renderOverview() : (
                    <View style={{ zIndex: 10 }}>
                        <View style={[s.glassCard, s.searchBar]}>
                            <Text style={{ fontSize: 18 }}>🔍</Text>
                            <TextInput style={s.searchInput} placeholder={`Search ${tab}…`} placeholderTextColor="rgba(255,255,255,0.3)" value={search} onChangeText={setSearch} />
                            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: '#fff', opacity: 0.5, fontSize: 18 }}>✕</Text></TouchableOpacity>}
                        </View>
                        
                        {activeList.length === 0 ? (
                            <View style={s.empty}>
                                <Text style={{ fontSize: 56, marginBottom: 20 }}>📭</Text>
                                <Text style={s.emptyTitle}>No tracking data</Text>
                            </View>
                        ) : (
                            activeList.map(item => {
                                if (tab === 'students') return renderEntity(item, '🎓', 'students', 'name', 'email');
                                if (tab === 'mentors') return renderEntity(item, '👨‍🏫', 'mentors', 'name', 'expertise');
                                if (tab === 'courses') return renderEntity(item, '📚', 'courses', 'title', 'category');
                                if (tab === 'exams') return renderEntity(item, '📋', 'exams', 'title', 'question_count');
                            })
                        )}
                    </View>
                )}
            </ScrollView>

            {(tab !== 'students' && tab !== 'overview') && (
                <View style={s.fabArea}>
                    <TouchableOpacity onPress={() => navigation.navigate(tab === 'mentors' ? 'AddMentor' : tab === 'courses' ? 'AddCourse' : 'AddExam')}>
                        <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={s.fabBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
                            <Text style={s.fabBtnText}>+ Create {tab.slice(0,-1)}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    {(tab === 'courses' || tab === 'exams') && (
                        <TouchableOpacity style={[s.fabBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => navigation.navigate('UploadExcel')}>
                            <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>📤 Bulk Upload</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#04161F' },
    glowOrb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, filter: 'blur(80px)', zIndex: 0 },
    scroll: { padding: isMobile ? 16 : 40, paddingBottom: 100 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, zIndex: 10, flexWrap: 'wrap', gap: 20 },
    headerTitle: { fontSize: 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
    userHub: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.02)', padding: 8, paddingLeft: 24, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    userInfo: { alignItems: 'flex-end', display: isMobile ? 'none' : 'flex' },
    userName: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
    userRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 210, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.3)' },
    avatarText: { color: '#00d2ff', fontWeight: '800', fontSize: 15 },
    logoutBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.2)', backgroundColor: 'transparent' },
    logoutBtnText: { color: '#ff4757', fontWeight: '600', fontSize: 18 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    tabPill: { paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, position: 'relative' },
    tabPillActive: { backgroundColor: 'rgba(255,255,255,0.06)' },
    tabText: { color: 'rgba(255,255,255,0.4)', fontWeight: '600', fontSize: 12, letterSpacing: 1 },
    tabTextActive: { color: '#fff', fontWeight: '800' },
    tabIndicator: { position: 'absolute', bottom: -6, left: '20%', right: '20%', height: 3, backgroundColor: '#00f260', borderRadius: 2, shadowColor: '#00f260', shadowOffset: {width:0,height:0}, shadowOpacity: 1, shadowRadius: 8 },

    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 24, padding: 24,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {})
    },

    grid: { flexDirection: 'row', gap: 24, zIndex: 10, alignItems: 'stretch' },
    gridMobile: { flexDirection: 'column' },
    col: { flex: 1, gap: 24, position: 'relative' },
    colDom: { flex: 1.5, position: 'relative' },
    colMobile: { flex: 0 },

    statCard: { flexDirection: 'row', alignItems: 'center', gap: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', flex: 1 },
    statIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    statVal: { fontSize: 42, fontWeight: '800', color: '#fff', letterSpacing: -1.5, marginBottom: 2 },
    statTitle: { fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 },

    centerCard: { flex: 1, justifyContent: 'space-between', padding: 36, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    centerCardTitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2.5, marginBottom: 32 },
    graphPlaceholder: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', minHeight: 160 },
    bar: { width: isMobile ? 16 : 28, borderRadius: 14, backgroundColor: 'transparent' },
    centerCardMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, marginTop: 40 },
    badge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(0,210,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    badgeText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5, fontSize: 13 },

    searchBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24, marginBottom: 24, gap: 16, borderRadius: 20 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16 },
    
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, marginBottom: 16, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.15)' },
    listAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    listTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6, letterSpacing: -0.5 },
    listSub: { fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
    listBtnGhost: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(0, 210, 255, 0.04)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)' },
    listBtnDangerGhost: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255, 71, 87, 0.04)', borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.2)' },

    empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
    emptyTitle: { color: 'rgba(255,255,255,0.2)', fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

    fabArea: { position: 'absolute', bottom: 40, right: 40, flexDirection: 'row', gap: 16, zIndex: 100 },
    fabBtn: { paddingHorizontal: 28, paddingVertical: 18, borderRadius: 20, shadowColor: '#00d2ff', shadowOffset: {width:0,height:8}, shadowOpacity: 0.2, shadowRadius: 24 },
    fabBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 1, textTransform: 'uppercase' }
});
