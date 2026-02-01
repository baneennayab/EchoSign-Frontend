// GlassCard Component - Premium glassmorphism card
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const GlassCard = ({
    children,
    style,
    theme,
    variant = 'default', // 'default', 'strong', 'gradient'
    gradientColors,
    padding = 20,
    borderRadius = 24,
}) => {
    const backgroundColor = variant === 'strong' ? theme.glassStrong : theme.glass;

    if (variant === 'gradient' && gradientColors) {
        return (
            <View style={[styles.container, { borderRadius, borderColor: theme.glassBorder }, style]}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.gradient, { borderRadius, padding }]}
                >
                    {children}
                </LinearGradient>
            </View>
        );
    }

    return (
        <View style={[
            styles.container,
            {
                backgroundColor,
                borderColor: theme.glassBorder,
                borderRadius,
                padding,
            },
            style
        ]}>
            {children}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderWidth: 1,
        overflow: 'hidden',
    },
    gradient: {
        width: '100%',
    },
});

export default GlassCard;
