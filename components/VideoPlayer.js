// Enhanced VideoPlayer Component with custom controls
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const VideoPlayer = ({
    videoList = [],
    currentIndex = 0,
    onVideoEnd,
    onIndexChange,
    theme,
    autoPlay = true,
}) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);

    const currentVideo = videoList[currentIndex];

    useEffect(() => {
        if (currentVideo && videoRef.current) {
            loadVideo();
        }
    }, [currentIndex, currentVideo]);

    const loadVideo = async () => {
        if (!videoRef.current || !currentVideo) return;
        try {
            setIsLoading(true);
            await videoRef.current.unloadAsync();
            await videoRef.current.loadAsync(
                { uri: currentVideo.url },
                { shouldPlay: autoPlay, rate: playbackSpeed }
            );
            setIsPlaying(autoPlay);
        } catch (e) {
            console.log('Video load error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePlaybackUpdate = (status) => {
        if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
                onVideoEnd?.();
            }
        }
    };

    const togglePlay = async () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            await videoRef.current.playAsync();
        }
        setIsPlaying(!isPlaying);
    };

    const seekTo = async (value) => {
        if (!videoRef.current) return;
        await videoRef.current.setPositionAsync(value);
    };

    const changeSpeed = async () => {
        const speeds = [0.5, 0.75, 1.0, 1.25, 1.5];
        const currentIdx = speeds.indexOf(playbackSpeed);
        const nextSpeed = speeds[(currentIdx + 1) % speeds.length];
        setPlaybackSpeed(nextSpeed);
        if (videoRef.current) {
            await videoRef.current.setRateAsync(nextSpeed, true);
        }
    };

    const goNext = () => {
        if (currentIndex < videoList.length - 1) {
            onIndexChange?.(currentIndex + 1);
        }
    };

    const goPrev = () => {
        if (currentIndex > 0) {
            onIndexChange?.(currentIndex - 1);
        }
    };

    const formatTime = (ms) => {
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (!currentVideo) {
        return (
            <View style={[styles.placeholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={[styles.placeholderIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="videocam-outline" size={40} color={theme.primary} />
                </View>
                <Text style={[styles.placeholderText, { color: theme.subtext }]}>
                    Translation will appear here
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Video Display */}
            <View style={[styles.videoWrapper, { borderColor: theme.primary }]}>
                <Video
                    ref={videoRef}
                    source={{ uri: currentVideo.url }}
                    style={styles.video}
                    resizeMode="contain"
                    onPlaybackStatusUpdate={handlePlaybackUpdate}
                />
                {isLoading && (
                    <View style={styles.loadingOverlay}>
                        <Ionicons name="reload" size={32} color="#fff" />
                    </View>
                )}
            </View>

            {/* Control Bar */}
            <View style={[styles.controlBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {/* Video Info */}
                <View style={styles.infoSection}>
                    <Text style={[styles.videoType, { color: theme.primary }]}>
                        {currentVideo.type === 'word' ? '📖 WORD' : '🔤 LETTER'}
                    </Text>
                    <Text style={[styles.videoWord, { color: theme.text }]} numberOfLines={1}>
                        {currentVideo.word}
                    </Text>
                </View>

                {/* Playback Controls */}
                <View style={styles.controls}>
                    <TouchableOpacity onPress={goPrev} disabled={currentIndex === 0} style={styles.controlBtn}>
                        <Ionicons name="play-skip-back" size={20} color={currentIndex === 0 ? theme.muted : theme.text} />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={togglePlay} style={[styles.playBtn, { backgroundColor: theme.primary }]}>
                        <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity onPress={goNext} disabled={currentIndex >= videoList.length - 1} style={styles.controlBtn}>
                        <Ionicons name="play-skip-forward" size={20} color={currentIndex >= videoList.length - 1 ? theme.muted : theme.text} />
                    </TouchableOpacity>
                </View>

                {/* Speed & Counter */}
                <View style={styles.rightSection}>
                    <TouchableOpacity onPress={changeSpeed} style={[styles.speedBtn, { backgroundColor: theme.input }]}>
                        <Text style={[styles.speedText, { color: theme.primary }]}>{playbackSpeed}x</Text>
                    </TouchableOpacity>
                    <Text style={[styles.counter, { color: theme.subtext }]}>
                        {currentIndex + 1}/{videoList.length}
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressContainer, { backgroundColor: theme.surface }]}>
                <Text style={[styles.timeText, { color: theme.subtext }]}>{formatTime(position)}</Text>
                <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <View
                        style={[
                            styles.progressFill,
                            {
                                backgroundColor: theme.primary,
                                width: duration > 0 ? `${(position / duration) * 100}%` : '0%'
                            }
                        ]}
                    />
                </View>
                <Text style={[styles.timeText, { color: theme.subtext }]}>{formatTime(duration)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { marginBottom: 15 },
    placeholder: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    placeholderIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    placeholderText: { fontSize: 14, fontWeight: '500' },
    videoWrapper: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        backgroundColor: '#000',
    },
    video: { width: '100%', height: '100%' },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    controlBar: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 10,
    },
    infoSection: { flex: 1 },
    videoType: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
    videoWord: { fontSize: 16, fontWeight: '800', textTransform: 'capitalize' },
    controls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    controlBtn: { padding: 8 },
    playBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    rightSection: { flex: 1, alignItems: 'flex-end', gap: 4 },
    speedBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    speedText: { fontSize: 12, fontWeight: '700' },
    counter: { fontSize: 11, fontWeight: '600' },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginTop: 8,
    },
    progressTrack: { flex: 1, height: 4, borderRadius: 2, marginHorizontal: 10, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    timeText: { fontSize: 11, fontWeight: '600', width: 40 },
});

export default VideoPlayer;
