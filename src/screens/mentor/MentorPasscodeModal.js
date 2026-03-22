import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, GRADIENTS } from '../../theme';

const MENTOR_PASSCODE = '1234';

export default function MentorPasscodeModal({ navigation }) {
    const [code, setCode] = useState('');

    const verify = () => {
        if (code === MENTOR_PASSCODE) {
            navigation.replace('MentorDashboard');
        } else {
            Alert.alert('Wrong Passcode', 'Please try again.');
            setCode('');
        }
    };

    const PadBtn = ({ d }) => (
        <TouchableOpacity
            style={styles.padBtn}
            onPress={() => { if (code.length < 4) setCode(c => c + d); }}
        >
            <Text style={styles.padBtnText}>{d}</Text>
        </TouchableOpacity>
    );

    return (
        <LinearGradient colors={GRADIENTS.bg} style={styles.container}>
            <View style={styles.orb} />

            <Text style={styles.icon}>👨‍🏫</Text>
            <Text style={styles.title}>Mentor Access</Text>
            <Text style={styles.subtitle}>Enter passcode to continue</Text>

            {/* Dots */}
            <View style={styles.dots}>
                {[0, 1, 2, 3].map(i => (
                    <View key={i} style={[styles.dot, i < code.length && styles.dotFilled]} />
                ))}
            </View>

            {/* Numpad */}
            <View style={styles.pad}>
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((d, i) => (
                    d === '' ? <View key={i} style={styles.padBtn} /> :
                        d === '⌫' ? (
                            <TouchableOpacity key={i} style={styles.padBtn} onPress={() => setCode(c => c.slice(0, -1))}>
                                <Text style={styles.padBtnText}>{d}</Text>
                            </TouchableOpacity>
                        ) : <PadBtn key={i} d={d} />
                ))}
            </View>

            <TouchableOpacity
                style={[styles.unlockBtn, code.length < 4 && { opacity: 0.4 }]}
                onPress={verify}
                disabled={code.length < 4}
                activeOpacity={0.85}
            >
                <LinearGradient colors={[...GRADIENTS.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.unlockGrad}>
                    <Text style={styles.unlockText}>Unlock</Text>
                </LinearGradient>
            </TouchableOpacity>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    orb: {
        position: 'absolute', width: 250, height: 250,
        borderRadius: 125, backgroundColor: '#00D4FF',
        opacity: 0.04, top: 50,
    },
    icon: { fontSize: 52, marginBottom: 16 },
    title: { color: COLORS.white, fontSize: 28, fontWeight: '800', marginBottom: 8 },
    subtitle: { color: COLORS.muted, fontSize: 15, marginBottom: 40 },
    dots: { flexDirection: 'row', gap: 16, marginBottom: 40 },
    dot: {
        width: 16, height: 16, borderRadius: 8,
        borderWidth: 2, borderColor: COLORS.muted, backgroundColor: 'transparent',
    },
    dotFilled: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
    pad: { flexDirection: 'row', flexWrap: 'wrap', width: 240, gap: 12, justifyContent: 'center', marginBottom: 32 },
    padBtn: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
        alignItems: 'center', justifyContent: 'center',
    },
    padBtnText: { color: COLORS.white, fontSize: 22, fontWeight: '600' },
    unlockBtn: { borderRadius: RADIUS + 4, overflow: 'hidden', alignSelf: 'stretch' },
    unlockGrad: { paddingVertical: 14, alignItems: 'center' },
    unlockText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
