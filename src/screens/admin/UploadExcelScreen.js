import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Alert, Platform, ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../api/client';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

// SheetJS will be loaded dynamically
let XLSX = null;

export default function UploadExcelScreen({ navigation, route }) {
    const uploadType = route.params?.type || 'courses'; // 'courses' | 'exams'
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const pickFile = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: [
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'application/vnd.ms-excel',
                    'text/csv',
                ],
                copyToCacheDirectory: true,
            });

            if (res.canceled) return;
            const picked = res.assets?.[0];
            if (!picked) return;
            setFile(picked);
            setResult(null);

            // Load and parse the file
            if (!XLSX) {
                XLSX = require('xlsx');
            }

            let data;
            if (Platform.OS === 'web') {
                // On web, fetch the file URI as arraybuffer
                const resp = await fetch(picked.uri);
                const buf = await resp.arrayBuffer();
                data = new Uint8Array(buf);
            } else {
                const FileSystem = require('expo-file-system');
                const base64 = await FileSystem.readAsStringAsync(picked.uri, { encoding: FileSystem.EncodingType.Base64 });
                data = base64;
            }

            const workbook = XLSX.read(data, { type: Platform.OS === 'web' ? 'array' : 'base64' });

            if (uploadType === 'courses') {
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet);
                setPreview(rows.slice(0, 10));
            } else {
                // Exams: first sheet = exams, second sheet (if exists) = questions
                const examSheet = workbook.Sheets[workbook.SheetNames[0]];
                const examRows = XLSX.utils.sheet_to_json(examSheet);
                const qSheet = workbook.SheetNames.length > 1 ? workbook.Sheets[workbook.SheetNames[1]] : null;
                const qRows = qSheet ? XLSX.utils.sheet_to_json(qSheet) : [];
                setPreview({ exams: examRows.slice(0, 10), questions: qRows.slice(0, 10) });
            }
        } catch (e) {
            const msg = e?.message || 'Failed to read file';
            if (Platform.OS === 'web') window.alert(msg);
            else Alert.alert('Error', msg);
        }
    };

    const upload = async () => {
        if (!preview) return;
        setUploading(true);
        try {
            if (uploadType === 'courses') {
                // Map preview rows to course objects
                const courses = preview.map(r => ({
                    title: r.Title || r.title || r.TITLE || '',
                    description: r.Description || r.description || '',
                    link: r.Link || r.link || r.URL || r.url || '',
                    category: r.Category || r.category || '',
                })).filter(c => c.title);
                const res = await api.post('/api/admin/courses/bulk', { courses });
                setResult(`✅ ${res.data.added} course(s) uploaded successfully!`);
            } else {
                // Group questions by exam title
                const examMap = {};
                const examRows = preview.exams || [];
                const qRows = preview.questions || [];

                for (const er of examRows) {
                    const title = er.Title || er.title || er['Exam Title'] || '';
                    if (title && !examMap[title]) examMap[title] = [];
                }

                for (const q of qRows) {
                    const examTitle = q['Exam Title'] || q.exam_title || q.ExamTitle || '';
                    if (!examMap[examTitle]) examMap[examTitle] = [];
                    examMap[examTitle].push({
                        question_text: q.Question || q.question_text || q['Question Text'] || '',
                        option_a: q['Option A'] || q.option_a || q.A || '',
                        option_b: q['Option B'] || q.option_b || q.B || '',
                        option_c: q['Option C'] || q.option_c || q.C || '',
                        option_d: q['Option D'] || q.option_d || q.D || '',
                    });
                }

                const exams = Object.entries(examMap).map(([title, questions]) => ({
                    title,
                    questions: questions.length > 0 ? questions : [{ question_text: 'Sample Question', option_a: 'A', option_b: 'B', option_c: 'C', option_d: 'D' }],
                }));

                const res = await api.post('/api/admin/exams/bulk', { exams });
                setResult(`✅ ${res.data.added} exam(s) uploaded successfully!`);
            }
        } catch (e) {
            setResult(`❌ Upload failed: ${e.response?.data?.error || e.message}`);
        } finally { setUploading(false); }
    };

    return (
        <LinearGradient colors={GRADIENTS.bg} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>

                <Text style={styles.title}>
                    Upload {uploadType === 'courses' ? 'Courses' : 'Exams'} 📤
                </Text>
                <Text style={styles.subtitle}>Import from an Excel (.xlsx) or CSV file</Text>

                {/* Format guide */}
                <View style={styles.guideCard}>
                    <Text style={styles.guideTitle}>📋 Expected Format</Text>
                    {uploadType === 'courses' ? (
                        <Text style={styles.guideText}>
                            Columns: <Text style={styles.guideBold}>Title</Text>, Description, Link, Category{'\n'}
                            (Only Title is required)
                        </Text>
                    ) : (
                        <Text style={styles.guideText}>
                            <Text style={styles.guideBold}>Sheet 1 (Exams):</Text> Title{'\n'}
                            <Text style={styles.guideBold}>Sheet 2 (Questions):</Text> Exam Title, Question, Option A, Option B, Option C, Option D
                        </Text>
                    )}
                </View>

                {/* Pick file */}
                <TouchableOpacity onPress={pickFile} activeOpacity={0.85}>
                    <View style={styles.pickBtn}>
                        <Text style={{ fontSize: 28, marginBottom: 8 }}>📂</Text>
                        <Text style={styles.pickText}>{file ? file.name : 'Tap to select Excel file'}</Text>
                        {file && <Text style={styles.pickSize}>{Math.round((file.size || 0) / 1024)} KB</Text>}
                    </View>
                </TouchableOpacity>

                {/* Preview */}
                {preview && (
                    <View style={styles.previewCard}>
                        <Text style={styles.previewTitle}>Preview ({uploadType === 'courses' ? preview.length : (preview.exams?.length || 0)} rows)</Text>
                        {uploadType === 'courses' ? (
                            preview.slice(0, 5).map((r, i) => (
                                <Text key={i} style={styles.previewRow} numberOfLines={1}>
                                    {i + 1}. {r.Title || r.title || JSON.stringify(r).slice(0, 60)}
                                </Text>
                            ))
                        ) : (
                            <>
                                <Text style={styles.previewSubHead}>Exams:</Text>
                                {(preview.exams || []).slice(0, 3).map((r, i) => (
                                    <Text key={i} style={styles.previewRow} numberOfLines={1}>
                                        {i + 1}. {r.Title || r.title || ''}
                                    </Text>
                                ))}
                                <Text style={[styles.previewSubHead, { marginTop: 8 }]}>Questions:</Text>
                                {(preview.questions || []).slice(0, 3).map((r, i) => (
                                    <Text key={i} style={styles.previewRow} numberOfLines={1}>
                                        {i + 1}. {r.Question || r.question_text || ''}
                                    </Text>
                                ))}
                            </>
                        )}
                    </View>
                )}

                {/* Upload button */}
                {preview && !result && (
                    <TouchableOpacity onPress={upload} disabled={uploading} activeOpacity={0.85}>
                        <LinearGradient colors={GRADIENTS.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.uploadBtn}>
                            {uploading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.uploadBtnText}>🚀 Upload {uploadType === 'courses' ? 'Courses' : 'Exams'}</Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Result */}
                {result && (
                    <View style={[styles.resultCard, result.startsWith('❌') && { borderColor: 'rgba(255,71,87,0.3)' }]}>
                        <Text style={styles.resultText}>{result}</Text>
                        <TouchableOpacity onPress={() => { setFile(null); setPreview(null); setResult(null); }} style={styles.resetBtn}>
                            <Text style={styles.resetBtnText}>Upload Another</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scroll: { padding: 24, paddingBottom: 40 },
    title: { color: COLORS.white, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: COLORS.muted, fontSize: 14, marginTop: 6, marginBottom: 24 },
    guideCard: {
        backgroundColor: 'rgba(66,133,244,0.06)', borderRadius: RADIUS,
        borderWidth: 1, borderColor: 'rgba(66,133,244,0.2)',
        padding: 16, marginBottom: 20,
    },
    guideTitle: { color: COLORS.blue, fontWeight: '700', fontSize: 14, marginBottom: 8 },
    guideText: { color: COLORS.muted, fontSize: 13, lineHeight: 20 },
    guideBold: { color: COLORS.white, fontWeight: '700' },
    pickBtn: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 2, borderColor: COLORS.glassBorder, borderStyle: 'dashed',
        padding: 30, alignItems: 'center', marginBottom: 20,
    },
    pickText: { color: COLORS.white, fontWeight: '600', fontSize: 15 },
    pickSize: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
    previewCard: {
        backgroundColor: COLORS.card, borderRadius: RADIUS,
        borderWidth: 1, borderColor: COLORS.glassBorder,
        padding: 16, marginBottom: 20,
    },
    previewTitle: { color: COLORS.blue, fontWeight: '700', fontSize: 14, marginBottom: 10 },
    previewSubHead: { color: COLORS.purple, fontWeight: '700', fontSize: 12, marginBottom: 6 },
    previewRow: { color: COLORS.muted, fontSize: 13, paddingVertical: 3 },
    uploadBtn: { borderRadius: RADIUS, paddingVertical: 14, alignItems: 'center' },
    uploadBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    resultCard: {
        backgroundColor: 'rgba(46,213,115,0.06)', borderRadius: RADIUS,
        borderWidth: 1, borderColor: 'rgba(46,213,115,0.2)',
        padding: 24, alignItems: 'center', marginTop: 16,
    },
    resultText: { color: COLORS.white, fontSize: 16, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
    resetBtn: { backgroundColor: 'rgba(66,133,244,0.1)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(66,133,244,0.25)' },
    resetBtnText: { color: COLORS.blue, fontWeight: '700' },
});
