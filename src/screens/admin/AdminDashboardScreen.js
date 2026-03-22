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

export default function AdminDashboardScreen({ navigation }) {
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [tab, setTab] = useState('mentors');
    const [mentors, setMentors] = useState([]);
    const [courses, setCourses] = useState([]);
    const [exams, setExams] = useState([]);
    const [search, setSearch] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const fetchAll = async () => {
        try {
            const [m, c, e] = await Promise.all([
                api.get('/api/admin/mentors'),
                api.get('/api/admin/courses'),
                api.get('/api/admin/exams'),
            ]);
            setMentors(m.data); setCourses(c.data); setExams(e.data);
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
        if (Platform.OS === 'web') { if (window.confirm(msg)) doDelete(); }
        else {
            const { Alert } = require('react-native');
            Alert.alert('Delete', msg, [{ text: 'Cancel' }, { text: 'Delete', style: 'destructive', onPress: doDelete }]);
        }
    };

    // Filter by search
    const filterList = (list, key) =>
        search ? list.filter(i => (i[key] || '').toLowerCase().includes(search.toLowerCase())) : list;

    const filteredMentors = filterList(mentors, 'name');
    const filteredCourses = filterList(courses, 'title');
    const filteredExams = filterList(exams, 'title');
    const activeList = tab === 'mentors' ? filteredMentors : tab === 'courses' ? filteredCourses : filteredExams;

    const renderMentor = (m) => (
        <View key={m.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: colors.blue + '22' }]}>
                    <Text style={{ fontSize: 20 }}>👨‍🏫</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>{m.name}</Text>
                    <Text style={[s.cardSub, { color: colors.muted }]}>{m.expertise}</Text>
                </View>
            </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={[s.editBtn, { borderColor: colors.blue + '33' }]}
                    onPress={() => navigation.navigate('AddMentor', { editMentor: m })}>
                    <Text style={[s.editText, { color: colors.blue }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.delBtn, { borderColor: colors.danger + '33' }]} onPress={() => confirmDelete('mentors', m.id, m.name)}>
                    <Text style={[s.delText, { color: colors.danger }]}>🗑 Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderCourse = (c) => (
        <View key={c.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: colors.gold + '22' }]}>
                    <Text style={{ fontSize: 20 }}>📚</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>{c.title}</Text>
                    {c.category && <Text style={[s.cardSub, { color: colors.muted }]}>{c.category}</Text>}
                </View>
            </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={[s.editBtn, { borderColor: colors.blue + '33' }]}
                    onPress={() => navigation.navigate('AddCourse', { editCourse: c })}>
                    <Text style={[s.editText, { color: colors.blue }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.delBtn, { borderColor: colors.danger + '33' }]} onPress={() => confirmDelete('courses', c.id, c.title)}>
                    <Text style={[s.delText, { color: colors.danger }]}>🗑 Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderExam = (e) => (
        <View key={e.id} style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={s.cardHeader}>
                <View style={[s.avatar, { backgroundColor: colors.purple + '22' }]}>
                    <Text style={{ fontSize: 20 }}>📋</Text>
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: colors.white }]}>{e.title}</Text>
                    <Text style={[s.cardSub, { color: colors.muted }]}>{e.question_count || 0} questions</Text>
                </View>
            </View>
            <View style={s.btnRow}>
                <TouchableOpacity style={[s.editBtn, { borderColor: colors.blue + '33' }]}
                    onPress={() => navigation.navigate('AddExam', { editExamId: e.id })}>
                    <Text style={[s.editText, { color: colors.blue }]}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.delBtn, { borderColor: colors.danger + '33' }]} onPress={() => confirmDelete('exams', e.id, e.title)}>
                    <Text style={[s.delText, { color: colors.danger }]}>🗑 Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <ScrollView contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}>

                <Text style={[s.title, { color: colors.white }]}>Admin Panel</Text>

                {/* Tabs */}
                <View style={[s.tabs, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    {[
                        { key: 'mentors', label: `Mentors (${mentors.length})` },
                        { key: 'courses', label: `Courses (${courses.length})` },
                        { key: 'exams', label: `Exams (${exams.length})` },
                    ].map(t => (
                        <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && { backgroundColor: colors.blue }]}
                            onPress={() => { setTab(t.key); setSearch(''); }}>
                            <Text style={[s.tabText, { color: tab === t.key ? '#FFF' : colors.muted }]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Search Bar */}
                <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                    <Text style={{ fontSize: 16 }}>🔍</Text>
                    <TextInput
                        style={[s.searchInput, { color: colors.white }]}
                        placeholder={`Search ${tab}…`}
                        placeholderTextColor={colors.muted}
                        value={search} onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* List */}
                {activeList.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={{ fontSize: 40, marginBottom: 12 }}>{search ? '🔍' : '📭'}</Text>
                        <Text style={[s.emptyTitle, { color: colors.white }]}>
                            {search ? 'No results found' : `No ${tab} yet`}
                        </Text>
                        <Text style={[s.emptyMsg, { color: colors.muted }]}>
                            {search ? `Try a different search term` : `Add your first ${tab.slice(0, -1)}`}
                        </Text>
                    </View>
                ) : (
                    tab === 'mentors' ? filteredMentors.map(renderMentor)
                        : tab === 'courses' ? filteredCourses.map(renderCourse)
                            : filteredExams.map(renderExam)
                )}
            </ScrollView>

            {/* Floating Action Buttons */}
            <View style={s.fab}>
                <TouchableOpacity
                    onPress={() => navigation.navigate(tab === 'mentors' ? 'AddMentor' : tab === 'courses' ? 'AddCourse' : 'AddExam')}
                    activeOpacity={0.85}
                >
                    <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.addBtn}>
                        <Text style={s.addBtnText}>+ Add {tab === 'mentors' ? 'Mentor' : tab === 'courses' ? 'Course' : 'Exam'}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                {(tab === 'courses' || tab === 'exams') && (
                    <TouchableOpacity
                        style={[s.excelBtn, { borderColor: colors.purple + '44' }]}
                        onPress={() => navigation.navigate('UploadExcel')}
                        activeOpacity={0.85}
                    >
                        <Text style={[s.excelBtnText, { color: colors.purple }]}>📤 Excel</Text>
                    </TouchableOpacity>
                )}
            </View>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 100 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
    tabs: { flexDirection: 'row', borderRadius: 14, padding: 4, gap: 4, borderWidth: 1, marginBottom: 12 },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
    tabText: { fontWeight: '600', fontSize: 13 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, gap: 10 },
    searchInput: { flex: 1, fontSize: 15 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 12 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    cardTitle: { fontSize: 15, fontWeight: '700' },
    cardSub: { fontSize: 13, marginTop: 2 },
    btnRow: { flexDirection: 'row', gap: 8 },
    editBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
    editText: { fontWeight: '600', fontSize: 13 },
    delBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(255,71,87,0.06)' },
    delText: { fontWeight: '600', fontSize: 13 },
    empty: { padding: 40, alignItems: 'center' },
    emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    emptyMsg: { textAlign: 'center', lineHeight: 22 },
    fab: { position: 'absolute', bottom: 20, left: 24, right: 24, flexDirection: 'row', gap: 10 },
    addBtn: { flex: 1, borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
    addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    excelBtn: { borderRadius: RADIUS, borderWidth: 1, paddingHorizontal: 16, justifyContent: 'center', backgroundColor: 'rgba(142,68,173,0.08)' },
    excelBtnText: { fontWeight: '700', fontSize: 14 },
});
