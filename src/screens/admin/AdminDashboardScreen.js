import React, { useState, useCallback, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, RefreshControl, Platform, Alert, useWindowDimensions,
    Animated
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/Toast';

export default function AdminDashboardScreen({ navigation }) {
    const { width } = useWindowDimensions();
    const isMobile = width < 768;
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const sidebarAnim = React.useRef(new Animated.Value(-300)).current;

    const toggleSidebar = (open) => {
        setIsSidebarOpen(open);
        Animated.timing(sidebarAnim, {
            toValue: open ? 0 : -300,
            duration: 300,
            useNativeDriver: Platform.OS !== 'web',
        }).start();
    };

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

    const styles = useMemo(() => getStyles(isMobile), [isMobile]);
    
    const renderHeader = () => (
        <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <TouchableOpacity style={styles.menuBtn} onPress={() => toggleSidebar(true)}>
                    <Text style={{ fontSize: 24, color: '#fff' }}>☰</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Admin Panel</Text>
            </View>
            <View style={styles.userHub}>
                {!isMobile && (
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>Rajesh J.</Text>
                        <Text style={styles.userRole}>Administrator</Text>
                    </View>
                )}
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>RJ</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={() => {
                    if (Platform.OS === 'web') {
                        logout();
                    } else {
                        Alert.alert('Log Out', 'Are you sure you want to log out?', [
                            { text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: logout }
                        ]);
                    }
                }}>
                    <Text style={styles.logoutBtnText}>➔</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSidebar = () => {
        const tabs = [
            { key: 'overview', label: 'Overview', icon: '📊' },
            { key: 'students', label: 'Learners', icon: '🎓', count: students.length },
            { key: 'mentors', label: 'Mentors', icon: '👨‍🏫', count: mentors.length },
            { key: 'courses', label: 'Courses', icon: '📚', count: courses.length },
            { key: 'exams', label: 'Exams', icon: '📝', count: exams.length },
        ];
        
        return (
            <>
                {isSidebarOpen && <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={() => toggleSidebar(false)} />}
                <Animated.View style={[styles.sidebar, { transform: [{ translateX: sidebarAnim }] }, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                    <View style={styles.sidebarHeader}>
                        <Text style={styles.sidebarTitle}>Navigation</Text>
                        <TouchableOpacity onPress={() => toggleSidebar(false)}>
                            <Text style={{ fontSize: 20, color: 'rgba(255,255,255,0.4)' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sidebarBody}>
                        {tabs.map(t => {
                            const active = tab === t.key;
                            return (
                                <TouchableOpacity 
                                    key={t.key} 
                                    style={[styles.sidebarItem, active && styles.sidebarItemActive, Platform.OS === 'web' && { cursor: 'pointer' }]} 
                                    onPress={() => { 
                                        setTab(t.key); 
                                        setSearch(''); 
                                        toggleSidebar(false); 
                                    }}
                                >
                                    <View style={styles.sidebarIconBox}><Text style={{ fontSize: 20 }}>{t.icon}</Text></View>
                                    <Text style={[styles.sidebarText, active && styles.sidebarTextActive]}>{t.label}</Text>
                                    {t.count !== undefined && <View style={styles.sidebarBadge}><Text style={styles.sidebarBadgeText}>{t.count}</Text></View>}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.hideSidebarBtn} onPress={() => toggleSidebar(false)}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>← Hide Sidebar</Text>
                    </TouchableOpacity>
                </Animated.View>
            </>
        );
    };

    const renderOverview = () => {
        if (!stats) return null;
        
        const StatCard = ({ title, val, icon }) => (
            <View style={[styles.glassCard, styles.statCard]}>
                <View style={styles.statIconBox}><Text style={{ fontSize: 26 }}>{icon}</Text></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.statVal}>{val}</Text>
                    <Text style={styles.statTitle}>{title}</Text>
                </View>
            </View>
        );

        return (
            <View style={styles.overviewContainer}>
                {/* Stats Section: 1x4 stack for mobile, 2 columns for tablet/desktop */}
                <View style={[styles.statGrid, isMobile && styles.statGridMobile]}>
                    <StatCard title="LEARNERS" val={stats.totalStudents} icon="🎓" />
                    <StatCard title="MENTORS" val={stats.totalMentors} icon="👨‍🏫" />
                    <StatCard title="SUBMISSIONS" val={stats.totalSubmissions} icon="📝" />
                    <StatCard title="PENDING" val={stats.pendingReviews} icon="⏳" />
                </View>

                {/* Performance Section: Full width below stats */}
                <View style={[styles.glassCard, styles.centerCard, isMobile && styles.centerCardMobile]}>
                    <Text style={styles.centerCardTitle}>Platform Performance</Text>
                    <View style={styles.graphPlaceholder}>
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '30%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '55%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '40%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '80%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '65%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '100%' }]} />
                        <LinearGradient colors={['#00d2ff', 'transparent']} style={[styles.bar, { height: '85%' }]} />
                    </View>
                    <View style={styles.centerCardMetrics}>
                        <View style={styles.badge}><Text style={styles.badgeText}>{stats.totalCourses} Courses</Text></View>
                        {!isMobile && <Text style={{ color: 'rgba(255,255,255,0.1)', fontSize: 24, fontWeight: '300' }}>|</Text>}
                        <View style={[styles.badge, { borderColor: 'rgba(138,43,226,0.5)', backgroundColor: 'rgba(138,43,226,0.05)' }]}><Text style={styles.badgeText}>{stats.totalExams} Live Exams</Text></View>
                    </View>
                </View>
            </View>
        );
    };

    const renderEntity = (item, emojis, type, titleKey, subKey) => (
        <View key={item.id} style={[styles.glassCard, styles.listItem]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, flex: 1 }}>
                <View style={styles.listAvatar}><Text style={{ fontSize: 24 }}>{emojis}</Text></View>
                <View>
                    <Text style={styles.listTitle}>{item[titleKey]}</Text>
                    <Text style={styles.listSub}>{item[subKey] || 'N/A'}</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                {type !== 'students' && (
                    <TouchableOpacity style={styles.listBtnGhost} onPress={() => {
                        if(type==='mentors') navigation.navigate('AddMentor', {editMentor: item});
                        if(type==='courses') navigation.navigate('AddCourse', {editCourse: item});
                        if(type==='exams') navigation.navigate('AddExam', {editExamId: item.id});
                    }}>
                        <Text style={{ color: '#00d2ff', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Edit</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.listBtnDangerGhost} onPress={() => confirmDelete(type, item.id, item[titleKey])}>
                    <Text style={{ color: '#ff4757', fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Deep Radial Gradient Illusion */}
            <LinearGradient colors={['#04161F', '#0c2431']} style={StyleSheet.absoluteFillObject} />

            <ScrollView contentContainerStyle={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}>
                {renderHeader()}
                
                {/* Visual Tab Breadcrumb for context */}
                <View style={styles.breadcrumb}>
                    <Text style={styles.breadcrumbText}>Admin / <Text style={{ color: '#00d2ff' }}>{tab.toUpperCase()}</Text></Text>
                </View>

                {tab === 'overview' ? renderOverview() : (
                    <View style={{ zIndex: 10 }}>
                        <View style={[styles.glassCard, styles.searchBar]}>
                            <Text style={{ fontSize: 18 }}>🔍</Text>
                            <TextInput style={styles.searchInput} placeholder={`Search ${tab}…`} placeholderTextColor="rgba(255,255,255,0.3)" value={search} onChangeText={setSearch} />
                            {search.length > 0 && <TouchableOpacity onPress={() => setSearch('')}><Text style={{ color: '#fff', opacity: 0.5, fontSize: 18 }}>✕</Text></TouchableOpacity>}
                        </View>
                        
                        {activeList.length === 0 ? (
                            <View style={styles.empty}>
                                <Text style={{ fontSize: 56, marginBottom: 20 }}>📭</Text>
                                <Text style={styles.emptyTitle}>No tracking data</Text>
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
                <View style={styles.fabArea}>
                    <TouchableOpacity onPress={() => navigation.navigate(tab === 'mentors' ? 'AddMentor' : tab === 'courses' ? 'AddCourse' : 'AddExam')}>
                        <LinearGradient colors={['#00d2ff', '#3a7bd5']} style={styles.fabBtn} start={{x:0, y:0}} end={{x:1, y:1}}>
                            <Text style={styles.fabBtnText}>+ Create {tab.slice(0,-1)}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    {(tab === 'courses' || tab === 'exams') && (
                        <TouchableOpacity style={[styles.fabBtn, { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]} onPress={() => navigation.navigate('UploadExcel')}>
                            <Text style={{ color: '#fff', fontWeight: '700', letterSpacing: 0.5 }}>📤 Bulk Upload</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {renderSidebar()}
        </View>
    );
}

const getStyles = (isMobile) => StyleSheet.create({
    container: { flex: 1, backgroundColor: '#04161F' },
    glowOrb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, filter: 'blur(80px)', zIndex: 0 },
    scroll: { padding: isMobile ? 16 : 40, paddingBottom: 100 },
    
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? 24 : 40, zIndex: 10, flexWrap: 'wrap', gap: 20 },
    headerTitle: { fontSize: isMobile ? 24 : 36, fontWeight: '800', color: '#fff', letterSpacing: -1 },
    menuBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    userHub: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.02)', padding: 6, paddingLeft: 16, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    userInfo: { alignItems: 'flex-end', display: isMobile ? 'none' : 'flex' },
    userName: { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 },
    userRole: { color: 'rgba(255,255,255,0.3)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0, 210, 255, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.3)' },
    avatarText: { color: '#00d2ff', fontWeight: '800', fontSize: 12 },
    logoutBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 71, 87, 0.2)', backgroundColor: 'transparent' },
    logoutBtnText: { color: '#ff4757', fontWeight: '600', fontSize: 16 },
    
    breadcrumb: { marginBottom: isMobile ? 12 : 24, paddingLeft: 4 },
    breadcrumbText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },

    sidebar: { 
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, 
        backgroundColor: 'rgba(12, 36, 49, 0.95)', zIndex: 2000, 
        padding: 24, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)',
        paddingTop: Platform.OS === 'ios' ? 60 : 40 
    },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1999 },
    sidebarTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    sidebarBody: { flex: 1 },
    sidebarItem: { 
        flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, 
        borderRadius: 16, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.02)' 
    },
    sidebarItemActive: { backgroundColor: 'rgba(0, 210, 255, 0.12)', borderWidth: 1, borderColor: 'rgba(0, 210, 255, 0.2)' },
    sidebarIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    sidebarText: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '600' },
    sidebarTextActive: { color: '#fff', fontWeight: '800' },
    sidebarBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
    sidebarBadgeText: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700' },
    hideSidebarBtn: { marginTop: 20, alignItems: 'center', padding: 12 },

    glassCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 24, padding: 24,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {})
    },

    overviewContainer: { gap: 20 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    statGridMobile: { flexDirection: 'column', gap: 12 },

    statCard: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', flex: isMobile ? 0 : 1, minHeight: isMobile ? 90 : 110, minWidth: isMobile ? '100%' : 200 },
    statIconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    statVal: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 2 },
    statTitle: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1 },

    centerCard: { flex: 0, justifyContent: 'space-between', padding: isMobile ? 20 : 36, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', minHeight: isMobile ? 260 : 320 },
    centerCardMobile: { marginTop: 8 },
    centerCardTitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24 },
    graphPlaceholder: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', height: 120 },
    bar: { width: isMobile ? 12 : 28, borderRadius: 14, backgroundColor: 'transparent' },
    centerCardMetrics: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: isMobile ? 12 : 24, marginTop: isMobile ? 24 : 32, flexWrap: 'wrap' },
    badge: { paddingHorizontal: isMobile ? 14 : 20, paddingVertical: isMobile ? 10 : 12, borderRadius: 24, backgroundColor: 'rgba(0,210,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    badgeText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5, fontSize: 13 },

    searchBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 24, marginBottom: 24, gap: 16, borderRadius: 20 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16 },
    
    listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? 16 : 24, marginBottom: 12, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.15)' },
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
