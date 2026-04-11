import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import api from '../api/client';

import MentorDashboardScreen from '../screens/mentor/MentorDashboardScreen';
import NotificationFeedScreen from '../screens/mentor/NotificationFeedScreen';
import AlertDetailScreen from '../screens/mentor/AlertDetailScreen';
import ValidationScreen from '../screens/mentor/ValidationScreen';
import LinkStudentScreen from '../screens/mentor/LinkStudentScreen';
import AssignCoursesScreen from '../screens/mentor/AssignCoursesScreen';
import SettingsScreen from '../screens/student/SettingsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const NotifStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function MentorHomeNavigator() {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="MentorHome" component={MentorDashboardScreen} />
            <HomeStack.Screen name="AlertDetail" component={AlertDetailScreen} />
            <HomeStack.Screen name="Validation" component={ValidationScreen} />
            <HomeStack.Screen name="LinkStudent" component={LinkStudentScreen} />
            <HomeStack.Screen name="AssignCourses" component={AssignCoursesScreen} />
        </HomeStack.Navigator>
    );
}

function NotificationNavigator() {
    return (
        <NotifStack.Navigator screenOptions={{ headerShown: false }}>
            <NotifStack.Screen name="NotificationFeed" component={NotificationFeedScreen} />
            <NotifStack.Screen name="AlertDetail" component={AlertDetailScreen} />
        </NotifStack.Navigator>
    );
}

function SettingsNavigator() {
    return (
        <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
            <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
        </SettingsStack.Navigator>
    );
}

function TabIcon({ emoji, label, focused, colors, badge }) {
    return (
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
            <View>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
                {badge > 0 && (
                    <View style={{
                        position: 'absolute', top: -4, right: -8,
                        backgroundColor: '#ff4757', borderRadius: 10,
                        minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
                        paddingHorizontal: 4,
                    }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '900' }}>
                            {badge > 99 ? '99+' : badge}
                        </Text>
                    </View>
                )}
            </View>
            <Text style={{
                fontSize: 10, marginTop: 2,
                color: focused ? colors.blue : colors.muted,
                fontWeight: focused ? '700' : '400',
            }}>{label}</Text>
            {focused && (
                <View style={{
                    width: 4, height: 4, borderRadius: 2,
                    backgroundColor: colors.blue, marginTop: 2,
                }} />
            )}
        </View>
    );
}

export default function MentorTabs() {
    const { colors } = useTheme();
    const [notifCount, setNotifCount] = useState(0);

    // Poll notification count every 30 seconds
    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await api.get('/api/mentor/notification-count');
                setNotifCount(res.data.count || 0);
            } catch (e) { /* silently fail */ }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarShowLabel: false,
                tabBarStyle: {
                    backgroundColor: colors.bg,
                    borderTopColor: colors.glassBorder,
                    borderTopWidth: 1,
                    height: 70,
                    paddingBottom: 8,
                },
            }}
        >
            <Tab.Screen name="Dashboard" component={MentorHomeNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Dashboard" focused={focused} colors={colors} /> }} />
            <Tab.Screen name="Notifications" component={NotificationNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔔" label="Alerts" focused={focused} colors={colors} badge={notifCount} /> }} />
            <Tab.Screen name="Settings" component={SettingsNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Settings" focused={focused} colors={colors} /> }} />
        </Tab.Navigator>
    );
}
