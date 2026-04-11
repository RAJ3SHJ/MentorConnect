import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../api/client';
import { useTheme } from '../../ThemeContext';

export default function AssignCoursesScreen({ navigation, route }) {
    const { colors, gradients } = useTheme();
    const insets = useSafeAreaInsets();
    const [students, setStudents] = useState([]);
    const [courses, setCourses] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(route.params?.student || null);
    const [selectedCourseIds, setSelectedCourseIds] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/api/mentor/my-students'), // Show ONLY connected learners
            api.get('/api/courses')
        ])
            .then(([sRes, cRes]) => {
                const fetchedStudents = sRes.data || [];
                setStudents(fetchedStudents);
                setCourses(cRes.data || []);
                
                // If a student was passed in but isn't found in the current roster (unlikely), reset
                if (route.params?.student && !fetchedStudents.find(s => s.id === route.params.student.id)) {
                    // This case is unlikely but good for defensive coding
                }
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
            return Alert.alert('Selection Required', 'Please select courses and then choose a connected learner.');
        
        setSaving(true);
        try {
            await api.post('/api/mentor/assign-course', { 
                student_id: selectedStudent.id, 
                course_ids: selectedCourseIds 
            });
            Alert.alert('✅ Roadmap Updated', `The selected courses have been assigned to ${selectedStudent.name}.`);
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to update roadmap');
        } finally { setSaving(false); }
    };

    if (loading) {
        return (
            <LinearGradient colors={gradients.bg} style={[s.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={colors.blue} size="large" />
            </LinearGradient>
        );
    }

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.header, { paddingTop: insets.top + 12 }]}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={[s.back, { color: colors.muted }]}>← Back</Text>
                </TouchableOpacity>
                <Text style={[s.title, { color: colors.white }]}>Create Learner Roadmap 🗺️</Text>
                <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                    Design a personalized learning track for your students.
                </Text>
            </View>

            <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40 }}>
                {/* Step 1: Courses Library */}
                <Text style={s.sectionLabel}>1. Select Courses from Library</Text>
                <View style={s.courseList}>
                    {courses.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={{ color: colors.muted }}>No courses available in library.</Text>
                        </View>
                    ) : courses.map(c => {
                        const isSelected = selectedCourseIds.includes(c.id);
                        return (
                            <TouchableOpacity
                                key={c.id}
                                style={[s.courseCard, { 
                                    backgroundColor: colors.card,
                                    borderColor: isSelected ? colors.blue : colors.glassBorder 
                                }]}
                                onPress={() => toggleCourse(c.id)}
                                activeOpacity={0.7}
                            >
                                <View style={[s.checkbox, { borderColor: isSelected ? colors.blue : colors.muted, backgroundColor: isSelected ? colors.blue : 'transparent' }]}>
                                    {isSelected && <Text style={{ color: '#000', fontWeight: '800', fontSize: 10 }}>✓</Text>}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[s.courseTitle, { color: colors.white }]}>{c.title}</Text>
                                    <Text style={{ color: colors.muted, fontSize: 11 }}>{c.category || 'General'}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Step 2: Target Learner */}
                <Text style={[s.sectionLabel, { marginTop: 32 }]}>2. Assign to My Connected Learner</Text>
                <View style={s.studentGrid}>
                    {students.length === 0 ? (
                        <View style={s.emptyBox}>
                            <Text style={{ color: colors.muted, textAlign: 'center' }}>
                                You have no connected learners yet. Connect with a student from the Alerts tab first.
                            </Text>
                        </View>
                    ) : (
                        students.map(std => {
                            const isStdSelected = selectedStudent?.id === std.id;
                            return (
                                <TouchableOpacity
                                    key={std.id}
                                    style={[s.studentTab, { 
                                        backgroundColor: colors.card,
                                        borderColor: isStdSelected ? colors.blue : colors.glassBorder
                                    }]}
                                    onPress={() => setSelectedStudent(std)}
                                >
                                    <View style={[s.avatar, { backgroundColor: colors.blue + '15' }]}>
                                        <Text style={{ color: colors.blue, fontWeight: '800' }}>{std.name[0]}</Text>
                                    </View>
                                    <Text style={[s.studentName, { color: isStdSelected ? colors.blue : colors.white }]} numberOfLines={1}>
                                        {std.name.split(' ')[0]}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })
                    )}
                </View>

                {/* Footer Action */}
                <TouchableOpacity 
                    onPress={save} 
                    disabled={saving || !selectedStudent || selectedCourseIds.length === 0}
                    style={{ marginTop: 40 }}
                >
                    <LinearGradient
                        colors={(!selectedStudent || selectedCourseIds.length === 0) ? [colors.glass, colors.glass] : gradients.accent}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.saveBtn}
                    >
                        {saving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={[s.saveBtnText, { color: (!selectedStudent || selectedCourseIds.length === 0) ? colors.muted : '#fff' }]}>
                                🚀 Deploy Roadmap
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingHorizontal: 24, paddingBottom: 16 },
    back: { fontSize: 14, marginBottom: 16 },
    title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
    sectionLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, color: 'rgba(255,255,255,0.4)' },
    courseList: { gap: 10 },
    courseCard: { 
        flexDirection: 'row', alignItems: 'center', gap: 14, 
        padding: 14, borderRadius: 16, borderWidth: 1 
    },
    checkbox: { 
        width: 20, height: 20, borderRadius: 6, borderWidth: 2, 
        alignItems: 'center', justifyContent: 'center' 
    },
    courseTitle: { fontWeight: '700', fontSize: 15 },
    studentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    studentTab: { 
        width: '31%', paddingVertical: 16, alignItems: 'center', 
        borderRadius: 16, borderWidth: 1, gap: 8 
    },
    avatar: { 
        width: 36, height: 36, borderRadius: 18, 
        alignItems: 'center', justifyContent: 'center' 
    },
    studentName: { fontSize: 12, fontWeight: '700' },
    emptyBox: { 
        padding: 24, borderRadius: 16, borderWidth: 1, 
        borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', 
        alignItems: 'center', justifyContent: 'center' 
    },
    saveBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
});
