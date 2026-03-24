import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

export default function AddCourseScreen({ navigation, route }) {
    const editCourse = route.params?.editCourse;
    const isEdit = !!editCourse;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [category, setCategory] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editCourse) {
            setTitle(editCourse.title || '');
            setDescription(editCourse.description || '');
            setLink(editCourse.link || '');
            setCategory(editCourse.category || '');
        }
    }, []);

    const save = async () => {
        if (!title) return Alert.alert('Error', 'Course title is required');
        setSaving(true);
        try {
            if (isEdit) {
                await api.put(`/api/admin/courses/${editCourse.id}`, { title, description, link, category });
                Alert.alert('✅ Updated', `"${title}" has been updated`, [
                    { text: 'OK', onPress: () => navigation.goBack() },
                ]);
            } else {
                await api.post('/api/admin/courses', { title, description, link, category });
                Alert.alert('✅ Course Added', `"${title}" is now available in the library`, [
                    { text: 'Add Another', onPress: () => { setTitle(''); setDescription(''); setLink(''); setCategory(''); } },
                    { text: 'Done', onPress: () => navigation.goBack() },
                ]);
            }
        } catch (e) {
            Alert.alert('Error', e.response?.data?.error || 'Failed');
        } finally { setSaving(false); }
    };

    return (
        <LinearGradient colors={GRADIENTS.bg} style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scroll}>

                    <Text style={styles.title}>{isEdit ? 'Edit Course ✏️' : 'Add Course 📚'}</Text>
                    <Text style={styles.subtitle}>{isEdit ? `Editing "${editCourse.title}"` : 'Create a new course for the library'}</Text>

                    <View style={styles.card}>
                        <Text style={styles.label}>Course Title *</Text>
                        <TextInput style={styles.input} placeholder="e.g. Business Analysis Fundamentals" placeholderTextColor={COLORS.muted} value={title} onChangeText={setTitle} />

                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                            placeholder="What will learners learn?"
                            placeholderTextColor={COLORS.muted}
                            value={description} onChangeText={setDescription} multiline
                        />

                        <Text style={styles.label}>Link (YouTube / Web URL)</Text>
                        <TextInput style={styles.input} placeholder="https://..." placeholderTextColor={COLORS.muted} value={link} onChangeText={setLink} keyboardType="url" autoCapitalize="none" />

                        <Text style={styles.label}>Category (optional)</Text>
                        <TextInput style={styles.input} placeholder="e.g. Agile, SQL, BA" placeholderTextColor={COLORS.muted} value={category} onChangeText={setCategory} />

                        <TouchableOpacity onPress={save} disabled={saving} activeOpacity={0.85}>
                            <LinearGradient colors={[...GRADIENTS.gold]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
                                <Text style={styles.btnText}>{saving ? 'Saving...' : isEdit ? '💾 Update Course' : '+ Add Course'}</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    title: { color: COLORS.white, fontSize: 28, fontWeight: '800' },
    subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 6, marginBottom: 24 },
    card: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.cardBorder, padding: 20,
    },
    label: { color: COLORS.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 14, marginBottom: 6 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 14,
        color: COLORS.white, fontSize: 15, borderWidth: 1, borderColor: COLORS.cardBorder, marginBottom: 4,
    },
    btn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
    btnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
