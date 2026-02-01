// screens/AnimationScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Switch,
  Platform,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  StatusBar,
  Keyboard,
  IsDarkMode,
  isPlaying,
  SetIsPlaying
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system/legacy';
import { useNavigation, useRoute } from '@react-navigation/native';
import { BACKEND_URL } from '../App';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const videoMaxWidth = Math.min(640, Math.round(width * 0.95));
const videoHeight = Math.round(videoMaxWidth * (9 / 16));

export default function AnimationScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { initialText } = route.params || {};
  const [sentence, setSentence] = useState(initialText || '');
  const [transcribedText, setTranscribedText] = useState('');
  const [poseUri, setPoseUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready for Animation');

  // Recording states
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);

  // UI states
  const [isPlaying, setIsPlaying] = useState(false);

  const videoRef = useRef(null);

  useEffect(() => {
    return () => {
      (async () => {
        try {
          await videoRef.current?.unloadAsync?.();
        } catch {}
        if (recording) {
          try {
            await recording.stopAndUnloadAsync();
          } catch {}
        }
      })();
    };
  }, [recording]);

  // Auto-generate if initialText provided
  useEffect(() => {
    if (initialText && !loading) {
      setStatus('⏳ Generating demo animation...');
      sendToBackend(initialText, null);
    }
  }, [initialText]);

  // Load animation video
  useEffect(() => {
    if (!poseUri || !isPlaying) return;

    const loadCurrentVideo = async () => {
      try {
        if (videoRef.current) {
          await videoRef.current.unloadAsync();
        }
        if (videoRef.current) {
          await videoRef.current.loadAsync(
            { uri: poseUri },
            { shouldPlay: true, isLooping: true, isMuted: false }
          );
        }
      } catch (error) {
        console.error('Failed to load animation video:', error);
        Alert.alert('Video Load Error', 'Could not load the animation video.');
      }
    };

    loadCurrentVideo();
  }, [poseUri, isPlaying]);

  // Update status
  const setStatusMsg = (msg) => {
    setStatus(msg);
  };

  // Handle mic press
  const handleMicPress = async () => {
    if (loading) return;

    if (isRecording) {
      await stopRecordingAndUpload();
    } else {
      await startRecording();
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission required', 'Microphone permission is required to record audio.');
        return;
      }

      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch (e) {
        console.log('setAudioModeAsync warning:', e);
      }

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
      setStatusMsg('🎤 Listening...');
    } catch (err) {
      console.error('startRecording error', err);
      Alert.alert('Recording error', 'Could not start recording. Try again.');
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Stop recording and upload
  const stopRecordingAndUpload = async () => {
    if (!recording || !isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = await recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setStatusMsg('⏳ Generating animation...');

      if (uri) {
        await sendToBackend('', uri);
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          setRecordingUri(null);
        } catch (err) {
          console.log('delete local recording warning', err);
        }
      }
    } catch (err) {
      console.error('stopRecording error', err);
      Alert.alert('Recording error', 'Could not stop recording properly.');
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
    }
  };

  // Send to backend for animation only
  const sendToBackend = async (text = '', audioUri = null) => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (text) formData.append('sentence', text);
      if (audioUri) {
        const fileName = audioUri.split('/').pop() || 'speech.m4a';
        const fileType = mimeTypeFromUri(fileName);
        const finalType = fileType === 'application/octet-stream' ? 'audio/mp4' : fileType;

        formData.append('audio', {
          uri: audioUri,
          name: fileName,
          type: finalType,
        });
      }

      if (!text && !audioUri) {
        Alert.alert('Nothing to send', 'Provide text or record audio first.');
        setLoading(false);
        return;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);  // Increased to 120 seconds (4x original 30s)

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      setTranscribedText(data.transcribed_text || text);

      // Get pose video and play it
      if (data.pose_generation && data.pose_generation.video_url) {
        const newPoseUri = data.pose_generation.video_url.startsWith('/') ? `${BACKEND_URL.replace('/translate', '')}${data.pose_generation.video_url}` : data.pose_generation.video_url;
        setPoseUri(newPoseUri);
        setStatusMsg('🎉 Animation generated!');
        setIsPlaying(true);
      } else if (data.pose_generation && data.pose_generation.error) {
        console.warn('Pose generation error:', data.pose_generation.error);
        setStatusMsg('⚠ Animation failed - check backend');
      } else {
        setStatusMsg('❌ No animation available');
      }
    } catch (err) {
      console.error('API Error', err);
      if (err.name === 'AbortError') {
        Alert.alert('Timeout', 'Server did not respond in time. Try again.');
      } else {
        Alert.alert('Error', `Failed to connect to backend: ${err.message || err}`);
      }
    } finally {
      setLoading(false);
      setSentence('');
    }
  };

  // MIME type helper
  const mimeTypeFromUri = (uri) => {
    const ext = uri ? uri.split('.').pop().toLowerCase() : '';
    switch (ext) {
      case 'm4a':
      case 'mp4':
        return 'audio/mp4';
      case 'wav':
        return 'audio/wav';
      case 'caf':
        return 'audio/x-caf';
      case '3gp':
        return 'audio/3gp';
      default:
        return 'application/octet-stream';
    }
  };

  const handleSubmitText = () => {
    if (!sentence.trim()) {
      Alert.alert('Empty', 'Please enter or speak some text first.');
      return;
    }
    sendToBackend(sentence.trim(), null);
  };

  const stopPlayback = async () => {
    setIsPlaying(false);
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
        await videoRef.current.unloadAsync();
      }
    } catch (err) {
      console.log('Stop error:', err);
    }
    setStatusMsg('🛑 Animation stopped');
  };

  const goBack = () => {
    stopPlayback();
    navigation.goBack();
  };

  const toggleDarkMode = () => setIsDarkMode((v) => !v);

  const statusBarBg = isDarkMode ? '#0f2027' : '#f5f7fa';
  const gradientColors = isDarkMode ? ['#0f2027', '#203a43', '#2c5364'] : ['#f5f7fa', '#e4e7ec', '#f5f7fa'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: statusBarBg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={statusBarBg} translucent={false} />
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoid} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
          <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <TouchableOpacity onPress={goBack} style={styles.backButton}>
                <Ionicons name="arrow-back" size={28} color={isDarkMode ? '#BB86FC' : '#667eea'} />
              </TouchableOpacity>
              <View style={styles.titleWrapper}>
                <Text style={[styles.headerText, isDarkMode ? styles.darkText : styles.lightText]}>Animation Mode</Text>
                <Text style={[styles.subtitleText, isDarkMode ? styles.darkText : styles.lightText]}>Generate Dynamic Poses</Text>
              </View>
              <View style={styles.modeToggle}>
                <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={isDarkMode ? '#BB86FC' : '#FFD55A'} />
                <Switch trackColor={{ false: '#767577', true: isDarkMode ? '#3700B3' : '#81b0ff' }} thumbColor={isDarkMode ? '#BB86FC' : '#f4f3f4'} onValueChange={toggleDarkMode} value={isDarkMode} style={styles.switch} />
              </View>
            </View>

            {/* Status */}
            <View style={styles.statusContainer}>
              <Ionicons name="information-circle-outline" size={14} color={isDarkMode ? '#BB86FC' : '#667eea'} />
              <Text style={[styles.statusText, isDarkMode ? styles.darkText : styles.lightText]}>{status}</Text>
            </View>

            {/* Input area for animation */}
            <View style={[styles.inputContainer, isDarkMode ? styles.darkInputContainer : styles.lightInputContainer]}>
              <TextInput
                style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                placeholder="Type a sentence or tap mic to generate animation..."
                placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888'}
                value={sentence}
                onChangeText={setSentence}
                multiline
                textAlignVertical="top"
              />

              <View style={[styles.inputActionsRow, isDarkMode ? styles.darkActionsRow : styles.lightActionsRow]}>
                <TouchableOpacity
                  onPress={handleMicPress}
                  style={[styles.micButton, isRecording ? styles.micButtonActive : null]}
                  disabled={loading}
                >
                  <Ionicons name={isRecording ? 'stop-circle' : 'mic-outline'} size={22} color="#fff" />
                </TouchableOpacity>

                <View style={styles.micInfoWrap}>
                  <Text style={[styles.micInfoText, isDarkMode ? styles.darkText : styles.lightText]}>
                    {isRecording ? 'Recording...' : (recordingUri ? 'Recorded — generating...' : 'Tap mic for voice input')}
                  </Text>
                </View>

                <TouchableOpacity style={[styles.submitButton, isDarkMode ? styles.darkButton : styles.lightButton]} onPress={handleSubmitText} disabled={loading || isRecording}>
                  {loading ? <ActivityIndicator color="#FFF" size="small" /> : <>
                    <Ionicons name="send" size={16} color="#FFF" />
                    <Text style={styles.buttonText}>Generate</Text>
                  </>}
                </TouchableOpacity>
              </View>
            </View>

            {/* Loading */}
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color={isDarkMode ? '#BB86FC' : '#667eea'} />
                <Text style={[styles.loadingText, isDarkMode ? styles.darkText : styles.lightText]}>Generating animation...</Text>
              </View>
            )}

            {/* Transcribed */}
            {transcribedText ? (
              <View style={[styles.resultBox, isDarkMode ? styles.darkBox : styles.lightBox]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={20} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                  <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>Text for Animation</Text>
                </View>
                <Text style={[styles.resultText, isDarkMode ? styles.darkText : styles.lightText]}>"{transcribedText}"</Text>
              </View>
            ) : null}

            {/* Animation Video Section */}
            {poseUri && isPlaying && (
              <View style={[styles.videoContainer, isDarkMode ? styles.darkBox : styles.lightBox]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="videocam-outline" size={20} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                  <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>Dynamic Animation</Text>
                </View>

                <View style={styles.videoWrapper}>
                  <Video
                    ref={videoRef}
                    source={{ uri: poseUri }}
                    style={[styles.video, { width: videoMaxWidth, height: videoHeight }]}
                    useNativeControls
                    resizeMode="contain"
                    isMuted={false}
                    shouldPlay={true}
                    isLooping={true}
                    onError={(e) => {
                      console.log('Animation Video Error:', e);
                      Alert.alert('Video Error', 'Could not load the animation video.');
                    }}
                  />
                  <TouchableOpacity style={styles.stopButton} onPress={stopPlayback}>
                    <Ionicons name="stop-circle-outline" size={26} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <View style={styles.footer}>
              <Text style={[styles.footerText, isDarkMode ? styles.darkText : styles.lightText]}>Tap back to return to home</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  gradient: { flex: 1, width: '100%' },
  keyboardAvoid: { flex: 1 },
  scrollContainer: { 
    padding: isSmallDevice ? 14 : 20, 
    minHeight: height, 
    paddingBottom: 35 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: 20, 
    paddingTop: Platform.OS === 'ios' ? 0 : 8 
  },
  backButton: {
    padding: 8,
  },
  titleWrapper: {
    flex: 1,
    marginLeft: 10,
  },
  headerText: { 
    fontSize: isSmallDevice ? 18 : 20, 
    fontWeight: '800', 
    lineHeight: 22,
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.8,
    lineHeight: 16,
  },
  darkText: { color: '#FFFFFF' },
  lightText: { color: '#2D3436' },
  modeToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  switch: { transform: Platform.OS === 'ios' ? [{ scaleX: 0.85 }, { scaleY: 0.85 }] : [] },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    marginBottom: 14,
  },
  statusText: { 
    fontSize: 13, 
    marginLeft: 5,
    fontWeight: '600' 
  },

  inputContainer: { 
    borderRadius: 22, 
    marginBottom: 18, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 5 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 10,
    elevation: 7 
  },
  darkInputContainer: { backgroundColor: 'rgba(32, 58, 67, 0.8)' },
  lightInputContainer: { backgroundColor: '#FFFFFF' },
  input: { 
    padding: 18, 
    fontSize: 15, 
    minHeight: 110, 
    textAlignVertical: 'top' 
  },
  darkInput: { color: '#FFFFFF' },
  lightInput: { color: '#2D3436' },

  inputActionsRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 14, 
  },
  darkActionsRow: { backgroundColor: 'rgba(255,255,255,0.05)' },
  lightActionsRow: { backgroundColor: 'rgba(0,0,0,0.02)' },
    micButton: { 
      backgroundColor: '#FF6B6B', 
      padding: 12, 
      borderRadius: 14, 
      marginRight: 14, 
      alignItems: 'center', 
      justifyContent: 'center', 
      minWidth: 48,
      shadowColor: '#FF6B6B',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.12,
      shadowRadius: 10,
      elevation: 4,
    },
    micButtonActive: {
      backgroundColor: '#E85A5A',
    },
    micInfoWrap: {
      flex: 1,
      justifyContent: 'center',
    },
    micInfoText: {
      fontSize: 13,
      fontWeight: '600',
    },
  
    submitButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 14,
      marginLeft: 12,
      minHeight: 44,
    },
    darkButton: {
      backgroundColor: '#3700B3',
    },
    lightButton: {
      backgroundColor: '#667eea',
    },
    buttonText: {
      color: '#FFF',
      marginLeft: 8,
      fontWeight: '700',
      fontSize: 14,
    },
  
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    loadingText: {
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '600',
    },
  
    resultBox: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 16,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      marginLeft: 8,
      fontWeight: '700',
      fontSize: 14,
    },
    resultText: {
      fontSize: 15,
      lineHeight: 20,
    },
  
    videoContainer: {
      borderRadius: 14,
      padding: 12,
      marginBottom: 18,
      alignItems: 'center',
    },
    videoWrapper: {
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    video: {
      borderRadius: 12,
      backgroundColor: '#000',
    },
    stopButton: {
      position: 'absolute',
      right: 10,
      top: 10,
    },
  
    footer: {
      marginTop: 10,
      alignItems: 'center',
      paddingVertical: 10,
    },
    footerText: {
      fontSize: 12,
      opacity: 0.8,
    },
  
    darkBox: {
      backgroundColor: 'rgba(255,255,255,0.04)',
    },
    lightBox: {
      backgroundColor: '#FFFFFF',
    },
  });



