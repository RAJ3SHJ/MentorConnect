import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';

import MentorDashboardScreen from '../screens/mentor/MentorDashboardScreen';
import AlertDetailScreen from '../screens/mentor/AlertDetailScreen';
import ValidationScreen from '../screens/mentor/ValidationScreen';
import LinkStudentScreen from '../screens/mentor/LinkStudentScreen';
import AssignCoursesScreen from '../screens/mentor/AssignCoursesScreen';
import SettingsScreen from '../screens/student/SettingsScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
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

function SettingsNavigator() {
    return (
        <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
            <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
        </SettingsStack.Navigator>
    );
}

function TabIcon({ emoji, label, focused, colors }) {
    return (
        <View style={{ alignItems: 'center', paddingTop: 6 }}>
            <Text style={{ fontSize: 20 }}>{emoji}</Text>
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
            <Tab.Screen name="Settings" component={SettingsNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="⚙️" label="Settings" focused={focused} colors={colors} /> }} />
        </Tab.Navigator>
    );
}
