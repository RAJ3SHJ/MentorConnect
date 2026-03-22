import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

export default function LinkStudentScreen({ navigation }) {
    const [students, setStudents] = useState([]);
    const [mentors, setMentors] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedMentor, setSelectedMentor] = useState(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([api.get('/api/mentor/students'), api.get('/api/mentor/list')])
            .then(([sRes, mRes]) => {
                setStudents(sRes.data);
                setMentors(mRes.data);
            })
            .catch(console.log)
            .finally(() => setLoading(false));
    }, []);

    const save = async () => {
        if (!selectedStudent || !selectedMentor) return Alert.alert('Error', 'Select both a learner and a mentor');
        setSaving(true);
        try {
            await api.post('/api/mentor/link', { mentor_id: selectedMentor.id, student_id: selectedStudent.id });
            Alert.alert('✅ Linked', `${selectedMentor.name} linked to ${selectedStudent.name}`);
            setSelectedStudent(null);
            setSelectedMentor(null);
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed to link');
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
                <Text style={styles.title}>Link Learner 🔗</Text>
            </View>

            <FlatList
                ListHeaderComponent={
                    <View>
                        <Text style={styles.sectionLabel}>1. Select Learner</Text>
                        {students.map(s => (
                            <TouchableOpacity
                                key={s.id}
                                style={[styles.listItem, selectedStudent?.id === s.id && styles.listItemSelected]}
                                onPress={() => setSelectedStudent(s)}
                            >
                                <View style={styles.avatar}><Text style={styles.avatarText}>{s.name[0]}</Text></View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{s.name}</Text>
                                    <Text style={styles.itemSub}>{s.email}</Text>
                                    {s.mentor_name && <Text style={styles.currentMentor}>Currently: {s.mentor_name}</Text>}
                                </View>
                                {selectedStudent?.id === s.id && <Text style={{ color: COLORS.blue, fontSize: 20 }}>✓</Text>}
                            </TouchableOpacity>
                        ))}

                        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>2. Select Mentor</Text>
                        {mentors.length === 0 ? (
                            <Text style={styles.muted}>No mentors added yet. Ask admin to add mentors first.</Text>
                        ) : mentors.map(m => (
                            <TouchableOpacity
                                key={m.id}
                                style={[styles.listItem, selectedMentor?.id === m.id && styles.listItemSelected]}
                                onPress={() => setSelectedMentor(m)}
                            >
                                <View style={[styles.avatar, { backgroundColor: 'rgba(255,182,39,0.15)' }]}>
                                    <Text style={[styles.avatarText, { color: COLORS.gold }]}>{m.name[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{m.name}</Text>
                                    {m.expertise && <Text style={styles.itemSub}>{m.expertise}</Text>}
                                </View>
                                {selectedMentor?.id === m.id && <Text style={{ color: COLORS.blue, fontSize: 20 }}>✓</Text>}
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity onPress={save} disabled={saving || !selectedStudent || !selectedMentor} activeOpacity={0.85} style={{ marginTop: 24 }}>
                            <LinearGradient
                                colors={selectedStudent && selectedMentor ? [...GRADIENTS.accent] : ['#333', '#333']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.saveBtn}
                            >
                                <Text style={[styles.saveBtnText, { color: selectedStudent && selectedMentor ? '#000' : COLORS.muted }]}>
                                    {saving ? 'Linking...' : '🔗 Link Now'}
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
    listItem: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.cardBorder,
        padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    },
    listItemSelected: { borderColor: COLORS.blue, backgroundColor: 'rgba(0,212,255,0.06)' },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,212,255,0.12)', alignItems: 'center', justifyContent: 'center',
    },
    avatarText: { color: COLORS.blue, fontWeight: '800', fontSize: 16 },
    itemName: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
    itemSub: { color: COLORS.muted, fontSize: 12, marginTop: 2 },
    currentMentor: { color: COLORS.gold, fontSize: 11, marginTop: 2 },
    muted: { color: COLORS.muted, fontSize: 14, fontStyle: 'italic', marginBottom: 12 },
    saveBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
    saveBtnText: { fontWeight: '700', fontSize: 16 },
});
