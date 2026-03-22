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
        <AdminStack.Navigator screenOptions={{ headerShown: false }}>
            <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
            <AdminStack.Screen name="AddMentor" component={AddMentorScreen} />
            <AdminStack.Screen name="AddCourse" component={AddCourseScreen} />
            <AdminStack.Screen name="AddExam" component={AddExamScreen} />
            <AdminStack.Screen name="UploadExcel" component={UploadExcelScreen} />
        </AdminStack.Navigator>
    );
}
