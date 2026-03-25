import React, { useState, useCallback } from 'react';
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

// ── Design Tokens ────────────────────────────────────────────────────────────
const C = {
    bg: '#04161F',
    bgCard: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.06)',
    borderTop: 'rgba(255,255,255,0.10)',
    borderMuted: 'rgba(255,255,255,0.15)',
    primary: '#00d2ff',
    danger: '#ff4757',
    white: '#fff',
    muted: 'rgba(255,255,255,0.30)',
    faint: 'rgba(255,255,255,0.50)',
};

const RADIUS = { sm: 12, md: 16, lg: 24, xl: 32 };

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
        const doDelete = async () => {
            try {
                await api.delete(`/api/admin/${type}/${id}`);
                toast.show(`${name} deleted`, 'success');
                fetchAll();
            } catch (e) { toast.show('Delete failed', 'error'); }
        };
        if (Platform.OS === 'web') doDelete();
        else Alert.alert('Delete', `Delete "${name}"?`, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
    };

    const filterList = (list, key) => search
        ? list.filter(i => (i[key] || '').toLowerCase().includes(search.toLowerCase()))
        : list;

    let activeList = [];
    if (tab === 'students') activeList = filterList(students, 'name');
    else if (tab === 'mentors') activeList = filterList(mentors, 'name');
    else if (tab === 'courses') activeList = filterList(courses, 'title');
    else if (tab === 'exams') activeList = filterList(exams, 'title');

    // ── Header ──────────────────────────────────────────────────────────────
    const renderHeader = () => (
        <View style={s.header}>
            <View style={s.headerLeft}>
                <TouchableOpacity style={s.menuBtn} onPress={() => toggleSidebar(true)}>
                    <Text style={{ fontSize: 22, color: C.white }}>☰</Text>
                </TouchableOpacity>
                <Text style={[s.headerTitle, isMobile && { fontSize: 22 }]}>Admin Panel</Text>
            </View>
            <View style={s.userHub}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>RJ</Text>
                </View>
                <TouchableOpacity
                    style={s.logoutBtn}
                    onPress={() => {
                        if (Platform.OS === 'web') logout();
                        else Alert.alert('Log Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: logout }]);
                    }}
                >
                    <Text style={{ color: C.danger, fontWeight: '600', fontSize: 16 }}>➔</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Sidebar ──────────────────────────────────────────────────────────────
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
                {isSidebarOpen && (
                    <TouchableOpacity
                        activeOpacity={1}
                        style={StyleSheet.absoluteFillObject}
                        onPress={() => toggleSidebar(false)}
                    >
                        <View style={s.backdrop} />
                    </TouchableOpacity>
                )}
                <Animated.View style={[s.sidebar, { transform: [{ translateX: sidebarAnim }] }, Platform.OS === 'web' && { backdropFilter: 'blur(30px)' }]}>
                    <View style={s.sidebarHeader}>
                        <Text style={{ color: C.white, fontSize: 20, fontWeight: '800' }}>Navigation</Text>
                        <TouchableOpacity onPress={() => toggleSidebar(false)}>
                            <Text style={{ color: C.muted, fontSize: 20 }}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1 }}>
                        {tabs.map(t => {
                            const active = tab === t.key;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[s.sidebarItem, active && s.sidebarItemActive]}
                                    onPress={() => { setTab(t.key); setSearch(''); toggleSidebar(false); }}
                                >
                                    <View style={s.sidebarIconBox}>
                                        <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                                    </View>
                                    <Text style={[s.sidebarText, active && { color: C.white, fontWeight: '800' }]}>{t.label}</Text>
                                    {t.count !== undefined && (
                                        <View style={s.sidebarBadge}>
                                            <Text style={{ color: C.faint, fontSize: 10, fontWeight: '700' }}>{t.count}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                    <TouchableOpacity style={s.hideSidebarBtn} onPress={() => toggleSidebar(false)}>
                        <Text style={{ color: C.muted, fontWeight: '600' }}>← Hide</Text>
                    </TouchableOpacity>
                </Animated.View>
            </>
        );
    };

    // ── Overview ─────────────────────────────────────────────────────────────
    const renderOverview = () => {
        if (!stats) return null;

        const StatCard = ({ title, val, icon }) => (
            <View style={s.statCard}>
                <View style={s.statIconBox}>
                    <Text style={{ fontSize: 26 }}>{icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.statVal}>{val}</Text>
                    <Text style={s.statTitle}>{title}</Text>
                </View>
            </View>
        );

        return (
            <View style={{ gap: 16 }}>
                {/* Stat Grid — 2 per row on mobile, 4 across on desktop */}
                <View style={s.statGrid}>
                    <StatCard title="LEARNERS" val={stats.totalStudents} icon="🎓" />
                    <StatCard title="MENTORS" val={stats.totalMentors} icon="👨‍🏫" />
                    <StatCard title="SUBMISSIONS" val={stats.totalSubmissions} icon="📝" />
                    <StatCard title="PENDING" val={stats.pendingReviews} icon="⏳" />
                </View>

                {/* Performance chart — full width, height auto */}
                <View style={[s.card, Platform.OS === 'web' && { backdropFilter: 'blur(20px)' }]}>
                    <Text style={s.cardLabel}>Platform Performance</Text>
                    <View style={s.chartRow}>
                        {[30, 55, 40, 80, 65, 100, 85].map((h, i) => (
                            <LinearGradient
                                key={i}
                                colors={[C.primary, 'transparent']}
                                style={[s.chartBar, { height: h }]}
                            />
                        ))}
                    </View>
                    <View style={s.badgeRow}>
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{stats.totalCourses} Courses</Text>
                        </View>
                        <View style={[s.badge, { borderColor: 'rgba(138,43,226,0.4)', backgroundColor: 'rgba(138,43,226,0.05)' }]}>
                            <Text style={s.badgeText}>{stats.totalExams} Live Exams</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // ── Entity Row ────────────────────────────────────────────────────────────
    const renderEntity = (item, emoji, type, titleKey, subKey) => (
        <View key={item.id} style={s.entityCard}>
            {/* Info row */}
            <View style={s.entityInfo}>
                <View style={s.entityAvatar}>
                    <Text style={{ fontSize: 22 }}>{emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={s.entityTitle} numberOfLines={1}>{item[titleKey]}</Text>
                    <Text style={s.entitySub} numberOfLines={1}>{item[subKey] || 'N/A'}</Text>
                </View>
            </View>
            {/* Action buttons — always on their own row, no clipping */}
            <View style={s.entityActions}>
                {type !== 'students' && (
                    <TouchableOpacity
                        style={[s.actionBtn, s.actionBtnBlue]}
                        onPress={() => {
                            if (type === 'mentors') navigation.navigate('AddMentor', { editMentor: item });
                            if (type === 'courses') navigation.navigate('AddCourse', { editCourse: item });
                            if (type === 'exams') navigation.navigate('AddExam', { editExamId: item.id });
                        }}
                    >
                        <Text style={[s.actionBtnText, { color: C.primary }]}>Edit</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[s.actionBtn, s.actionBtnRed]}
                    onPress={() => confirmDelete(type, item.id, item[titleKey])}
                >
                    <Text style={[s.actionBtnText, { color: C.danger }]}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // ── Root ─────────────────────────────────────────────────────────────────
    return (
        <View style={s.root}>
            <LinearGradient colors={['#04161F', '#0c2431']} style={StyleSheet.absoluteFillObject} />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[s.scroll, { paddingHorizontal: isMobile ? 16 : 40 }]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {renderHeader()}

                {/* Breadcrumb */}
                <View style={{ marginBottom: 16, paddingLeft: 4 }}>
                    <Text style={s.breadcrumb}>
                        Admin / <Text style={{ color: C.primary }}>{tab.toUpperCase()}</Text>
                    </Text>
                </View>

                {tab === 'overview' ? renderOverview() : (
                    <View>
                        {/* Search */}
                        <View style={s.searchBar}>
                            <Text style={{ fontSize: 18 }}>🔍</Text>
                            <TextInput
                                style={s.searchInput}
                                placeholder={`Search ${tab}…`}
                                placeholderTextColor={C.muted}
                                value={search}
                                onChangeText={setSearch}
                            />
                            {search.length > 0 && (
                                <TouchableOpacity onPress={() => setSearch('')}>
                                    <Text style={{ color: C.faint, fontSize: 18 }}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {activeList.length === 0 ? (
                            <View style={s.emptyState}>
                                <Text style={{ fontSize: 48, marginBottom: 16 }}>📭</Text>
                                <Text style={s.emptyText}>No tracking data</Text>
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

                {/* Create / Bulk buttons — inline in scroll, NOT absolutely positioned */}
                {(tab !== 'students' && tab !== 'overview') && (
                    <View style={s.fabRow}>
                        <TouchableOpacity
                            style={{ flex: 1 }}
                            onPress={() => navigation.navigate(tab === 'mentors' ? 'AddMentor' : tab === 'courses' ? 'AddCourse' : 'AddExam')}
                        >
                            <LinearGradient
                                colors={['#00d2ff', '#3a7bd5']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={s.fabBtn}
                            >
                                <Text style={s.fabBtnText}>+ Create {tab.slice(0, -1)}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        {(tab === 'courses' || tab === 'exams') && (
                            <TouchableOpacity
                                style={[s.fabBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border }]}
                                onPress={() => navigation.navigate('UploadExcel')}
                            >
                                <Text style={{ color: C.white, fontWeight: '700' }}>📤 Bulk Upload</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </ScrollView>

            {renderSidebar()}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#04161F' },
    scroll: { paddingTop: 20, paddingBottom: 60 },

    // ── Header ──
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
    menuBtn: { width: 44, height: 44, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    userHub: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 40, borderWidth: 1, borderColor: C.border },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,210,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#00d2ff', fontWeight: '800', fontSize: 12 },
    logoutBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)', alignItems: 'center', justifyContent: 'center' },

    breadcrumb: { color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },

    // ── Sidebar ──
    sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 280, backgroundColor: 'rgba(12,36,49,0.97)', zIndex: 2000, padding: 24, borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.1)', paddingTop: Platform.OS === 'ios' ? 60 : 40 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1999 },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 },
    sidebarItem: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: RADIUS.md, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.02)' },
    sidebarItemActive: { backgroundColor: 'rgba(0,210,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    sidebarIconBox: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    sidebarText: { color: C.faint, fontSize: 15, fontWeight: '600', flex: 1 },
    sidebarBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.1)' },
    hideSidebarBtn: { marginTop: 16, padding: 12, alignItems: 'center' },

    // ── Card base ──
    card: { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderTopWidth: 1, borderTopColor: C.borderTop, borderRadius: RADIUS.lg, padding: 20 },
    cardLabel: { fontSize: 11, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 },

    // ── Stat grid — flex-wrap gives 2 per row on narrow screens ──
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderTopWidth: 1, borderTopColor: C.borderTop, borderRadius: RADIUS.lg, padding: 20, flexBasis: '47%', flexGrow: 1 },
    statIconBox: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
    statVal: { fontSize: 30, fontWeight: '800', color: '#fff', letterSpacing: -1, marginBottom: 2 },
    statTitle: { fontSize: 10, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 1 },

    // ── Chart ──
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-evenly', height: 90, marginBottom: 20 },
    chartBar: { width: 14, borderRadius: 7, backgroundColor: 'transparent' },
    badgeRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
    badge: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: RADIUS.xl, backgroundColor: 'rgba(0,210,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,210,255,0.2)' },
    badgeText: { color: '#fff', fontWeight: '800', letterSpacing: 0.5, fontSize: 13 },

    // ── Search ──
    searchBar: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 20, marginBottom: 20 },
    searchInput: { flex: 1, color: '#fff', fontSize: 16 },

    // ── Entity list items ──
    entityCard: { backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderLeftWidth: 2, borderLeftColor: C.borderMuted, borderRadius: RADIUS.lg, marginBottom: 12 },
    entityInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, paddingBottom: 10 },
    entityAvatar: { width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    entityTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
    entitySub: { fontSize: 13, color: C.muted, fontWeight: '500' },
    entityActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingBottom: 14, flexWrap: 'wrap' },
    actionBtn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.sm, alignItems: 'center', borderWidth: 1 },
    actionBtnBlue: { backgroundColor: 'rgba(0,210,255,0.04)', borderColor: 'rgba(0,210,255,0.2)' },
    actionBtnRed: { backgroundColor: 'rgba(255,71,87,0.04)', borderColor: 'rgba(255,71,87,0.2)' },
    actionBtnText: { fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

    // ── Empty state ──
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 64 },
    emptyText: { color: 'rgba(255,255,255,0.2)', fontSize: 22, fontWeight: '800' },

    // ── FAB row (inline, not absolute) ──
    fabRow: { flexDirection: 'row', gap: 12, marginTop: 24, flexWrap: 'wrap' },
    fabBtn: { paddingVertical: 18, paddingHorizontal: 24, borderRadius: RADIUS.lg, alignItems: 'center' },
    fabBtnText: { color: '#fff', fontWeight: '800', fontSize: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
});
