import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Available Theme Presets ───
const THEMES = {
    obsidian: {
        name: 'Obsidian',
        icon: '🖤',
        bg: '#0D0D0D', bgAlt: '#111111',
        card: 'rgba(26,26,26,0.85)', cardBorder: 'rgba(255,255,255,0.08)',
        tabBar: '#0D0D0D', glass: 'rgba(26,26,26,0.65)', glassBorder: 'rgba(255,255,255,0.1)',
        blue: '#4285F4', purple: '#8E44AD', teal: '#4285F4',
        gold: '#FFB627', success: '#2ED573', danger: '#FF4757',
        white: '#F0F0F0', muted: 'rgba(255,255,255,0.45)',
        accent: ['#4285F4', '#8E44AD'],
        bgGrad: ['#0D0D0D', '#111111'],
    },
    midnight: {
        name: 'Midnight Blue',
        icon: '🌊',
        bg: '#0A0F1E', bgAlt: '#07142B',
        card: 'rgba(18,28,50,0.9)', cardBorder: 'rgba(0,212,255,0.12)',
        tabBar: '#0A0F1E', glass: 'rgba(18,28,50,0.7)', glassBorder: 'rgba(0,212,255,0.15)',
        blue: '#00D4FF', purple: '#6C5CE7', teal: '#00D4FF',
        gold: '#FFB627', success: '#2ED573', danger: '#FF4757',
        white: '#F0F0F0', muted: 'rgba(255,255,255,0.45)',
        accent: ['#00D4FF', '#0091AF'],
        bgGrad: ['#0A0F1E', '#07142B'],
    },
    aurora: {
        name: 'Aurora',
        icon: '🌌',
        bg: '#0F0A1A', bgAlt: '#1A0F2E',
        card: 'rgba(30,15,50,0.85)', cardBorder: 'rgba(168,85,247,0.15)',
        tabBar: '#0F0A1A', glass: 'rgba(30,15,50,0.65)', glassBorder: 'rgba(168,85,247,0.2)',
        blue: '#A855F7', purple: '#EC4899', teal: '#A855F7',
        gold: '#F59E0B', success: '#10B981', danger: '#EF4444',
        white: '#F5F0FF', muted: 'rgba(255,255,255,0.4)',
        accent: ['#A855F7', '#EC4899'],
        bgGrad: ['#0F0A1A', '#1A0F2E'],
    },
    emerald: {
        name: 'Emerald',
        icon: '🌿',
        bg: '#0A1210', bgAlt: '#0D1A16',
        card: 'rgba(15,30,25,0.85)', cardBorder: 'rgba(16,185,129,0.15)',
        tabBar: '#0A1210', glass: 'rgba(15,30,25,0.65)', glassBorder: 'rgba(16,185,129,0.2)',
        blue: '#10B981', purple: '#0EA5E9', teal: '#10B981',
        gold: '#F59E0B', success: '#34D399', danger: '#F87171',
        white: '#F0FFF4', muted: 'rgba(255,255,255,0.4)',
        accent: ['#10B981', '#0EA5E9'],
        bgGrad: ['#0A1210', '#0D1A16'],
    },
    sunset: {
        name: 'Sunset',
        icon: '🌅',
        bg: '#1A0A0A', bgAlt: '#2B0F14',
        card: 'rgba(40,15,20,0.85)', cardBorder: 'rgba(251,146,60,0.15)',
        tabBar: '#1A0A0A', glass: 'rgba(40,15,20,0.65)', glassBorder: 'rgba(251,146,60,0.2)',
        blue: '#FB923C', purple: '#F43F5E', teal: '#FB923C',
        gold: '#FBBF24', success: '#4ADE80', danger: '#EF4444',
        white: '#FFF5F0', muted: 'rgba(255,255,255,0.4)',
        accent: ['#FB923C', '#F43F5E'],
        bgGrad: ['#1A0A0A', '#2B0F14'],
    },
    // ─── Light Themes ───
    snow: {
        name: 'Snow',
        icon: '☁️',
        bg: '#F5F7FA', bgAlt: '#E8ECF1',
        card: 'rgba(255,255,255,0.92)', cardBorder: 'rgba(0,0,0,0.08)',
        tabBar: '#FFFFFF', glass: 'rgba(255,255,255,0.75)', glassBorder: 'rgba(0,0,0,0.06)',
        blue: '#2563EB', purple: '#7C3AED', teal: '#2563EB',
        gold: '#D97706', success: '#059669', danger: '#DC2626',
        white: '#1A1A2E', muted: 'rgba(0,0,0,0.45)',
        accent: ['#2563EB', '#7C3AED'],
        bgGrad: ['#F5F7FA', '#E8ECF1'],
    },
    cream: {
        name: 'Cream',
        icon: '🍦',
        bg: '#FDF8F0', bgAlt: '#F5EDE0',
        card: 'rgba(255,252,245,0.95)', cardBorder: 'rgba(180,140,80,0.12)',
        tabBar: '#FFFCF5', glass: 'rgba(255,252,245,0.8)', glassBorder: 'rgba(180,140,80,0.1)',
        blue: '#B45309', purple: '#92400E', teal: '#B45309',
        gold: '#D97706', success: '#15803D', danger: '#B91C1C',
        white: '#2C1810', muted: 'rgba(60,40,20,0.5)',
        accent: ['#B45309', '#D97706'],
        bgGrad: ['#FDF8F0', '#F5EDE0'],
    },
    lavender: {
        name: 'Lavender',
        icon: '💜',
        bg: '#F3F0FF', bgAlt: '#EDE8FF',
        card: 'rgba(255,255,255,0.9)', cardBorder: 'rgba(124,58,237,0.1)',
        tabBar: '#FAF8FF', glass: 'rgba(255,255,255,0.75)', glassBorder: 'rgba(124,58,237,0.08)',
        blue: '#7C3AED', purple: '#DB2777', teal: '#7C3AED',
        gold: '#D97706', success: '#059669', danger: '#E11D48',
        white: '#1E1033', muted: 'rgba(30,16,51,0.45)',
        accent: ['#7C3AED', '#DB2777'],
        bgGrad: ['#F3F0FF', '#EDE8FF'],
    },
};

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [themeKey, setThemeKey] = useState('obsidian');

    useEffect(() => {
        AsyncStorage.getItem('app_theme').then(k => { if (k && THEMES[k]) setThemeKey(k); });
    }, []);

    const switchTheme = async (key) => {
        if (THEMES[key]) {
            setThemeKey(key);
            await AsyncStorage.setItem('app_theme', key);
        }
    };

    const theme = THEMES[themeKey];

    // Build COLORS-compatible object
    const colors = {
        bg: theme.bg, bgAlt: theme.bgAlt,
        card: theme.card, cardBorder: theme.cardBorder,
        tabBar: theme.tabBar, glass: theme.glass, glassBorder: theme.glassBorder,
        blue: theme.blue, purple: theme.purple, teal: theme.teal,
        gold: theme.gold, success: theme.success, danger: theme.danger,
        white: theme.white, muted: theme.muted,
    };

    const gradients = {
        bg: theme.bgGrad,
        accent: theme.accent,
        blue: [theme.blue, theme.blue + 'CC'],
        purple: [theme.purple, theme.purple + 'CC'],
        gold: [theme.gold, '#FF8C00'],
        danger: [theme.danger, '#FF6B81'],
        card: [theme.card, theme.card],
    };

    return (
        <ThemeContext.Provider value={{
            themeKey, switchTheme, colors, gradients,
            themes: THEMES, themeKeys: Object.keys(THEMES),
        }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

export default ThemeContext;
