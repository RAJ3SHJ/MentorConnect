import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AddMentorScreen from '../screens/admin/AddMentorScreen';
import AddCourseScreen from '../screens/admin/AddCourseScreen';
import AddExamScreen from '../screens/admin/AddExamScreen';
import UploadExcelScreen from '../screens/admin/UploadExcelScreen';

const AdminStack = createNativeStackNavigator();

export default function AdminTabs() {
    return (
        <AdminStack.Navigator screenOptions={{ 
            headerShown: true,
            headerStyle: { backgroundColor: '#04161F' },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
            headerShadowVisible: false
        }}>
            <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ headerShown: false }} />
            <AdminStack.Screen name="AddMentor" component={AddMentorScreen} options={{ title: 'Add Mentor' }} />
            <AdminStack.Screen name="AddCourse" component={AddCourseScreen} options={{ title: 'Add Course' }} />
            <AdminStack.Screen name="AddExam" component={AddExamScreen} options={{ title: 'Add Exam' }} />
            <AdminStack.Screen name="UploadExcel" component={UploadExcelScreen} options={{ title: 'Bulk Upload' }} />
        </AdminStack.Navigator>
    );
}
