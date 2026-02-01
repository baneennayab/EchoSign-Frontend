// EchoSign - Premium Mobile App
// Professional Design for Narjis Khatoon Organization
// Enhanced Theme System + Glassmorphism + Micro-interactions

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, Alert,
  ScrollView, TouchableOpacity, Animated,
  StatusBar, StyleSheet, Dimensions, Switch, Platform
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { themes, spacing, borderRadius, typography } from './themes';
import { BACKEND_URL, API, APP_CONFIG } from './config/env';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ========== THEME CONTEXT ==========
const ThemeContext = createContext();
export const useTheme = () => useContext(ThemeContext);

// ========== COMPONENTS ==========

const GradientHeader = ({ children, style }) => {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.gradientPrimary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientHeader, style]}
    >
      {children}
    </LinearGradient>
  );
};

const GlassCard = ({ children, style, padding = 20 }) => {
  const { theme } = useTheme();
  return (
    <View style={[
      styles.glassCard,
      { backgroundColor: theme.glass, borderColor: theme.glassBorder, padding },
      style
    ]}>
      {children}
    </View>
  );
};

const Header = ({ title, showThemeToggle = true }) => {
  const { theme, isDark, toggleTheme } = useTheme();
  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Echo<Text style={{ color: theme.primary }}>Sign</Text>
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.subtext }]}>
          {title || APP_CONFIG.organization}
        </Text>
      </View>
      {showThemeToggle && (
        <TouchableOpacity
          onPress={toggleTheme}
          style={[styles.themeToggle, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}
          accessibilityLabel={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          <Ionicons name={isDark ? "moon" : "sunny"} size={20} color={isDark ? theme.primary : "#f59e0b"} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const AnimatedRecordButton = ({ isRecording, onPress }) => {
  const { theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.recordBtn, { backgroundColor: isRecording ? theme.error : theme.primary + '15' }]}
        accessibilityLabel={isRecording ? "Stop recording" : "Start voice recording"}
      >
        <Ionicons name={isRecording ? "stop" : "mic"} size={28} color={isRecording ? "#fff" : theme.primary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const VideoPlayerComponent = ({ videoList, currentIndex, isPlaying, onEnd, onNext, onIndexChange }) => {
  const { theme } = useTheme();
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!isPlaying || videoList.length === 0) return;
    loadVideo();
  }, [currentIndex, videoList, isPlaying]);

  const loadVideo = async () => {
    try {
      await videoRef.current?.unloadAsync();
      await videoRef.current?.loadAsync({ uri: videoList[currentIndex].url }, { shouldPlay: true });
      setIsPaused(false);
    } catch (e) { onEnd(); }
  };

  const togglePlayPause = async () => {
    if (isPaused) {
      await videoRef.current?.playAsync();
    } else {
      await videoRef.current?.pauseAsync();
    }
    setIsPaused(!isPaused);
  };

  if (!isPlaying || videoList.length === 0) {
    return (
      <View style={[styles.videoPlaceholder, { borderColor: theme.border, backgroundColor: theme.glass }]}>
        <LinearGradient colors={theme.gradientDark} style={StyleSheet.absoluteFill} />
        <View style={[styles.playIcon, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="videocam-outline" size={44} color={theme.primary} />
        </View>
        <Text style={[styles.placeholderText, { color: theme.subtext }]}>Translation will appear here</Text>
      </View>
    );
  }

  const currentItem = videoList[currentIndex];

  return (
    <View>
      <View style={[styles.videoContainer, { borderColor: theme.primary }]}>
        <Video
          ref={videoRef}
          source={{ uri: currentItem.url }}
          style={styles.video}
          resizeMode="contain"
          useNativeControls={false}
          onPlaybackStatusUpdate={s => { if (s.didJustFinish) onEnd(); }}
        />
      </View>

      {/* Enhanced Control Bar */}
      <GlassCard style={styles.controlBar} padding={14}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.videoType, { color: theme.primary }]}>
            {currentItem.type === 'word' ? '📖 WORD' : '🔤 LETTER'}
          </Text>
          <Text style={[styles.videoWord, { color: theme.text }]} numberOfLines={1}>{currentItem.word}</Text>
        </View>

        <View style={styles.controlBtns}>
          <TouchableOpacity
            onPress={() => currentIndex > 0 && onIndexChange?.(currentIndex - 1)}
            disabled={currentIndex === 0}
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-back" size={18} color={currentIndex === 0 ? theme.muted : theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={togglePlayPause} style={[styles.playPauseBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name={isPaused ? "play" : "pause"} size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNext}
            disabled={currentIndex >= videoList.length - 1}
            style={styles.controlBtn}
          >
            <Ionicons name="play-skip-forward" size={18} color={currentIndex >= videoList.length - 1 ? theme.muted : theme.text} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.videoCount, { color: theme.subtext }]}>{currentIndex + 1}/{videoList.length}</Text>
      </GlassCard>
    </View>
  );
};

// ========== SCREENS ==========

function HomeScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [transcribed, setTranscribed] = useState('');
  const [videos, setVideos] = useState([]);
  const [currentVid, setCurrentVid] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keywords, setKeywords] = useState([]);
  const [favorites, setFavorites] = useState(['Hello', 'Thank You', 'Welcome']);

  const startRec = async () => {
    try {
      if (recording) return;
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync({
        android: { extension: '.wav', ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android },
        ios: { extension: '.wav', ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios, outputFormat: Audio.IOSOutputFormat.LINEARPCM },
        web: {},
      });
      setRecording(rec);
      setStatus('🎙️ Listening...');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const stopRec = async () => {
    if (!recording) return;
    setStatus('⏳ Processing...');
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);
    handleTranslate('', uri);
  };

  const handleTranslate = async (txtStr, audioUri) => {
    setLoading(true);
    setStatus('🔄 Translating...');
    const formData = new FormData();
    if (txtStr) formData.append('sentence', txtStr);
    if (audioUri) formData.append('audio', { uri: audioUri, name: 'recording.wav', type: 'audio/wav' });

    try {
      const res = await fetch(API.translate, { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setTranscribed(data.transcribed_text || txtStr);
      setVideos(data.videos || []);
      setKeywords([...new Set((data.videos || []).filter(v => v.type === 'word').map(v => v.word))]);

      if (data.videos?.length > 0) {
        setCurrentVid(0);
        setIsPlaying(true);
        setStatus(`▶️ Playing: ${data.videos[0].word}`);
      } else {
        setStatus('❌ No signs found');
      }
    } catch (e) {
      Alert.alert("Translation Failed", e.message);
      setStatus('❌ Failed');
    } finally {
      setLoading(false);
      setText('');
    }
  };

  const handleVideoEnd = () => {
    if (currentVid < videos.length - 1) {
      setCurrentVid(prev => prev + 1);
      setStatus(`▶️ Playing: ${videos[currentVid + 1].word}`);
    } else {
      setIsPlaying(false);
      setStatus('✅ Complete');
    }
  };

  const handleNextVideo = () => {
    if (currentVid < videos.length - 1) {
      setCurrentVid(currentVid + 1);
      setStatus(`▶️ Playing: ${videos[currentVid + 1].word}`);
    }
  };

  const handleKeywordClick = (word) => {
    const idx = videos.findIndex(v => v.word.toLowerCase() === word.toLowerCase() && v.type === 'word');
    if (idx !== -1) {
      setCurrentVid(idx);
      setIsPlaying(true);
      setStatus(`▶️ Playing: ${videos[idx].word}`);
    }
  };

  // Clear/Stop playback
  const clearPlayback = () => {
    setIsPlaying(false);
    setVideos([]);
    setCurrentVid(0);
    setKeywords([]);
    setTranscribed('');
    setStatus('Ready');
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}
      showsVerticalScrollIndicator={false}
    >
      <Header />

      {/* Video Section */}
      <View style={styles.section}>
        <VideoPlayerComponent
          videoList={videos}
          currentIndex={currentVid}
          isPlaying={isPlaying}
          onEnd={handleVideoEnd}
          onNext={handleNextVideo}
          onIndexChange={setCurrentVid}
        />
      </View>

      {/* Status Bar with Clear Button */}
      <GlassCard style={styles.statusBarCard} padding={14}>
        <View style={[styles.statusDot, { backgroundColor: recording ? theme.error : loading ? '#facc15' : theme.secondary }]} />
        <Text style={[styles.statusText, { color: theme.text, flex: 1 }]}>{status}</Text>
        {(isPlaying || videos.length > 0) && (
          <TouchableOpacity
            onPress={clearPlayback}
            style={[styles.clearBtn, { backgroundColor: theme.error + '15' }]}
            accessibilityLabel="Clear and stop playback"
          >
            <Ionicons name="close-circle" size={18} color={theme.error} />
            <Text style={[styles.clearBtnText, { color: theme.error }]}>Clear</Text>
          </TouchableOpacity>
        )}
      </GlassCard>

      {/* Keywords */}
      {keywords.length > 0 && (
        <ScrollView horizontal style={styles.keywordRow} showsHorizontalScrollIndicator={false}>
          {keywords.map((k, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleKeywordClick(k)}
              style={[styles.chip, { backgroundColor: theme.primary + '15', borderColor: theme.primary }]}
            >
              <Text style={[styles.chipText, { color: theme.primary }]}>{k}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Favorites Section */}
      {favorites.length > 0 && !isPlaying && (
        <View style={styles.favSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>⭐ Quick Words</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {favorites.map((word, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleTranslate(word, null)}
                style={[styles.favChip, { backgroundColor: theme.secondary + '15', borderColor: theme.secondary }]}
              >
                <Text style={[styles.favText, { color: theme.secondary }]}>{word}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Transcription */}
      {transcribed && (
        <GlassCard style={styles.transcriptionCard}>
          <Text style={[styles.cardLabel, { color: theme.subtext }]}>TRANSCRIPTION</Text>
          <Text style={[styles.cardText, { color: theme.text }]}>{transcribed}</Text>
        </GlassCard>
      )}

      {/* Input Area */}
      <GlassCard style={styles.inputContainer}>
        <TextInput
          style={[styles.input, { color: theme.text, backgroundColor: theme.input, borderColor: theme.inputBorder }]}
          placeholder="Type or use voice..."
          placeholderTextColor={theme.muted}
          value={text}
          onChangeText={setText}
          multiline
        />
        <View style={styles.inputRow}>
          <AnimatedRecordButton isRecording={!!recording} onPress={recording ? stopRec : startRec} />
          <TouchableOpacity
            onPress={() => handleTranslate(text, null)}
            disabled={!text.trim() || loading}
            style={[styles.mainBtn, { backgroundColor: theme.primary, opacity: (!text.trim() || loading) ? 0.5 : 1 }]}
          >
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.mainBtnText}>Translate</Text>}
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </ScrollView>
  );
}

function UploadScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickAndUpload = async () => {
    if (!word.trim()) return Alert.alert('Required', 'Please enter the word first');
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (res.canceled) return;

    setLoading(true);
    setProgress(0);

    // Simulated progress
    const interval = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 200);

    const data = new FormData();
    data.append('name', word);
    data.append('file', { uri: res.assets[0].uri, name: 'upload.mp4', type: 'video/mp4' });

    try {
      const resp = await fetch(API.upload, { method: 'POST', body: data });
      clearInterval(interval);
      setProgress(100);
      if (resp.ok) {
        setTimeout(() => {
          Alert.alert('✅ Success', 'Video uploaded for review');
          setWord('');
          setProgress(0);
        }, 500);
      } else throw new Error();
    } catch {
      clearInterval(interval);
      Alert.alert('❌ Error', 'Upload failed');
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}>
      <Header title="Contribute Video" showThemeToggle={false} />

      <GlassCard style={{ marginTop: 20 }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <GradientHeader style={styles.uploadIcon}>
            <Ionicons name="cloud-upload" size={44} color="#fff" />
          </GradientHeader>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Upload Sign Video</Text>
          <Text style={[styles.cardSub, { color: theme.subtext }]}>Help expand the {APP_CONFIG.organization} dictionary</Text>
        </View>

        <Text style={[styles.label, { color: theme.subtext }]}>WORD OR PHRASE</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.inputBorder, height: 56 }]}
          placeholder="e.g. Good Morning"
          placeholderTextColor={theme.muted}
          value={word}
          onChangeText={setWord}
        />

        {progress > 0 && (
          <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
          </View>
        )}

        <TouchableOpacity
          onPress={pickAndUpload}
          disabled={loading}
          style={[styles.mainBtn, { backgroundColor: theme.secondary, marginTop: 20 }]}
        >
          {loading ? <ActivityIndicator color="#FFF" /> : (
            <>
              <Ionicons name="videocam" size={20} color="#fff" />
              <Text style={styles.mainBtnText}>Select Video & Upload</Text>
            </>
          )}
        </TouchableOpacity>
      </GlassCard>
    </ScrollView>
  );
}

function AboutScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const techStack = ['React Native', 'Expo', 'FastAPI', 'AWS S3', 'Whisper AI', 'SQLite'];

  return (
    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 10 }]}>
      <Header title="About" showThemeToggle={false} />

      <GlassCard style={{ marginTop: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <GradientHeader style={styles.logoBox}>
            <Ionicons name="hand-left" size={28} color="#fff" />
          </GradientHeader>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>{APP_CONFIG.organization}</Text>
            <Text style={[styles.cardSub, { color: theme.subtext }]}>Skardu, Pakistan 🇵🇰</Text>
          </View>
        </View>

        <Text style={[styles.bodyText, { color: theme.subtext }]}>
          <Text style={{ fontWeight: '700', color: theme.primary }}>EchoSign</Text> is an assistive technology project dedicated to{' '}
          <Text style={{ fontWeight: '700', color: theme.secondary }}>Anita Bano</Text> and named after her daughter{' '}
          <Text style={{ fontWeight: '700', color: theme.primary }}>Nargis Khatoon</Text>.
        </Text>
        <View style={{ height: 12 }} />
        <Text style={[styles.bodyText, { color: theme.subtext }]}>
          Our mission is to bridge the communication gap for the deaf community through advanced AI translation tools, providing equal opportunities in education.
        </Text>
      </GlassCard>

      <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>💻 Technology Stack</Text>
      <View style={styles.tagContainer}>
        {techStack.map((t, i) => (
          <View key={i} style={[styles.tag, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
            <Text style={{ color: theme.subtext, fontSize: 12, fontWeight: '600' }}>{t}</Text>
          </View>
        ))}
      </View>

      <GlassCard style={{ marginTop: 20 }}>
        <Text style={[styles.cardTitle, { color: theme.text, fontSize: 16 }]}>📱 App Version</Text>
        <Text style={[styles.cardSub, { color: theme.subtext }]}>{APP_CONFIG.version}</Text>
      </GlassCard>
    </ScrollView>
  );
}

// ========== NAVIGATION ==========

function Navigation() {
  const [tab, setTab] = useState('home');
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'upload', icon: 'cloud-upload', label: 'Upload' },
    { id: 'about', icon: 'information-circle', label: 'About' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.statusBarBg} />
      <View style={{ flex: 1 }}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'upload' && <UploadScreen />}
        {tab === 'about' && <AboutScreen />}
      </View>

      <View style={[styles.navBar, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 8, borderTopColor: theme.border }]}>
        {tabs.map(item => {
          const isActive = tab === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              onPress={() => setTab(item.id)}
              style={styles.navItem}
              accessibilityLabel={item.label}
            >
              <Ionicons
                name={isActive ? item.icon : `${item.icon}-outline`}
                size={24}
                color={isActive ? theme.primary : theme.subtext}
              />
              <Text style={[styles.navLabel, { color: isActive ? theme.primary : theme.subtext }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ========== APP ENTRY ==========

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const theme = isDark ? themes.dark : themes.light;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme: () => setIsDark(!isDark), theme }}>
      <SafeAreaProvider>
        <Navigation />
      </SafeAreaProvider>
    </ThemeContext.Provider>
  );
}

// ========== STYLES ==========

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 4, fontWeight: '500' },
  themeToggle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  gradientHeader: { borderRadius: 20, padding: 16, alignItems: 'center', justifyContent: 'center' },
  glassCard: { borderRadius: 24, borderWidth: 1, marginBottom: 16 },

  section: { marginBottom: 16 },
  videoContainer: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', borderWidth: 2, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  videoPlaceholder: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', overflow: 'hidden' },
  playIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  placeholderText: { fontSize: 14, fontWeight: '500' },

  controlBar: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  videoType: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 2 },
  videoWord: { fontSize: 17, fontWeight: '900', textTransform: 'capitalize' },
  controlBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlBtn: { padding: 8 },
  playPauseBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  videoCount: { fontSize: 12, fontWeight: '700', marginLeft: 12 },

  statusBarCard: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  statusText: { fontSize: 14, fontWeight: '600' },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  clearBtnText: { fontSize: 12, fontWeight: '700' },

  keywordRow: { marginBottom: 16, marginTop: 4 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1 },
  chipText: { fontSize: 13, fontWeight: '700' },

  favSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  favChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginRight: 10, borderWidth: 1 },
  favText: { fontSize: 13, fontWeight: '600' },

  transcriptionCard: { marginTop: 4 },
  cardLabel: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  cardText: { fontSize: 16, lineHeight: 24 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  cardSub: { fontSize: 13 },

  inputContainer: { padding: 20 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, minHeight: 56, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  recordBtn: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { flex: 1, height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  mainBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  uploadIcon: { width: 88, height: 88, borderRadius: 28, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 1 },
  progressBar: { height: 6, borderRadius: 3, marginTop: 16, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  logoBox: { width: 56, height: 56, borderRadius: 18 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },

  navBar: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, borderTopWidth: 1 },
  navItem: { alignItems: 'center' },
  navLabel: { fontSize: 11, fontWeight: '600', marginTop: 4 }
});