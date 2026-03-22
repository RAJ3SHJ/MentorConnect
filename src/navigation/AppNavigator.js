import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../ThemeContext';
import AuthNavigator from './AuthNavigator';
import StudentTabs from './StudentTabs';
import MentorTabs from './MentorTabs';
import AdminTabs from './AdminTabs';
import { View, ActivityIndicator } from 'react-native';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    const { user, loading, isMentor } = useAuth();
    const { colors } = useTheme();

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={colors.blue} size="large" />
            </View>
        );
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                user.role === 'admin' ? (
                    <Stack.Screen name="AdminRoot" component={AdminTabs} />
                ) : user.role === 'mentor' ? (
                    <Stack.Screen name="MentorTabs" component={MentorTabs} />
                ) : (
                    <Stack.Screen name="StudentTabs" component={StudentTabs} />
                )
            ) : (
                <Stack.Screen name="Auth" component={AuthNavigator} />
            )}
        </Stack.Navigator>
    );
}
