// EchoSign - Premium Assistive Technology App
// Final Polished Version for Narjis Khatoon Organization
// Optimized UX, Functional Settings, and Enhanced Video Controls

import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View, Text, TextInput, ActivityIndicator, Alert,
  ScrollView, TouchableOpacity, Animated, Appearance, useColorScheme,
  StatusBar, StyleSheet, Dimensions, Switch, Platform,
  Modal, Keyboard, KeyboardAvoidingView, LayoutAnimation,
  PanResponder
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider, useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
const THEME_FILE = `${FileSystem.documentDirectory}theme_preference.json`;
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { themes, spacing, borderRadius, typography } from './themes';
import { API, APP_CONFIG } from './config/env';
import * as Updates from 'expo-updates';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ========== TEXT REFINERY LOGIC ==========

const PROPER_NOUNS = [
  'pakistan', 'karachi', 'lahore', 'islamabad', 'quaid e azam', 'allama iqbal',
  'narjis khatoon', 'faisal mosque', 'minar e pakistan', 'mazar e quaid',
  'ali', 'ahmed', 'hassan', 'fatima', 'zainab', 'maryam', 'sarah', 'john'
];

const refineTranscription = (text) => {
  if (!text) return "";
  let refined = text.trim();
  refined = refined.charAt(0).toUpperCase() + refined.slice(1);

  PROPER_NOUNS.forEach(noun => {
    const regex = new RegExp(`\\b${noun}\\b`, 'gi');
    refined = refined.replace(regex, match => {
      return match.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    });
  });

  if (!/[.!?]$/.test(refined)) refined += ".";
  return refined;
};

// ========== CONTEXT & STATE ==========
const AppContext = createContext();
export const useApp = () => useContext(AppContext);

// ========== PREMIUM COMPONENTS ==========

const GlassCard = ({ children, style, padding = 20 }) => {
  const { theme } = useApp();
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

const PremiumButton = ({ onPress, title, icon, color, style, loading, disabled, small }) => {
  const { theme } = useApp();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.7}
      style={[
        styles.premiumBtn,
        { backgroundColor: color || theme.primary, opacity: (loading || disabled) ? 0.6 : 1, height: small ? 44 : 60 },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <View style={styles.btnContent}>
          {icon && <Ionicons name={icon} size={small ? 16 : 20} color="#fff" style={styles.btnIcon} />}
          <Text style={[styles.btnText, { fontSize: small ? 14 : 16 }]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const PremiumModal = ({ visible, title, message, type, onClose }) => {
  const { theme } = useApp();
  const alertIcon = type === 'error' ? 'alert-circle' : type === 'success' ? 'checkmark-circle' : 'information-circle';
  const alertColor = type === 'error' ? theme.error : type === 'success' ? '#10b981' : theme.primary;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBackdrop} />
        <Animated.View style={[styles.modalContent, { backgroundColor: theme.surfaceSolid, borderColor: theme.glassBorder }]}>
          <LinearGradient
            colors={[alertColor + '20', 'transparent']}
            style={styles.modalHeaderGrad}
          />
          <View style={[styles.modalIconBox, { backgroundColor: alertColor + '15' }]}>
            <Ionicons name={alertIcon} size={42} color={alertColor} />
          </View>
          <Text style={[styles.modalTitle, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.modalMessage, { color: theme.subtext }]}>{message}</Text>
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            style={[styles.modalBtn, { backgroundColor: alertColor }]}
          >
            <LinearGradient
              colors={['rgba(255,255,255,0.2)', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.modalBtnText}>Understood</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const StatusModal = ({ visible, title, message, type, onClose, theme, isDark }) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <View style={{
        width: '90%',
        backgroundColor: isDark ? '#2a2a2a' : '#fff',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: theme.glassBorder,
        elevation: 10,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 6.68,
      }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: type === 'success' ? '#10b98120' : '#3b82f620', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
          <Ionicons
            name={type === 'success' ? "checkmark-circle" : "information-circle"}
            size={36}
            color={type === 'success' ? '#10b981' : '#3b82f6'}
          />
        </View>
        <Text style={{ fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 12, textAlign: 'center' }}>{title}</Text>
        <Text style={{ fontSize: 15, color: theme.subtext, textAlign: 'center', lineHeight: 22, marginBottom: 26, paddingHorizontal: 10 }}>{message}</Text>
        <TouchableOpacity
          onPress={onClose}
          style={{ backgroundColor: theme.primary, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, width: '100%', alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Got it</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const SoftwareUpdateComponent = ({ theme, isDark }) => {
  const {
    isUpdateAvailable,
    isUpdatePending,
    isDownloading,
    isChecking,
    lastCheckForUpdateTime
  } = Updates.useUpdates();

  const [modal, setModal] = React.useState({ visible: false, title: '', message: '', type: 'info' });

  const handleSilentAutoUpdate = React.useCallback(async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
      }
    } catch (e) {
      // Silent fail for background update check.
    }
  }, []);

  React.useEffect(() => {
    handleSilentAutoUpdate();
  }, [handleSilentAutoUpdate]);

  const handleCheckUpdate = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
      } else {
        setModal({
          visible: true,
          title: "System Up to Date",
          message: "You are currently running the latest professional version of EchoSign. No new updates available at this time.",
          type: 'success'
        });
      }
    } catch (e) {
      setModal({
        visible: true,
        title: "Connection Issue",
        message: "We couldn't reach the update server. Please check your internet connection and try again.",
        type: 'info'
      });
    }
  };

  return (
    <View style={styles.aboutRow}>
      <StatusModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        theme={theme}
        isDark={isDark}
        onClose={() => setModal({ ...modal, visible: false })}
      />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[styles.aboutTitle, { color: theme.primary }]}>Update Status</Text>
        {isChecking && <ActivityIndicator size="small" color={theme.primary} />}
      </View>

      {isUpdatePending ? (
        <View>
          <Text style={[styles.aboutText, { color: '#10b981', fontWeight: 'bold', marginBottom: 10 }]}>
            ✨ A new version is ready to install!
          </Text>
          <TouchableOpacity
            onPress={() => Updates.reloadAsync()}
            style={{ backgroundColor: '#10b981', padding: 12, borderRadius: 12, alignItems: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: '800' }}>Restart to Apply Update</Text>
          </TouchableOpacity>
        </View>
      ) : isDownloading ? (
        <View>
          <Text style={[styles.aboutText, { color: theme.primary }]}>⏬ Downloading latest features...</Text>
          <View style={{ height: 4, backgroundColor: theme.glass, borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
            <View style={{ height: '100%', width: '60%', backgroundColor: theme.primary }} />
          </View>
        </View>
      ) : (
        <View>
          <Text style={[styles.aboutText, { color: theme.subtext, marginBottom: 10 }]}>
            Your app is currently up to date.
          </Text>
          <TouchableOpacity
            onPress={handleCheckUpdate}
            style={{ borderColor: theme.glassBorder, borderWidth: 1, padding: 10, borderRadius: 12, alignItems: 'center', backgroundColor: theme.glass }}
          >
            <Text style={{ color: theme.text, fontSize: 13 }}>Check for Updates</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const Header = () => {
  const { theme, isDark, setIsDark } = useApp();

  return (
    <View style={styles.header}>
      <View>
        <Text style={[styles.brandText, { color: theme.text }]}>
          Echo<Text style={{ color: theme.primary }}>Sign</Text>
        </Text>
        <Text style={[styles.orgText, { color: theme.subtext }]}>{APP_CONFIG.organization}</Text>
      </View>
      <TouchableOpacity onPress={() => setIsDark(!isDark)} style={[styles.iconCircle, { backgroundColor: theme.glass, borderColor: theme.glassBorder }]}>
        <Ionicons name={isDark ? "sunny" : "moon"} size={22} color={isDark ? "#fbbf24" : theme.primary} />
      </TouchableOpacity>
    </View>
  );
};

const CustomSeekBar = ({ position, duration, onSeek }) => {
  const { theme } = useApp();
  const [barWidth, setBarWidth] = useState(0);
  const progress = duration > 0 ? (position / duration) * 100 : 0;

  const handleSeek = (evt) => {
    if (duration <= 0 || barWidth <= 0) return;
    const { locationX } = evt.nativeEvent;
    const seekPosition = Math.max(0, Math.min(duration, (locationX / barWidth) * duration));
    onSeek(seekPosition);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleSeek(evt),
      onPanResponderMove: (evt) => handleSeek(evt),
      onPanResponderRelease: (evt) => handleSeek(evt),
    })
  ).current;

  return (
    <View
      style={styles.seekContainer}
      {...panResponder.panHandlers}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      <View style={[styles.seekBackground, { backgroundColor: theme.muted + '30' }]}>
        <View style={[styles.seekFill, { width: `${progress}%`, backgroundColor: theme.primary }]} />
      </View>
      <View style={styles.seekHandleRow}>
        <Text style={[styles.seekTime, { color: theme.subtext }]}>{Math.floor(position / 1000)}s</Text>
        <Text style={[styles.seekTime, { color: theme.subtext }]}>{Math.floor(duration / 1000)}s</Text>
      </View>
    </View>
  );
};

const SignVideoPlayer = ({ videos, index, isPlaying, onEnd, onNext, onPrev, onPause, isPaused }) => {
  const { theme, deafMode } = useApp();
  const videoRef = useRef(null);
  const [playbackStatus, setPlaybackStatus] = useState(null);

  useEffect(() => {
    if (isPlaying && videos.length > 0) loadVideo();
  }, [index, videos, isPlaying]);

  useEffect(() => {
    if (isPaused) videoRef.current?.pauseAsync();
    else videoRef.current?.playAsync();
  }, [isPaused]);

  const loadVideo = async () => {
    try {
      await videoRef.current?.unloadAsync();
      await videoRef.current?.loadAsync({ uri: videos[index].uri }, { shouldPlay: !isPaused });
    } catch (e) { onEnd(); }
  };

  if (!isPlaying || videos.length === 0) {
    return (
      <View style={[styles.playerPlaceholder, { backgroundColor: theme.glass, borderColor: theme.glassBorder, height: 220 }]}>
        <MaterialCommunityIcons name="gesture-double-tap" size={64} color={theme.primary + '30'} />
        <Text style={[styles.placeholderSub, { color: theme.subtext }]}>Your interpretation will appear here</Text>
      </View>
    );
  }

  const current = videos[index];

  return (
    <View style={styles.playerContainer}>
      <View style={[styles.videoFrame, { borderColor: theme.primary }]}>
        <Video
          ref={videoRef}
          source={{ uri: current.uri }}
          style={styles.fullVideo}
          resizeMode="contain"
          isLooping
          onPlaybackStatusUpdate={status => {
            setPlaybackStatus(status);
            if (status.didJustFinish && !status.isLooping) onEnd();
          }}
        />
        <View style={[styles.videoOverlay, deafMode && { padding: 15 }]}>
          <Text style={[styles.overlayType, deafMode && { fontSize: 12 }]}>{current.type.toUpperCase()}</Text>
          <Text style={[styles.overlayWord, deafMode && { fontSize: 24 }]}>{current.word}</Text>
        </View>
      </View>

      <GlassCard style={styles.playerControls} padding={12}>
        <View style={styles.controlsRow}>
          <TouchableOpacity onPress={onPrev} disabled={index === 0} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-back" size={24} color={index === 0 ? theme.muted : theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => videoRef.current?.setPositionAsync(Math.max(0, (playbackStatus?.positionMillis || 0) - 5000))} style={styles.ctrlBtn}>
            <Ionicons name="reload" size={20} color={theme.text} style={{ transform: [{ scaleX: -1 }] }} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onPause} style={[styles.centralPlayBtn, { backgroundColor: theme.primary }]}>
            <Ionicons name={isPaused ? "play" : "pause"} size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => videoRef.current?.setPositionAsync((playbackStatus?.positionMillis || 0) + 5000)} style={styles.ctrlBtn}>
            <Ionicons name="reload" size={20} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onNext} disabled={index >= videos.length - 1} style={styles.ctrlBtn}>
            <Ionicons name="play-skip-forward" size={24} color={index >= videos.length - 1 ? theme.muted : theme.text} />
          </TouchableOpacity>
        </View>

        <CustomSeekBar
          position={playbackStatus?.positionMillis || 0}
          duration={playbackStatus?.durationMillis || 0}
          onSeek={(pos) => videoRef.current?.setPositionAsync(pos)}
        />

        <View style={styles.counterBox}>
          <Text style={[styles.counterText, { color: theme.subtext }]}>{index + 1} of {videos.length}</Text>
        </View>
      </GlassCard>
    </View>
  );
};

// ========== NETWORK INDICATOR ==========

const NetworkIndicator = () => {
  const { theme } = useApp();
  const [status, setStatus] = useState('online'); // 'online', 'slow', 'offline'

  useEffect(() => {
    const checkConnection = async () => {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

      try {
        const res = await fetch(API.health, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeout);
        const latency = Date.now() - start;

        if (res.ok) {
          if (latency > 3000) {
            setStatus('slow');
          } else {
            setStatus('online');
          }
        } else {
          setStatus('offline');
        }
      } catch (e) {
        clearTimeout(timeout);
        setStatus('offline');
      }
    };

    checkConnection();
    const timer = setInterval(checkConnection, 15000); // Check every 15 seconds
    return () => clearInterval(timer);
  }, []);

  // Only show banner if there's an issue
  if (status === 'online') return null;

  return (
    <View style={[styles.networkBanner, {
      backgroundColor: status === 'slow' ? '#f59e0b' : '#ef4444'
    }]}>
      <Ionicons
        name={status === 'slow' ? "wifi" : "cloud-offline"}
        size={14}
        color="#fff"
      />
      <Text style={styles.networkText}>
        {status === 'slow' ? "Slow Connection" : "No Internet"}
      </Text>
    </View>
  );
};

function HomeScreen() {
  const { theme, deafMode } = useApp();
  const insets = useSafeAreaInsets();

  const [text, setText] = useState('');
  const [refinedText, setRefinedText] = useState('');
  const [videos, setVideos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [statusType, setStatusType] = useState('info'); // info, success, error, warning
  const [keywords, setKeywords] = useState([]);

  const recordingRef = useRef(null);

  const startRecording = async () => {
    try {
      // CLEANUP PREVIOUS RECORDING IF CRASHED
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (e) { }
        recordingRef.current = null;
      }

      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) return Alert.alert('Permission Denied', 'Mic access is required.');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });

      const recordingOptions = {
        android: { extension: '.wav', outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT, audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000 },
        ios: { extension: '.wav', audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH, sampleRate: 44100, numberOfChannels: 1, bitRate: 128000, linearPCMBitDepth: 16, linearPCMIsBigEndian: false, linearPCMIsFloat: false },
      };

      const { recording: rec } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = rec;
      setRecording(rec);
      setStatus('🎙️ Listening...');
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const stopRecording = async () => {
    const rec = recordingRef.current;
    if (!rec) return;
    setStatus('⌛ Analyzing...');
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      setRecording(null);
      recordingRef.current = null;
      handleTranslate('', uri);
    } catch (e) {
      setRecording(null);
      recordingRef.current = null;
      setStatus('Ready');
    }
  };

  const toggleRecording = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  const handleTranslate = async (inputStr, audioUri) => {
    setLoading(true);
    setStatus('🔄 Translating...');
    setStatusType('info');
    const formData = new FormData();
    if (inputStr) formData.append('sentence', inputStr);
    if (audioUri) formData.append('audio', { uri: audioUri, name: 'recording.wav', type: 'audio/wav' });

    try {
      const res = await fetch(API.translate, { method: 'POST', body: formData, headers: { Accept: 'application/json' } });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const rawText = data.transcribed_text || inputStr;
      const refined = refineTranscription(rawText);
      setRefinedText(refined);

      const mappedVideos = (data.videos || []).map(v => ({ word: v.word, uri: v.url, type: v.type || 'word' }));
      setVideos(mappedVideos);
      setKeywords(data.keywords || []);

      if (mappedVideos.length > 0) {
        setCurrentIndex(0);
        setIsPlaying(true);
        setIsPaused(false);
        setStatus('✅ Interpretation Ready');
        setStatusType('success');
      } else {
        setStatus('❌ No Signs in Dictionary');
        setStatusType('warning');
        showAlert('System Notice', 'No specific signs found for this input. Trying finger-spelling fallback.', 'info');
      }
    } catch (e) {
      // Alert.alert('System Error', e.message);
      setStatus(`❌ ${e.message}`);
      setStatusType('error');
      showAlert('System Error', e.message, 'error');
    } finally {
      setLoading(false);
      setText('');
      Keyboard.dismiss();
    }
  };

  const clearAll = () => {
    setVideos([]);
    setIsPlaying(false);
    setRefinedText('');
    setKeywords([]);
    setStatus('Ready');
    setStatusType('info');
    setText('');
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>

        <SignVideoPlayer
          videos={videos}
          index={currentIndex}
          isPlaying={isPlaying}
          isPaused={isPaused}
          onEnd={() => currentIndex < videos.length - 1 ? setCurrentIndex(currentIndex + 1) : setIsPlaying(false)}
          onNext={() => setCurrentIndex(prev => Math.min(videos.length - 1, prev + 1))}
          onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          onPause={() => setIsPaused(!isPaused)}
        />

        {/* Improved Spacing */}
        <View style={{ height: 20 }} />

        {/* Refined Results Display */}
        {(refinedText || keywords.length > 0) ? (
          <GlassCard style={styles.resultsCard}>
            {refinedText && (
              <View style={styles.sentenceBox}>
                <Text style={[styles.label, { color: theme.primary }]}>TRANSLATED TEXT</Text>
                <Text style={[styles.sentenceText, { color: theme.text, fontSize: deafMode ? 22 : 18 }]}>{refinedText}</Text>
              </View>
            )}

            {keywords.length > 0 && (
              <View style={styles.keywordBox}>
                <Text style={[styles.label, { color: theme.primary }]}>EXTRACTED SIGNS</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.keywordScroll}>
                  {keywords.map((k, i) => (
                    <TouchableOpacity key={i} style={[styles.keywordChip, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
                      onPress={() => {
                        const idx = videos.findIndex(v => v.word.toLowerCase() === k.toLowerCase());
                        if (idx !== -1) { setCurrentIndex(idx); setIsPlaying(true); setIsPaused(false); }
                      }}
                    >
                      <Text style={[styles.keywordChipText, { color: theme.primary }]}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <PremiumButton title="Clear Results" icon="trash" color={theme.error + '20'} small style={{ marginTop: 15 }} onPress={clearAll} />
          </GlassCard>
        ) : (
          <GlassCard style={{ marginHorizontal: 20, padding: 15, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: statusType === 'error' ? theme.error : statusType === 'success' ? theme.primary : theme.glassBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons
                name={statusType === 'success' ? 'checkmark-circle' : statusType === 'error' ? 'alert-circle' : statusType === 'warning' ? 'warning' : 'information-circle'}
                size={20}
                color={statusType === 'error' ? theme.error : statusType === 'success' ? theme.primary : statusType === 'warning' ? '#f59e0b' : theme.subtext}
              />
              <Text style={[styles.statusBadgeText, { color: statusType === 'error' ? theme.error : theme.text, fontWeight: '700' }]}>{status}</Text>
            </View>
          </GlassCard>
        )}

        <View style={{ height: 20 }} />

        <GlassCard style={styles.inputCard}>
          <Text style={[styles.label, { color: theme.subtext, marginBottom: 12 }]}>VOICE OR TEXT INPUT</Text>
          <TextInput
            style={[styles.premiumInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.glassBorder, fontSize: deafMode ? 18 : 16 }]}
            placeholder="Type anything here..."
            placeholderTextColor={theme.muted}
            multiline
            value={text}
            onChangeText={setText}
          />
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={toggleRecording} activeOpacity={0.6}
              style={[styles.micBtn, { backgroundColor: recording ? theme.error : theme.primary + '20' }]}>
              <Ionicons name={recording ? "stop" : "mic-outline"} size={32} color={recording ? "#fff" : theme.primary} />
            </TouchableOpacity>

            <PremiumButton title="Interpret" icon="paper-plane" loading={loading} disabled={!text.trim() || !!recording} onPress={() => handleTranslate(text, null)} style={{ flex: 1 }} />
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

function ContributeScreen() {
  const { theme, showAlert } = useApp();
  const insets = useSafeAreaInsets();
  const [word, setWord] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('Contributor Mode');
  const [statusType, setStatusType] = useState('info');

  const handleUpload = async () => {
    if (!word.trim()) return showAlert('Missing Info', 'Please enter a name for the sign.', 'error');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos });
    if (result.canceled) return;

    setUploading(true);
    const data = new FormData();
    data.append('name', word.trim());
    data.append('file', { uri: result.assets[0].uri, name: 'upload.mp4', type: 'video/mp4' });

    try {
      const res = await fetch(API.upload, { method: 'POST', body: data });
      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.detail || responseData.message || 'Upload failed');
      }

      setStatus('✅ Upload Successful! Video sent for review.');
      setStatusType('success');
      showAlert('Upload Successful', 'Thank you! The video has been sent for review by Narjis Khatoon team.', 'success');
      setWord('');
    } catch (e) {
      setStatus(`❌ ${e.message}`);
      setStatusType('error');
      showAlert('Upload Error', e.message, 'error');
    } finally { setUploading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
      <View style={styles.uploadBanner}>
        <LinearGradient colors={theme.gradientPrimary} style={styles.bannerGrad}>
          <FontAwesome5 name="hands-helping" size={48} color="#fff" />
          <Text style={styles.bannerTitle}>Contribute Signs</Text>
          <Text style={styles.bannerSub}>Partner with Narjis Khatoon Organization</Text>
        </LinearGradient>
      </View>

      <GlassCard style={{ marginTop: 25, paddingBottom: 40 }}>
        <Text style={[styles.label, { color: theme.text, marginBottom: 12 }]}>ENTER SIGN NAME</Text>
        <TextInput
          style={[styles.premiumInput, { color: theme.text, backgroundColor: theme.input, borderColor: theme.glassBorder, height: 60 }]}
          placeholder="e.g. Beautiful"
          placeholderTextColor={theme.muted}
          value={word}
          onChangeText={setWord}
        />
        <PremiumButton title="Choose & Upload Video" icon="cloud-upload" color={theme.secondary} loading={uploading} onPress={handleUpload} style={{ marginTop: 30 }} />
      </GlassCard>

      <GlassCard style={{ marginHorizontal: 20, marginTop: 15, padding: 15, alignItems: 'center', borderStyle: 'dotted', borderWidth: 1, borderColor: statusType === 'error' ? theme.error : statusType === 'success' ? theme.primary : theme.glassBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons
            name={statusType === 'success' ? 'checkmark-circle' : statusType === 'error' ? 'alert-circle' : 'information-circle'}
            size={20}
            color={statusType === 'error' ? theme.error : statusType === 'success' ? theme.primary : theme.subtext}
          />
          <Text style={[styles.statusBadgeText, { color: statusType === 'error' ? theme.error : theme.text, fontWeight: '700' }]}>{status}</Text>
        </View>
      </GlassCard>

      {/* Informational Section */}
      <GlassCard style={{ marginTop: 20, backgroundColor: theme.primary + '05' }}>
        <Text style={[styles.label, { color: theme.primary }]}>SUBMISSION GUIDELINES</Text>
        <Text style={[styles.infoSmall, { color: theme.subtext }]}>• Ensure clear lighting and a plain background.</Text>
        <Text style={[styles.infoSmall, { color: theme.subtext }]}>• Keep the video under 5 seconds for single words.</Text>
        <Text style={[styles.infoSmall, { color: theme.subtext }]}>• Uploaded videos undergo admin review before going live.</Text>
        <Text style={[styles.infoSmall, { color: theme.subtext }]}>• Your contributions empower the deaf community!</Text>
      </GlassCard>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

function SettingsScreen() {
  const { theme, isDark, setIsDark, deafMode, setDeafMode, autoTranslate, setAutoTranslate } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView contentContainerStyle={styles.mainScroll} showsVerticalScrollIndicator={false}>
      <Text style={[styles.sectionHeading, { color: theme.text }]}>Appearance</Text>
      <GlassCard style={{ marginTop: 10 }}>
        <Text style={[styles.settingTitle, { color: theme.text, marginBottom: 15 }]}>Theme Selection</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity
            onPress={() => setIsDark(true)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: isDark ? theme.primary : theme.input,
              borderWidth: 2,
              borderColor: isDark ? theme.primary : theme.glassBorder
            }}
          >
            <Ionicons name="moon" size={22} color={isDark ? '#fff' : theme.subtext} />
            <Text style={{
              fontSize: 12,
              fontWeight: '800',
              marginTop: 6,
              color: isDark ? '#fff' : theme.subtext
            }}>Dark</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsDark(false)}
            style={{
              flex: 1,
              paddingVertical: 14,
              borderRadius: 16,
              alignItems: 'center',
              backgroundColor: !isDark ? theme.primary : theme.input,
              borderWidth: 2,
              borderColor: !isDark ? theme.primary : theme.glassBorder
            }}
          >
            <Ionicons name="sunny" size={22} color={!isDark ? '#fff' : theme.subtext} />
            <Text style={{
              fontSize: 12,
              fontWeight: '800',
              marginTop: 6,
              color: !isDark ? '#fff' : theme.subtext
            }}>Light</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 25 }]}>Settings & Preferences</Text>
      <GlassCard style={{ marginTop: 10 }}>
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Deaf-Friendly Mode</Text>
            <Text style={[styles.settingSub, { color: theme.subtext }]}>Larger fonts and higher contrast for better accessibility.</Text>
          </View>
          <Switch value={deafMode} onValueChange={setDeafMode} trackColor={{ true: theme.primary }} />
        </View>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Auto-Translate</Text>
            <Text style={[styles.settingSub, { color: theme.subtext }]}>Instantly translate voice commands without manual review.</Text>
          </View>
          <Switch value={autoTranslate} onValueChange={setAutoTranslate} trackColor={{ true: theme.primary }} />
        </View>
      </GlassCard>

      <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 25 }]}>Software Update</Text>
      <GlassCard style={{ marginTop: 10 }}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutTitle, { color: theme.primary }]}>App Version</Text>
          <Text style={[styles.aboutText, { color: theme.text }]}>{APP_CONFIG.version}</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
        <SoftwareUpdateComponent theme={theme} isDark={isDark} />
      </GlassCard>

      <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 25 }]}>About the Project</Text>
      <GlassCard style={{ marginTop: 10 }}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutTitle, { color: theme.primary }]}>Narjis Khatoon Organization</Text>
          <Text style={[styles.aboutText, { color: theme.text }]}>
            EchoSign is a flagship assistive technology project dedicated to the deaf community in Pakistan. Managed by the Narjis Khatoon Organization, we bridge the communication gap using AI-powered Sign Language Interpretation.
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.glassBorder }]} />
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutTitle, { color: theme.primary }]}>Version {APP_CONFIG.version}</Text>
          <Text style={[styles.aboutText, { color: theme.text }]}>
            Developed with ❤️ specifically for Narjis Khatoon Organization. This app is part of our commitment to making Pakistan more accessible for everyone.
          </Text>
        </View>
      </GlassCard>

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

// ========== NAVIGATION ==========

function Navigation() {
  const [activeTab, setActiveTab] = useState('home');
  const { theme } = useApp();
  const insets = useSafeAreaInsets();

  const tabs = [
    { id: 'home', icon: 'swap-horizontal', label: 'Translate' },
    { id: 'upload', icon: 'cloud-upload', label: 'Contribute' },
    { id: 'settings', icon: 'information-circle', label: 'About' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={theme.statusBarStyle} backgroundColor={theme.statusBarBg} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 10 : 0 }}>
          <Header />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 50}
        >
          <View style={{ flex: 1 }}>
            {activeTab === 'home' && <HomeScreen />}
            {activeTab === 'upload' && <ContributeScreen />}
            {activeTab === 'settings' && <SettingsScreen />}
          </View>
          <NetworkIndicator />
        </KeyboardAvoidingView>
      </SafeAreaView>

      <View style={[styles.navContainer, { backgroundColor: theme.surfaceSolid, paddingBottom: insets.bottom + 8, borderTopColor: theme.glassBorder }]}>
        {tabs.map(t => (
          <TouchableOpacity key={t.id} onPress={() => { LayoutAnimation.easeInEaseOut(); setActiveTab(t.id); }} style={styles.navItem}>
            <Ionicons name={activeTab === t.id ? t.icon : t.icon + "-outline"} size={26} color={activeTab === t.id ? theme.primary : theme.subtext} />
            <Text style={[styles.navText, { color: activeTab === t.id ? theme.primary : theme.subtext }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const PremiumSplash = ({ onFinish, theme }) => {
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 10,
          friction: 4,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1200),
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => onFinish());
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim, alignItems: 'center' }}>
        <Text style={{ fontSize: 44, fontWeight: '999', color: '#fff', letterSpacing: -2 }}>
          Echo<Text style={{ color: theme.primary }}>Sign</Text>
        </Text>
        <View style={{ height: 2, width: 40, backgroundColor: theme.primary, marginVertical: 15 }} />
        <Text style={{ fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5, textAlign: 'center' }}>
          Narjis Khatoon Organization
        </Text>
      </Animated.View>
    </View>
  );
};

export default function App() {
  const [isDark, setIsDarkState] = useState(true); // Default to Dark
  const [deafMode, setDeafMode] = useState(true);
  const [autoTranslate, setAutoTranslate] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ visible: false, title: '', message: '', type: 'info' });
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(40)).current;

  // Load saved theme preference on app start
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(THEME_FILE);
        if (fileInfo.exists) {
          const content = await FileSystem.readAsStringAsync(THEME_FILE);
          const savedData = JSON.parse(content);
          if (typeof savedData.isDark === 'boolean') {
            setIsDarkState(savedData.isDark);
          }
        }
      } catch (e) {
        console.log('Error loading theme:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTheme();
  }, []);

  // Save theme preference when it changes
  const setIsDark = async (value) => {
    setIsDarkState(value);
    try {
      await FileSystem.writeAsStringAsync(THEME_FILE, JSON.stringify({ isDark: value }));
    } catch (e) {
      console.log('Error saving theme:', e);
    }
  };

  const theme = isDark ? themes.dark : themes.light;

  const showAlert = (title, message, type = 'info') => {
    setAlertConfig({ visible: true, title, message, type });
  };

  return (
    <AppContext.Provider value={{
      isDark, setIsDark,
      deafMode, setDeafMode,
      autoTranslate, setAutoTranslate,
      showAlert,
      theme
    }}>
      <SafeAreaProvider>
        {showSplash ? (
          <PremiumSplash theme={theme} onFinish={() => {
            setShowSplash(false);
            Animated.parallel([
              Animated.timing(contentFade, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.spring(contentY, {
                toValue: 0,
                tension: 20,
                friction: 8,
                useNativeDriver: true,
              })
            ]).start();
          }} />
        ) : null}

        <Animated.View style={{ flex: 1, opacity: contentFade, transform: [{ translateY: contentY }] }}>
          <Navigation />
        </Animated.View>

        <PremiumModal
          visible={alertConfig.visible}
          title={alertConfig.title}
          message={alertConfig.message}
          type={alertConfig.type}
          onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
        />
      </SafeAreaProvider>
    </AppContext.Provider>
  );
}

const styles = StyleSheet.create({
  mainScroll: { paddingHorizontal: 20, paddingBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  brandText: { fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  orgText: { fontSize: 13, fontWeight: '700', opacity: 0.8 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },

  glassCard: { borderRadius: 28, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },

  playerContainer: { marginBottom: 10 },
  videoFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 24, overflow: 'hidden', borderWidth: 2, backgroundColor: '#000' },
  fullVideo: { width: '100%', height: '100%' },
  videoOverlay: { position: 'absolute', bottom: 12, left: 12, backgroundColor: 'rgba(0,0,0,0.65)', padding: 10, borderRadius: 14 },
  overlayType: { color: '#fff', fontSize: 9, fontWeight: '900', opacity: 0.8, letterSpacing: 1 },
  overlayWord: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 2 },

  playerPlaceholder: { width: '100%', borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  placeholderSub: { marginTop: 15, fontSize: 14, fontWeight: '700' },

  playerControls: { marginTop: 10 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ctrlBtn: { padding: 8 },
  centralPlayBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginHorizontal: 15 },
  counterBox: { alignItems: 'center', marginTop: 8 },
  counterText: { fontSize: 13, fontWeight: '800' },

  seekContainer: { paddingHorizontal: 10 },
  seekBackground: { height: 4, borderRadius: 2, width: '100%', overflow: 'hidden' },
  seekFill: { height: '100%', borderRadius: 2 },
  seekHandleRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  inputCard: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  statusBadge: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0,0,0,0.05)'
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  resultsCard: { padding: 18, marginVertical: 5 },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  sentenceBox: { marginBottom: 15 },
  sentenceText: { fontWeight: '700', lineHeight: 26 },
  keywordBox: { marginTop: 5 },
  keywordScroll: { flexDirection: 'row' },
  keywordChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, marginRight: 10, borderWidth: 1 },
  keywordChipText: { fontWeight: '800', fontSize: 12 },

  inputCard: { padding: 22 },
  premiumInput: { borderRadius: 20, padding: 18, minHeight: 90, borderWidth: 1, textAlignVertical: 'top' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 18 },
  micBtn: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },

  premiumBtn: { borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  btnContent: { flexDirection: 'row', alignItems: 'center' },
  btnIcon: { marginRight: 8 },
  btnText: { color: '#fff', fontWeight: '900' },

  uploadBanner: { borderRadius: 28, overflow: 'hidden' },
  bannerGrad: { padding: 30, alignItems: 'center' },
  bannerTitle: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 10 },
  bannerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  infoSmall: { fontSize: 12, fontWeight: '600', marginBottom: 6, lineHeight: 18 },

  sectionHeading: { fontSize: 20, fontWeight: '800', marginBottom: 15 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18 },
  settingTitle: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  settingSub: { fontSize: 13, opacity: 0.7, lineHeight: 18 },
  divider: { height: 1, width: '100%' },

  aboutRow: { paddingVertical: 15 },
  aboutTitle: { fontSize: 15, fontWeight: '900', marginBottom: 8 },
  aboutText: { fontSize: 14, lineHeight: 22, fontWeight: '500' },
  networkBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 1000,
  },
  networkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  navContainer: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 14, borderTopWidth: 1 },
  navItem: { alignItems: 'center', flex: 1 },
  navText: { fontSize: 10, fontWeight: '800', marginTop: 4 },

  modalOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.82)' },
  modalContent: { width: '100%', borderRadius: 32, padding: 30, alignItems: 'center', borderWidth: 1, overflow: 'hidden' },
  modalHeaderGrad: { position: 'absolute', top: 0, left: 0, right: 0, height: 150 },
  modalIconBox: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '900', marginBottom: 12, textAlign: 'center' },
  modalMessage: { fontSize: 16, textAlign: 'center', lineHeight: 24, marginBottom: 30, opacity: 0.8 },
  modalBtn: { width: '100%', height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' }
});
