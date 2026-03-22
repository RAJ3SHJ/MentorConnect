import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../ThemeContext';
import { useToast } from '../../components/Toast';
import { RADIUS } from '../../theme';

const ADMIN_PASSCODE = '1234';

export default function AdminPasscodeModal({ navigation }) {
    const { colors, gradients } = useTheme();
    const toast = useToast();
    const [code, setCode] = useState('');
    const inputRef = useRef(null);

    // Auto-focus hidden input on mount
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 300);
    }, []);

    const handleCodeChange = (text) => {
        // Only allow digits, max 4
        const clean = text.replace(/[^0-9]/g, '').slice(0, 4);
        setCode(clean);
        if (clean.length === 4) {
            if (clean === ADMIN_PASSCODE) {
                navigation.replace('AdminDashboard');
            } else {
                toast.show('Wrong passcode. Try again.', 'error');
                setTimeout(() => setCode(''), 300);
            }
        }
    };

    const PadBtn = ({ d }) => (
        <TouchableOpacity
            style={[s.padBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
            onPress={() => { if (code.length < 4) setCode(c => { const next = c + d; handleCodeChange(next); return ''; }); }}
            activeOpacity={0.7}
        >
            <Text style={[s.padBtnText, { color: colors.white }]}>{d}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={gradients.bg} style={s.container}>
            <View style={[s.orb, { backgroundColor: colors.gold }]} />
            <Text style={s.icon}>🔐</Text>
            <Text style={[s.title, { color: colors.white }]}>Admin Access</Text>
            <Text style={{ color: colors.muted, fontSize: 15, marginBottom: 32 }}>Enter admin passcode or type it</Text>

            {/* Hidden TextInput for keyboard support */}
            <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={4}
                secureTextEntry
                autoFocus
                style={[s.hiddenInput, { color: colors.white, borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
                placeholder="Type passcode..."
                placeholderTextColor={colors.muted}
            />

            {/* Dot indicators */}
            <View style={s.dots}>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[s.dot, { borderColor: colors.muted }, i < code.length && { backgroundColor: colors.gold, borderColor: colors.gold }]} />
                ))}
            </View>

            {/* Number pad */}
            <View style={s.pad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
                    d === '' ? <View key={i} style={s.padBtn} /> :
                        d === '⌫' ? (
                            <TouchableOpacity key={i} style={[s.padBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                                onPress={() => setCode(c => c.slice(0, -1))}>
                                <Text style={[s.padBtnText, { color: colors.muted }]}>{d}</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity key={i} style={[s.padBtn, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
                                onPress={() => handleCodeChange(code + d)}
                                activeOpacity={0.7}>
                                <Text style={[s.padBtnText, { color: colors.white }]}>{d}</Text>
                            </TouchableOpacity>
                        )
                ))}
            </View>

            <TouchableOpacity
                style={[s.unlockBtn, code.length < 4 && { opacity: 0.4 }]}
                onPress={() => handleCodeChange(code)}
                disabled={code.length < 4}
                activeOpacity={0.85}
            >
                <LinearGradient colors={gradients.accent} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.unlockGrad}>
                    <Text style={s.unlockText}>Unlock Admin</Text>
                </LinearGradient>
            </TouchableOpacity>
        </LinearGradient>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    orb: { position: 'absolute', width: 250, height: 250, borderRadius: 125, opacity: 0.04, top: 50 },
    icon: { fontSize: 52, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
    hiddenInput: {
        width: 200, textAlign: 'center', fontSize: 24, fontWeight: '700',
        letterSpacing: 12, borderRadius: 14, borderWidth: 1,
        paddingVertical: 12, paddingHorizontal: 16, marginBottom: 20,
    },
    dots: { flexDirection: 'row', gap: 16, marginBottom: 32 },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, backgroundColor: 'transparent' },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center', marginBottom: 32 },
    padBtn: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    padBtnText: { fontSize: 22, fontWeight: '600' },
    unlockBtn: { borderRadius: RADIUS + 4, overflow: 'hidden', alignSelf: 'stretch' },
    unlockGrad: { paddingVertical: 14, alignItems: 'center' },
    unlockText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
