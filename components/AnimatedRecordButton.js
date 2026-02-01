// AnimatedRecordButton - Microinteraction component with pulse animation
import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const AnimatedRecordButton = ({
    isRecording,
    onPress,
    theme,
    size = 64,
}) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isRecording) {
            // Pulse animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.15,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Glow animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowAnim, {
                        toValue: 0.3,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
            glowAnim.setValue(0);
        }
    }, [isRecording]);

    const glowOpacity = glowAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.5],
    });

    return (
        <View style={[styles.container, { width: size + 24, height: size + 24 }]}>
            {/* Glow effect */}
            {isRecording && (
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            width: size + 20,
                            height: size + 20,
                            borderRadius: (size + 20) / 2,
                            backgroundColor: theme.error,
                            opacity: glowOpacity,
                        },
                    ]}
                />
            )}

            {/* Main button */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.8}
                    style={[
                        styles.button,
                        {
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                            backgroundColor: isRecording ? theme.error : theme.primary + '20',
                        },
                    ]}
                >
                    <Ionicons
                        name={isRecording ? 'stop' : 'mic'}
                        size={size * 0.4}
                        color={isRecording ? '#fff' : theme.primary}
                    />
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
    },
    button: {
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
});

export default AnimatedRecordButton;
