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
  Modal,
  Keyboard,
} from 'react-native';
import { Video, Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

const { width, height } = Dimensions.get('window');
const isSmallDevice = width < 375;
const BACKEND_URL = 'http://192.168.100.55:8000/translate';
const UPLOAD_URL = 'http://192.168.100.55:8000/upload';
const BASE_URL = 'http://192.168.100.55:8000';

export default function App() {
  const [sentence, setSentence] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [keywords, setKeywords] = useState([]);
  const [videoList, setVideoList] = useState([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [status, setStatus] = useState('Ready');
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false); // Ensure this is defined

  const videoRef = useRef(null);

  useEffect(() => {
    console.log('App mounted');
    return () => {
      console.log('App unmounting');
      (async () => {
        try {
          await videoRef.current?.unloadAsync?.();
        } catch (e) {
          console.error('Video unload error:', e);
        }
        if (recording && isRecording) {
          try {
            await recording.stopAndUnloadAsync();
            setRecording(null);
            setIsRecording(false);
          } catch (e) {
            console.error('Recording cleanup error:', e);
          }
        }
      })();
    };
  }, [recording, isRecording]);

  useEffect(() => {
    if (videoList.length === 0 || !isPlaying) return;

    const loadCurrentVideo = async () => {
      try {
        const videoUri = videoList[currentVideoIndex]?.uri;
        console.log('Loading video:', videoUri);
        if (videoRef.current && videoUri) {
          await videoRef.current.unloadAsync();
          await videoRef.current.loadAsync(
            { uri: videoUri },
            { shouldPlay: true, isLooping: false, isMuted: false }
          );
        }
      } catch (error) {
        console.error('Video load error:', error);
        Alert.alert('Video Load Error', `Could not load video: ${error.message || error}`);
      }
    };

    loadCurrentVideo();
  }, [videoList, currentVideoIndex, isPlaying]);

  const mapBackendVideos = (videos) => {
    const mapped = (videos || []).map((v) => ({
      word: v.word,
      uri: v.url.startsWith('http') ? v.url : `${BASE_URL}${v.url}`,
      type: v.type || 'word',
    }));
    console.log('Mapped videos:', mapped);
    return mapped;
  };

  const setStatusMsg = (msg) => {
    setStatus(msg);
    console.log('Status:', msg);
  };

  const handleKeywordPress = (keyword) => {
    const matchingVideo = videoList.find((v) => v.word.toLowerCase() === keyword.toLowerCase());
    if (matchingVideo) {
      setVideoList([matchingVideo]);
      setCurrentVideoIndex(0);
      setIsPlaying(true);
      setStatusMsg(`▶ Playing: ${matchingVideo.word}`);
    } else {
      Alert.alert('No Video Available', `No sign video found for "${keyword}". Upload one via the menu?`);
    }
  };

  const handleMicPress = async () => {
    if (loading) {
      console.log('Mic press ignored: loading in progress');
      return;
    }
    if (isRecording) {
      await stopRecordingAndUpload();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Microphone permission is required.');
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingUri(null);
      setStatusMsg('🎤 Listening...');
      console.log('Recording started');
    } catch (err) {
      console.error('Start recording error:', err);
      Alert.alert('Recording Error', 'Could not start recording.');
      setIsRecording(false);
      setRecording(null);
    }
  };

  const mimeTypeFromUri = (uri) => {
    const ext = uri.split('.').pop().toLowerCase();
    return {
      m4a: 'audio/mp4',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      flac: 'audio/flac',
    }[ext] || 'audio/mp4';
  };

  const stopRecordingAndUpload = async () => {
    if (!recording || !isRecording) {
      setIsRecording(false);
      console.log('No active recording to stop');
      return;
    }
    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingUri(uri);
      setRecording(null);
      setStatusMsg('⏳ Processing audio...');
      console.log('Recording stopped, URI:', uri);
      if (uri) {
        await sendToBackend('', uri);
        await FileSystem.deleteAsync(uri, { idempotent: true });
        setRecordingUri(null);
        console.log('Deleted local recording:', uri);
      }
    } catch (err) {
      console.error('Stop recording error:', err);
      Alert.alert('Recording Error', 'Could not stop recording.');
      setIsRecording(false);
      setRecording(null);
      setRecordingUri(null);
    }
  };

  const sendToBackend = async (text = '', audioUri = null) => {
    setLoading(true);
    try {
      const formData = new FormData();
      if (text) formData.append('sentence', text);
      if (audioUri) {
        const fileName = audioUri.split('/').pop() || 'speech.m4a';
        formData.append('audio', {
          uri: audioUri,
          name: fileName,
          type: mimeTypeFromUri(fileName),
        });
      }
      if (!text && !audioUri) {
        Alert.alert('Nothing to Send', 'Provide text or record audio first.');
        setLoading(false);
        return;
      }
      console.log('Sending request to:', BACKEND_URL, 'with FormData:', formData);
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      const data = await response.json();
      console.log('Backend response:', data);
      setTranscribedText(data.transcribed_text || '');
      setKeywords(data.keywords || []);
      setVideoList(mapBackendVideos(data.videos || []));
      setCurrentVideoIndex(0);
      setIsPlaying(data.videos?.length > 0); // Use setIsPlaying here
      setStatusMsg('✅ Processed');
    } catch (err) {
      console.error('API Error:', err);
      Alert.alert('Error', `Failed to connect to backend: ${err.message || err}`);
    } finally {
      setLoading(false);
      setSentence('');
    }
  };

  const handleSubmitText = () => {
    if (!sentence.trim()) {
      Alert.alert('Empty', 'Please enter or speak some text first.');
      return;
    }
    console.log('Submitting text:', sentence);
    sendToBackend(sentence.trim());
  };

  const handleVideoEnd = async () => {
    console.log('Video ended:', videoList[currentVideoIndex]?.word);
    if (videoList.length <= 1) {
      try {
        await videoRef.current?.replayAsync?.();
      } catch (error) {
        console.error('Replay error:', error);
        if (videoList.length === 1) {
          await videoRef.current?.loadAsync(
            { uri: videoList[0].uri },
            { shouldPlay: true, isLooping: false, isMuted: false }
          );
        }
      }
      return;
    }
    setCurrentVideoIndex((prev) => (prev + 1) % videoList.length);
  };

  const stopPlayback = async () => {
    setIsPlaying(false);
    try {
      if (videoRef.current) {
        await videoRef.current.pauseAsync();
        await videoRef.current.unloadAsync();
      }
      console.log('Playback stopped');
    } catch (err) {
      console.error('Stop error:', err);
    }
    setStatusMsg('🛑 Stopped');
  };

  const clearAll = async () => {
    setTranscribedText('');
    setKeywords([]);
    setVideoList([]);
    setCurrentVideoIndex(0);
    setSentence('');
    setRecordingUri(null);
    setStatusMsg('Ready');
    setIsPlaying(false);
    try {
      await videoRef.current?.unloadAsync?.();
      console.log('Cleared all');
    } catch (e) {
      console.error('Clear error:', e);
    }
  };

  const uploadVideo = async () => {
    if (!uploadName.trim()) {
      Alert.alert('Invalid Name', 'Enter a valid word or letter name.');
      return;
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Media library permission is required.');
        return;
      }
      setUploading(true);
      setStatusMsg('📂 Selecting video...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (result.canceled) {
        setUploading(false);
        setStatusMsg('Ready');
        return;
      }
      if (result.assets?.length > 0) {
        const asset = result.assets[0];
        if (!asset.uri) {
          Alert.alert('Invalid Asset', 'Selected video is invalid.');
          setUploading(false);
          setStatusMsg('Ready');
          return;
        }
        const formData = new FormData();
        formData.append('name', uploadName.trim());
        formData.append('file', {
          uri: asset.uri,
          name: asset.fileName || `video_${Date.now()}.mp4`,
          type: 'video/mp4',
        });
        setStatusMsg('⏳ Uploading video...');
        const response = await fetch(UPLOAD_URL, {
          method: 'POST',
          body: formData,
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        Alert.alert('Success', data.message || 'Video uploaded successfully!');
        setStatusMsg('✅ Upload complete');
        setUploadName('');
        setUploadModalVisible(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Upload Error', `Failed to upload video: ${err.message || err}`);
      setStatusMsg('❌ Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleManualUpload = () => {
    setUploadName('');
    setUploadModalVisible(true);
    Keyboard.dismiss();
  };

  const toggleDarkMode = () => setIsDarkMode((v) => !v);

  const videoMaxWidth = Math.min(640, Math.round(width * 0.92));
  const videoHeight = Math.round(videoMaxWidth * (9 / 16));
  const statusBarBg = isDarkMode ? '#0f2027' : '#f5f7fa';
  const gradientColors = isDarkMode ? ['#0f2027', '#203a43', '#2c5364'] : ['#f5f7fa', '#e4e7ec', '#f5f7fa'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: statusBarBg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={statusBarBg} />
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.header}>
              <View style={styles.titleContainer}>
                <View style={styles.logoContainer}>
                  <Ionicons name="hand-right" size={28} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                </View>
                <View style={styles.titleWrapper}>
                  <Text style={[styles.headerText, isDarkMode ? styles.darkText : styles.lightText]}>EchoSign App</Text>
                  <Text style={[styles.subtitleText, isDarkMode ? styles.darkText : styles.lightText]}>
                    For Narjis Khatoon Organization
                  </Text>
                </View>
              </View>
              <View style={styles.modeToggle}>
                <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={isDarkMode ? '#BB86FC' : '#FFD55A'} />
                <Switch
                  trackColor={{ false: '#767577', true: isDarkMode ? '#3700B3' : '#81b0ff' }}
                  thumbColor={isDarkMode ? '#BB86FC' : '#f4f3f4'}
                  onValueChange={toggleDarkMode}
                  value={isDarkMode}
                  style={styles.switch}
                />
              </View>
            </View>

            <View style={styles.statusContainer}>
              <Ionicons name="information-circle-outline" size={14} color={isDarkMode ? '#BB86FC' : '#667eea'} />
              <Text style={[styles.statusText, isDarkMode ? styles.darkText : styles.lightText]}>{status}</Text>
            </View>

            <View style={[styles.inputContainer, isDarkMode ? styles.darkInputContainer : styles.lightInputContainer]}>
              <TextInput
                style={[styles.input, isDarkMode ? styles.darkInput : styles.lightInput]}
                placeholder="Type a sentence or tap the mic to record audio..."
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
                    {isRecording ? 'Recording...' : recordingUri ? 'Recorded — sent to server' : 'Tap mic to record'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.submitButton, isDarkMode ? styles.darkButton : styles.lightButton]}
                  onPress={handleSubmitText}
                  disabled={loading || isRecording}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFF" />
                      <Text style={styles.buttonText}>Submit</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buttonFrame}>
              <TouchableOpacity style={[styles.actionButton, styles.clearBtn]} onPress={clearAll}>
                <Ionicons name="trash-outline" size={18} color="#FFF" />
                <Text style={styles.buttonText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.uploadBtn]}
                onPress={handleManualUpload}
                disabled={uploading}
              >
                <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                <Text style={styles.buttonText}>Upload</Text>
              </TouchableOpacity>
            </View>

            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="large" color={isDarkMode ? '#BB86FC' : '#667eea'} />
                <Text style={[styles.loadingText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Processing your request...
                </Text>
              </View>
            )}

            {transcribedText && (
              <View style={[styles.resultBox, isDarkMode ? styles.darkBox : styles.lightBox]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="document-text-outline" size={20} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                  <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                    Transcribed Text
                  </Text>
                </View>
                <Text style={[styles.resultText, isDarkMode ? styles.darkText : styles.lightText]}>
                  "{transcribedText}"
                </Text>
              </View>
            )}

            {keywords.length > 0 && (
              <View style={[styles.resultBox, isDarkMode ? styles.darkBox : styles.lightBox]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="key-outline" size={20} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                  <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>Keywords</Text>
                </View>
                <View style={styles.keywordContainer}>
                  {keywords.map((k, i) => (
                    <TouchableOpacity
                      key={`${k}-${i}`}
                      onPress={() => handleKeywordPress(k)}
                      style={[styles.keywordPill, isDarkMode ? styles.darkPill : styles.lightPill]}
                    >
                      <Text style={[styles.keywordText, isDarkMode ? styles.darkText : styles.lightText]}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {videoList.length > 0 && isPlaying && (
              <View style={[styles.videoContainer, isDarkMode ? styles.darkBox : styles.lightBox]}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="videocam-outline" size={20} color={isDarkMode ? '#BB86FC' : '#667eea'} />
                  <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : styles.lightText]}>
                    Sign Language Video
                  </Text>
                </View>
                <View style={styles.videoWrapper}>
                  <Video
                    ref={videoRef}
                    source={{ uri: videoList[currentVideoIndex]?.uri || '' }}
                    style={[styles.video, { width: videoMaxWidth, height: videoHeight }]}
                    useNativeControls
                    resizeMode="contain"
                    isMuted={false}
                    shouldPlay={isPlaying}
                    onError={(e) => {
                      console.error('Video Error:', e);
                      Alert.alert('Video Error', `Could not load video: ${e.message || e}`);
                    }}
                    onPlaybackStatusUpdate={(status) => {
                      if (status.isLoaded && status.didJustFinish) {
                        handleVideoEnd();
                      }
                    }}
                  />
                  <TouchableOpacity style={styles.stopButton} onPress={stopPlayback}>
                    <Ionicons name="stop-circle-outline" size={26} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.videoLabel, isDarkMode ? styles.darkText : styles.lightText]}>
                  ▶ <Text style={styles.highlightText}>{videoList[currentVideoIndex]?.word} ({videoList[currentVideoIndex]?.type})</Text>
                </Text>
                {videoList.length > 1 && (
                  <View style={styles.videoNavigation}>
                    <Text style={[styles.videoCounter, isDarkMode ? styles.darkText : styles.lightText]}>
                      {currentVideoIndex + 1} / {videoList.length}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.footer}>
              <Text style={[styles.footerText, isDarkMode ? styles.darkText : styles.lightText]}>
                © 2025 EchoSign App - For Narjis Khatoon Organization
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDarkMode ? styles.darkBox : styles.lightBox]}>
            <TouchableOpacity
              onPress={() => setUploadModalVisible(false)}
              style={styles.closeButton}
              disabled={uploading}
            >
              <Ionicons name="close-circle" size={26} color={isDarkMode ? '#FFF' : '#666'} />
            </TouchableOpacity>
            <View style={styles.modalHeader}>
              <Ionicons name="add-circle-outline" size={28} color={isDarkMode ? '#BB86FC' : '#4ECDC4'} />
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : styles.lightText]}>Upload Missing Video</Text>
            </View>
            <Text style={[styles.modalSubtitle, isDarkMode ? styles.darkText : styles.lightText]}>
              Add a new sign for words or letters
            </Text>
            <TextInput
              style={[styles.modalInput, isDarkMode ? styles.darkInput : styles.lightInput]}
              placeholder="Enter word or letter (e.g., 'hello' or 'a')"
              value={uploadName}
              onChangeText={setUploadName}
              placeholderTextColor={isDarkMode ? '#A0A0A0' : '#888'}
              autoFocus
              editable={!uploading}
            />
            <TouchableOpacity
              style={[styles.submitButton, isDarkMode ? styles.darkButton : styles.lightButton]}
              onPress={uploadVideo}
              disabled={!uploadName.trim() || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color="#FFF" />
                  <Text style={styles.buttonText}>Upload MP4 Video</Text>
                </>
              )}
            </TouchableOpacity>
            {uploading && (
              <View style={styles.loadingRow}>
                <Text style={[styles.loadingText, isDarkMode ? styles.darkText : styles.lightText]}>
                  Uploading... Please wait
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fa' },
  gradient: { flex: 1, width: '100%' },
  keyboardAvoid: { flex: 1 },
  scrollContainer: { padding: isSmallDevice ? 14 : 20, minHeight: height, paddingBottom: 35 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titleContainer: { flexDirection: 'row', alignItems: 'flex-start', flex: 1, marginRight: 12 },
  titleWrapper: { flex: 1, flexShrink: 1 },
  logoContainer: { backgroundColor: 'rgba(187, 134, 252, 0.1)', borderRadius: 18, padding: 6, marginRight: 10, marginTop: 2 },
  headerText: { fontSize: isSmallDevice ? 18 : 20, fontWeight: '800', lineHeight: 22, flexShrink: 1 },
  subtitleText: { fontSize: 12, fontWeight: '600', opacity: 0.8, lineHeight: 16 },
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
  statusText: { fontSize: 13, marginLeft: 5, fontWeight: '600' },
  inputContainer: { borderRadius: 22, marginBottom: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 7 },
  darkInputContainer: { backgroundColor: 'rgba(32, 58, 67, 0.8)' },
  lightInputContainer: { backgroundColor: '#FFFFFF' },
  input: { padding: 18, fontSize: 15, minHeight: 110, textAlignVertical: 'top' },
  darkInput: { color: '#FFFFFF' },
  lightInput: { color: '#2D3436' },
  inputActionsRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  darkActionsRow: { backgroundColor: 'rgba(255,255,255,0.05)' },
  lightActionsRow: { backgroundColor: 'rgba(0,0,0,0.02)' },
  micButton: { backgroundColor: '#FF6B6B', padding: 12, borderRadius: 14, marginRight: 14, alignItems: 'center', justifyContent: 'center', minWidth: 48, shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6, elevation: 5 },
  micButtonActive: { backgroundColor: '#FF4757' },
  micInfoWrap: { flex: 1, marginLeft: 6 },
  micInfoText: { fontSize: 13, fontWeight: '600', opacity: 0.9 },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 14, minWidth: 110, shadowColor: '#03DAC6', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 5 },
  darkButton: { backgroundColor: '#03DAC6' },
  lightButton: { backgroundColor: '#667eea' },
  buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14, marginLeft: 6 },
  buttonFrame: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 18, gap: 14 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 14, minWidth: 110, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 5 },
  clearBtn: { backgroundColor: '#FF6B6B' },
  uploadBtn: { backgroundColor: '#4ECDC4' },
  loadingRow: { alignItems: 'center', marginVertical: 14 },
  loadingText: { marginTop: 10, fontSize: 15, fontWeight: '600' },
  resultBox: { borderRadius: 22, padding: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 7 },
  darkBox: { backgroundColor: 'rgba(32, 58, 67, 0.6)' },
  lightBox: { backgroundColor: '#FFFFFF' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginLeft: 10 },
  resultText: { fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
  keywordContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  keywordPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 1 },
  darkPill: { backgroundColor: 'rgba(187, 134, 252, 0.2)' },
  lightPill: { backgroundColor: 'rgba(102, 126, 234, 0.2)' },
  keywordText: { fontSize: 13, fontWeight: '700' },
  videoContainer: { borderRadius: 22, padding: 20, marginBottom: 18, alignItems: 'center' },
  videoWrapper: { position: 'relative', alignItems: 'center', marginBottom: 10 },
  video: { borderRadius: 14, backgroundColor: '#000', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 6 },
  stopButton: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 18, padding: 6 },
  videoLabel: { fontSize: 15, textAlign: 'center', fontWeight: '600', marginTop: 6 },
  highlightText: { fontWeight: '900', color: '#03DAC6' },
  videoNavigation: { flexDirection: 'row', justifyContent: 'center', marginTop: 10 },
  videoCounter: { fontSize: 14, opacity: 0.8, fontWeight: '700' },
  footer: { alignItems: 'center', marginTop: 16, marginBottom: 16 },
  footerText: { fontSize: 11, opacity: 0.7, fontWeight: '600', textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' },
  modalContent: { width: '92%', borderRadius: 22, padding: 24, margin: 20, maxHeight: '85%', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 16 },
  closeButton: { alignSelf: 'flex-end', padding: 6 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 19, fontWeight: '800', marginLeft: 10, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, textAlign: 'center', marginBottom: 18, opacity: 0.8 },
  modalInput: { borderWidth: 1.2, borderColor: '#E0E0E0', borderRadius: 14, padding: 14, marginBottom: 18, fontSize: 15, backgroundColor: 'rgba(255,255,255,0.1)', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
}); import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Video } from "expo-av";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";

export default function EchoSignApp() {
  const [text, setText] = useState("");
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [isPlaying, setIsPlaying] = useState(false); // ✅ FIXED: Added state hook
  const [recording, setRecording] = useState(null);
  const [recordingStatus, setRecordingStatus] = useState("Idle");
  const videoRef = useRef(null);

  const API_URL = "http://192.168.100.55:8000/translate"; // your backend IP

  // 🎙️ Start recording
  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setRecordingStatus("Recording...");
    } catch (err) {
      console.error("Recording error:", err);
      Alert.alert("Error", "Failed to start recording");
    }
  };

  // 🛑 Stop recording
  const stopRecording = async () => {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      setRecordingStatus("Processing...");
      await sendAudio(uri);
      setRecordingStatus("Idle");
    } catch (err) {
      console.error("Stop recording error:", err);
      Alert.alert("Error", "Failed to stop recording");
    }
  };

  // 📤 Send audio to backend
  const sendAudio = async (uri) => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("audio", {
        uri,
        type: "audio/wav",
        name: "recording.wav",
      });

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      handleResponse(result);
    } catch (error) {
      console.error("API Error (audio):", error);
      Alert.alert("Error", "Failed to upload audio");
    } finally {
      setLoading(false);
    }
  };

  // 📤 Send text to backend
  const sendText = async () => {
    if (!text.trim()) {
      Alert.alert("Error", "Please enter text first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Processing...");

      const formData = new FormData();
      formData.append("sentence", text.trim());

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      handleResponse(result);
    } catch (error) {
      console.error("API Error (text):", error);
      Alert.alert("Error", "Failed to translate text");
    } finally {
      setLoading(false);
    }
  };

  // 📦 Handle backend response
  const handleResponse = (result) => {
    if (result.error) {
      Alert.alert("Error", result.error);
      setStatus("❌ Failed");
      return;
    }

    // ✅ Fix video path: remove "PSL/" prefix
    const mappedVideos = result.videos.map((vid) => ({
      ...vid,
      uri: `http://192.168.18.24:8000${vid.url.replace("/PSL", "")}`,
    }));

    console.log("Mapped videos:", mappedVideos);
    setVideos(mappedVideos);
    setStatus("✅ Processed");
  };

  // ▶️ Play video one by one
  const playVideosSequentially = async (index = 0) => {
    if (index >= videos.length) {
      setIsPlaying(false);
      return;
    }

    const currentVideo = videos[index];
    try {
      setIsPlaying(true);
      await videoRef.current.loadAsync({ uri: currentVideo.uri }, {}, true);
      await videoRef.current.playAsync();

      videoRef.current.setOnPlaybackStatusUpdate((playbackStatus) => {
        if (playbackStatus.didJustFinish) {
          playVideosSequentially(index + 1);
        }
      });
    } catch (error) {
      console.error("Video playback error:", error);
      playVideosSequentially(index + 1);
    }
  };

  // 🧾 Pick a video file (optional upload feature)
  const pickVideoFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "video/*" });
    if (result.assets && result.assets.length > 0) {
      Alert.alert("Selected File", result.assets[0].uri);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#111", padding: 16 }}>
      <Text style={{ color: "#0ff", fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 10 }}>
        EchoSign Translator
      </Text>

      {/* 🗣️ Voice Recorder */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", marginBottom: 10 }}>
        <TouchableOpacity
          onPress={startRecording}
          style={{ backgroundColor: "#0f0", padding: 10, borderRadius: 10 }}
        >
          <Text>🎙️ Start</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={stopRecording}
          style={{ backgroundColor: "#f00", padding: 10, borderRadius: 10 }}
        >
          <Text>🛑 Stop</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ color: "#ccc", textAlign: "center", marginBottom: 10 }}>
        {recordingStatus}
      </Text>

      {/* ✍️ Text Input */}
      <TextInput
        style={{
          backgroundColor: "#222",
          color: "#fff",
          padding: 10,
          borderRadius: 10,
          marginBottom: 10,
        }}
        placeholder="Enter sentence..."
        placeholderTextColor="#777"
        value={text}
        onChangeText={setText}
      />

      {/* 🔘 Buttons */}
      <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
        <TouchableOpacity
          onPress={sendText}
          style={{ backgroundColor: "#09f", padding: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff" }}>Translate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={pickVideoFile}
          style={{ backgroundColor: "#555", padding: 10, borderRadius: 10 }}
        >
          <Text style={{ color: "#fff" }}>📁 Pick</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <ActivityIndicator size="large" color="#0ff" style={{ marginVertical: 20 }} />
      )}

      {/* 📊 Status */}
      <Text style={{ color: "#0f0", textAlign: "center", marginVertical: 10 }}>
        {status}
      </Text>

      {/* 🎬 Video Player */}
      <ScrollView contentContainerStyle={{ alignItems: "center" }}>
        {videos.map((vid, idx) => (
          <View key={idx} style={{ marginVertical: 10 }}>
            <Text style={{ color: "#fff", textAlign: "center", marginBottom: 5 }}>
              {vid.word}
            </Text>
            <Video
              ref={videoRef}
              source={{ uri: vid.uri }}
              style={{ width: 320, height: 180, backgroundColor: "#000" }}
              useNativeControls
              resizeMode="contain"
              onPlaybackStatusUpdate={(playbackStatus) => {
                if (playbackStatus.didJustFinish && idx === videos.length - 1) {
                  setIsPlaying(false);
                }
              }}
            />
          </View>
        ))}

        {videos.length > 0 && !isPlaying && (
          <TouchableOpacity
            onPress={() => playVideosSequentially(0)}
            style={{ backgroundColor: "#0ff", padding: 10, borderRadius: 10, marginBottom: 20 }}
          >
            <Text style={{ textAlign: "center", color: "#000", fontWeight: "bold" }}>
              ▶️ Play All
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
