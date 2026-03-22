import React, { createContext, useContext } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';

const ViewModeContext = createContext();

export function useViewMode() {
    return useContext(ViewModeContext);
}

export function ViewModeProvider({ children }) {
    // We retain the Context Provider to avoid breaking any subtle 
    // down-stream dependencies. But we no longer artificially wrap 
    // the web build in a mock "Phone" display interface. 
    
    // Auto-detect if "mobile" style is needed based on screen size or native platform
    const { width } = useWindowDimensions();
    const isMobile = Platform.OS !== 'web' || width < 768;
    const mode = isMobile ? 'mobile' : 'web';

    return (
        <ViewModeContext.Provider value={{ mode, setMode: () => {}, isMobile }}>
            <View style={s.wrapper}>
                {children}
            </View>
        </ViewModeContext.Provider>
    );
}

const s = StyleSheet.create({
    wrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: '#0A0A0F',
    }
});
