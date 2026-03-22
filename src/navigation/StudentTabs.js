import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';

// Learner Screens
import DashboardScreen from '../screens/student/DashboardScreen';
import AssessmentScreen from '../screens/student/AssessmentScreen';
import TakeExamScreen from '../screens/student/TakeExamScreen';
import RoadmapScreen from '../screens/student/RoadmapScreen';
import LibraryScreen from '../screens/student/LibraryScreen';
import SettingsScreen from '../screens/student/SettingsScreen';

// Admin Screens
import AdminPasscodeModal from '../screens/admin/AdminPasscodeModal';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AddMentorScreen from '../screens/admin/AddMentorScreen';
import AddCourseScreen from '../screens/admin/AddCourseScreen';
import AddExamScreen from '../screens/admin/AddExamScreen';
import UploadExcelScreen from '../screens/admin/UploadExcelScreen';

const Tab = createBottomTabNavigator();
const DashStack = createNativeStackNavigator();
const AdminStack = createNativeStackNavigator();
const ExamStack = createNativeStackNavigator();

function DashboardNavigator() {
    return (
        <DashStack.Navigator screenOptions={{ headerShown: false }}>
            <DashStack.Screen name="DashboardHome" component={DashboardScreen} />
            <DashStack.Screen name="Settings" component={SettingsScreen} />
        </DashStack.Navigator>
    );
}

function ExamNavigator() {
    return (
        <ExamStack.Navigator screenOptions={{ headerShown: false }}>
            <ExamStack.Screen name="AssessmentHome" component={AssessmentScreen} />
            <ExamStack.Screen name="TakeExam" component={TakeExamScreen} />
        </ExamStack.Navigator>
    );
}

function AdminNavigator() {
    return (
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>
            <AdminStack.Screen name="AdminPasscode" component={AdminPasscodeModal} />
            <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <AdminStack.Screen name="AddMentor" component={AddMentorScreen} />
            <AdminStack.Screen name="AddCourse" component={AddCourseScreen} />
            <AdminStack.Screen name="AddExam" component={AddExamScreen} />
            <AdminStack.Screen name="UploadExcel" component={UploadExcelScreen} />
        </AdminStack.Navigator>
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

export default function StudentTabs() {
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
            <Tab.Screen name="Dashboard" component={DashboardNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Dashboard" focused={focused} colors={colors} /> }} />
            <Tab.Screen name="Assessment" component={ExamNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📝" label="Assessment" focused={focused} colors={colors} /> }} />
            <Tab.Screen name="Roadmap" component={RoadmapScreen}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" label="Roadmap" focused={focused} colors={colors} /> }} />
            <Tab.Screen name="Library" component={LibraryScreen}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="📚" label="Library" focused={focused} colors={colors} /> }} />
            <Tab.Screen name="Admin" component={AdminNavigator}
                options={{ tabBarIcon: ({ focused }) => <TabIcon emoji="🔐" label="Admin" focused={focused} colors={colors} /> }} />
        </Tab.Navigator>
    );
}
