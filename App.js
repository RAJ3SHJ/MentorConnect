import "./global.css";


import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider } from './src/ThemeContext';
import { ToastProvider } from './src/components/Toast';
import { ViewModeProvider } from './src/components/ViewMode';
import AppNavigator from './src/navigation/AppNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function App() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <ViewModeProvider>
                    <ToastProvider>
                        <AuthProvider>
                            <NavigationContainer>
                                <AppNavigator />
                            </NavigationContainer>
                            <StatusBar style="light" />
                        </AuthProvider>
                    </ToastProvider>
                </ViewModeProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
