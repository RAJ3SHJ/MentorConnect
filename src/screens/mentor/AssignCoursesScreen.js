import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

export default function AssignCoursesScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedCourseIds, setSelectedCourseIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get('/api/mentor/students'), api.get('/api/courses')])
            .then(([sRes, cRes]) => {
                setStudents(sRes.data);
                setCourses(cRes.data);
            })
            .catch(console.log)
            .finally(() => setLoading(false));
    }, []);

    const toggleCourse = (id) => {
        setSelectedCourseIds(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const save = async () => {
        if (!selectedStudent || selectedCourseIds.length === 0)
            return Alert.alert('Error', 'Select a learner and at least one course');
        setSaving(true);
        try {
            await api.post('/api/mentor/assign-course', { student_id: selectedStudent.id, course_ids: selectedCourseIds });
            Alert.alert('✅ Assigned', `${selectedCourseIds.length} course(s) added to ${selectedStudent.name}'s roadmap`);
            setSelectedStudent(null);
            setSelectedCourseIds([]);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <LinearGradient colors={GRADIENTS.bg} style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={COLORS.blue} size="large" />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={GRADIENTS.bg} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.back}>← Back</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Assign Courses 📋</Text>
            </View>

            <FlatList
                ListHeaderComponent={
                    <View>
                        <Text style={styles.sectionLabel}>1. Select Learner</Text>
                        {students.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.item, selectedStudent?.id === s.id && styles.itemSelected]}
                                onPress={() => setSelectedStudent(s)}
                            >
                                <View style={styles.avatar}><Text style={styles.avatarText}>{s.name[0]}</Text></View>
                                <Text style={styles.itemName}>{s.name}</Text>
                                {selectedStudent?.id === s.id && <Text style={{ color: COLORS.blue, fontSize: 20 }}>✓</Text>}
                            </TouchableOpacity>
                        ))}

                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>
                            2. Select Courses ({selectedCourseIds.length} selected)
                        </Text>
                        {courses.length === 0 ? (
                            <Text style={styles.muted}>No courses available. Ask admin to add some.</Text>
                        ) : courses.map(c => {
                            const selected = selectedCourseIds.includes(c.id);
                            return (
                                <TouchableOpacity
                                    key={c.id}
                                    style={[styles.item, selected && styles.itemSelected]}
                                    onPress={() => toggleCourse(c.id)}
                                >
                                    <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                                        {selected && <Text style={{ color: '#000', fontWeight: '800', fontSize: 12 }}>✓</Text>}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{c.title}</Text>
                                        {c.category && <Text style={styles.itemSub}>{c.category}</Text>}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85} style={{ marginTop: 24 }}>
                            <LinearGradient
                                colors={selectedStudent && selectedCourseIds.length > 0 ? [...GRADIENTS.accent] : ['#333', '#333']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.saveBtn}
                            >
                                <Text style={[styles.saveBtnText, { color: selectedStudent && selectedCourseIds.length > 0 ? '#000' : COLORS.muted }]}>
                                    {saving ? 'Assigning...' : `📋 Assign ${selectedCourseIds.length} Course(s)`}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                }
                data={[]}
                renderItem={null}
                contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 8 },
    back: { color: COLORS.muted, fontSize: 15, marginBottom: 12 },
    title: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
    sectionLabel: { color: COLORS.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10 },
    item: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.cardBorder,
        padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    itemSelected: { borderColor: COLORS.blue, backgroundColor: 'rgba(0,212,255,0.06)' },
    avatar: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(0,212,255,0.12)', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: COLORS.blue, fontWeight: '800', fontSize: 15 },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: COLORS.muted,
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxSelected: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
    itemName: { color: COLORS.white, fontWeight: '700', fontSize: 14, flex: 1 },
    itemSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
    muted: { color: COLORS.muted, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
    saveBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
    saveBtnText: { fontWeight: '700', fontSize: 16 },
});
