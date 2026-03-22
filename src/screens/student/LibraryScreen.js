import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Linking,
    TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';
import { RADIUS } from '../../theme';

export default function LibraryScreen() {
    const { colors, gradients } = useTheme();
    const [courses, setCourses] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');

    const fetchCourses = async () => {
        try { const res = await api.get('/api/courses'); setCourses(res.data); }
        catch (e) { console.log(e.message); }
    };

    useFocusEffect(useCallback(() => { fetchCourses(); }, []));
    const onRefresh = async () => { setRefreshing(true); await fetchCourses(); setRefreshing(false); };

    const filtered = search
        ? courses.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) ||
            (c.category || '').toLowerCase().includes(search.toLowerCase()) ||
            (c.description || '').toLowerCase().includes(search.toLowerCase()))
        : courses;

    const renderItem = ({ item }) => (
        <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
            <View style={s.cardTop}>
                {item.category && (
                    <View style={[s.catBadge, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '33' }]}>
                        <Text style={[s.catText, { color: colors.gold }]}>{item.category}</Text>
                    </View>
                )}
                <Text style={[s.date, { color: colors.muted }]}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={[s.cardTitle, { color: colors.white }]}>{item.title}</Text>
            {item.description ? <Text style={[s.desc, { color: colors.muted }]} numberOfLines={3}>{item.description}</Text> : null}
            {item.link ? (
                <TouchableOpacity style={[s.linkBtn, { borderColor: colors.blue + '33' }]}
                    onPress={() => Linking.openURL(item.link).catch(() => { })}>
                    <Text style={[s.linkText, { color: colors.blue }]}>🔗 Open Resource</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={s.header}>
                <Text style={[s.title, { color: colors.white }]}>Library 📚</Text>
                <Text style={[s.subtitle, { color: colors.muted }]}>{courses.length} course{courses.length !== 1 ? 's' : ''} available</Text>
            </View>

            {/* Search */}
            <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput style={[s.searchInput, { color: colors.white }]}
                    placeholder="Search courses…" placeholderTextColor={colors.muted}
                    value={search} onChangeText={setSearch} />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')}>
                        <Text style={{ color: colors.muted, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {filtered.length === 0 ? (
                <View style={s.empty}>
                    <Text style={{ fontSize: 48, marginBottom: 16 }}>{search ? '🔍' : '📖'}</Text>
                    <Text style={[s.emptyTitle, { color: colors.white }]}>{search ? 'No results' : 'No courses yet'}</Text>
                    <Text style={[s.emptyMsg, { color: colors.muted }]}>
                        {search ? 'Try a different search term' : 'Admin will add courses to the library.'}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={i => String(i.id)}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 24, paddingTop: 0 }}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
                />
            )}
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
    title: { fontSize: 28, fontWeight: '800' },
    subtitle: { fontSize: 14, marginTop: 4 },
    searchBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, marginHorizontal: 24, marginVertical: 12, gap: 10 },
    searchInput: { flex: 1, fontSize: 15 },
    card: { borderRadius: RADIUS, borderWidth: 1, padding: 16, marginBottom: 14 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    catBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
    catText: { fontSize: 11, fontWeight: '700' },
    date: { fontSize: 12 },
    cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
    desc: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
    linkBtn: { backgroundColor: 'rgba(66,133,244,0.08)', borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
    linkText: { fontWeight: '600', fontSize: 13 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    emptyMsg: { textAlign: 'center', lineHeight: 22 },
});
