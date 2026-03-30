import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const storedToken = await AsyncStorage.getItem('token');
            const storedUser = await AsyncStorage.getItem('user');
            if (storedToken && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    // Automatically clear cache if the user object is a corrupted string from the old bug
                    if (typeof parsedUser === 'string' || !parsedUser.role) {
                        await AsyncStorage.clear();
                        setToken(null);
                        setUser(null);
                    } else {
                        setToken(storedToken);
                        setUser(parsedUser);
                        api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                    }
                } catch (e) {
                    await AsyncStorage.clear();
                }
            }
            setLoading(false);
        })();
    }, []);

    const login = async (token, user) => {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('user', JSON.stringify(user));
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setToken(token);
        setUser(user);
    };

    const logout = async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('user');
        delete api.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    const role = user?.role || 'learner';
    const isMentor = role === 'mentor';
    const isAdmin = role === 'admin' || !!user?.isAdmin;

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout, role, isMentor, isAdmin }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
