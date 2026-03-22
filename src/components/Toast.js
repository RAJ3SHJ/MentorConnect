import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';

const ToastContext = createContext();

const TOAST_TYPES = {
    success: { emoji: '✅', bg: 'rgba(46,213,115,0.15)', border: 'rgba(46,213,115,0.4)', text: '#2ED573' },
    error: { emoji: '❌', bg: 'rgba(255,71,87,0.15)', border: 'rgba(255,71,87,0.4)', text: '#FF4757' },
    info: { emoji: 'ℹ️', bg: 'rgba(66,133,244,0.15)', border: 'rgba(66,133,244,0.4)', text: '#4285F4' },
    warning: { emoji: '⚠️', bg: 'rgba(255,182,39,0.15)', border: 'rgba(255,182,39,0.4)', text: '#FFB627' },
};

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-80)).current;
    const timeoutRef = useRef(null);

    const show = useCallback((message, type = 'success', duration = 3000) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setToast({ message, type });
        Animated.parallel([
            Animated.spring(fadeAnim, { toValue: 1, useNativeDriver: true, friction: 10 }),
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, friction: 10 }),
        ]).start();
        timeoutRef.current = setTimeout(() => hide(), duration);
    }, []);

    const hide = useCallback(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -80, duration: 250, useNativeDriver: true }),
        ]).start(() => setToast(null));
    }, []);

    const config = toast ? TOAST_TYPES[toast.type] || TOAST_TYPES.info : null;

    return (
        <ToastContext.Provider value={{ show, hide }}>
            {children}
            {toast && (
                <Animated.View
                    style={[
                        styles.container,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }], backgroundColor: config.bg, borderColor: config.border },
                    ]}
                    pointerEvents="box-none"
                >
                    <TouchableOpacity style={styles.inner} onPress={hide} activeOpacity={0.9}>
                        <Text style={styles.emoji}>{config.emoji}</Text>
                        <Text style={[styles.message, { color: config.text }]} numberOfLines={2}>{toast.message}</Text>
                        <Text style={styles.close}>✕</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be inside ToastProvider');
    return ctx;
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute', top: Platform.OS === 'web' ? 16 : 56, left: 16, right: 16,
        borderRadius: 16, borderWidth: 1,
        ...(Platform.OS === 'web' ? { backdropFilter: 'blur(12px)' } : {}),
        zIndex: 9999, elevation: 20,
    },
    inner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
    emoji: { fontSize: 20 },
    message: { flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    close: { color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: '700', paddingLeft: 8 },
});
