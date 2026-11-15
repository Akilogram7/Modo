import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts, shadows } from '../theme';
import { CHARACTERS } from './createModeScreen';
import { FocusTimer } from '../features/timer';
import type { CustomMode } from '../types/mode';
import { endModeSession } from '../stats/modeSessions';
import { MusicSettings } from '../features/music';
import { openSpotifyPlaylist } from '../features/music';

type Props = { mode: CustomMode; onEnd: () => void };

function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (value: number) => Math.round(value + (255 - value) * amount);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (value: number) => Math.round(value * (1 - amount));
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

export default function CustomModeScreen({ mode, onEnd }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const characterImage = mode.character !== null ? CHARACTERS[mode.character] : undefined;
  const accent = darken(mode.color, 0.4);
  const textColor = '#FFFFFF';
  const modoW = Math.min(width * 0.6, 260);

  const finish = () => {
    void endModeSession();
    onEnd();
  };

  return (
    <LinearGradient
      colors={[lighten(mode.color, 0.46), mode.color]}
      locations={[0.36, 0.48]}
      start={{ x: 1, y: 0 }}
      end={{ x: 0.22, y: 0.735 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
          {(mode.name || 'CUSTOM').toUpperCase()} MODE
        </Text>
        {characterImage !== undefined && (
          <Image source={characterImage} style={{ width: modoW, height: modoW * 0.75, alignSelf: 'center' }} resizeMode="contain" />
        )}

        <View style={[styles.panel, { backgroundColor: darken(mode.color, 0.08) }]}>
          <View style={styles.row}>
            <View style={[styles.box, { backgroundColor: mode.timerEnabled ? '#FFFFFF' : accent, borderColor: accent }]}>
              {mode.timerEnabled && <Ionicons name="checkmark" size={24} color={accent} />}
            </View>
            {/* timer */}
            <Text style={[styles.rowText, { color: textColor }]}>TIMER</Text>
          </View>
          {mode.timerEnabled && mode.timerDuration !== null && (
            <FocusTimer
              initialDurationSeconds={mode.timerDuration}
              textColor={textColor}
              accentColor={accent}
            />
          )}
          {!mode.timerEnabled && (
            <Text style={[styles.note, { color: textColor }]}>No features are enabled yet.</Text>
          )}
          <Pressable style={[styles.button, { backgroundColor: accent }]} onPress={finish}>
            <Text style={[styles.buttonText, { color: textColor }]}>END MODE</Text>
          </Pressable>
        </View>

        {/* music */}
        {mode.musicEnabled && mode.playlistUrl && (
          <Pressable
            onPress={async () => {
              try {
                await openSpotifyPlaylist(mode.playlistUrl!);
              } catch {
                Alert.alert(
                  'Unable to open Spotify',
                  'Please check your playlist link.',
                );
              }
            }}
            style={({ pressed }) => [
              styles.spotifyButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.spotifyIcon}>♫</Text>

            <Text style={styles.spotifyButtonText} numberOfLines={2}>
              OPEN SPOTIFY
              {'\n'}
              {mode.playlistName?.trim() || 'YOUR PLAYLIST'}
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </LinearGradient>

  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24 },
  title: { fontSize: 44, lineHeight: 56, fontFamily: fonts.headingBold, textAlign: 'center', marginBottom: 8 },
  panel: { marginTop: 16, borderRadius: 30, paddingVertical: 24, paddingHorizontal: 20, ...shadows.inset },
  row: { flexDirection: 'row', alignItems: 'center' },
  box: { width: 32, height: 32, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontSize: 25, lineHeight: 32, fontFamily: fonts.headingBold, marginLeft: 14 },
  note: { fontSize: 16, marginTop: 20, fontFamily: fonts.bodyBold },
  button: { alignSelf: 'center', marginTop: 30, borderRadius: 30, paddingVertical: 8, paddingHorizontal: 24, ...shadows.raised },
  buttonText: { fontSize: 30, lineHeight: 50, fontFamily: fonts.headingBold },
  spotifyButton: {
    backgroundColor: '#168344',
    borderRadius: 22,
    minHeight: 100,
    width: '100%',
    paddingVertical: 20,
    paddingHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 16,
    borderWidth: 2,
    borderColor: '#0D6532',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
  },
  spotifyIcon: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: 'bold',
  },
  spotifyButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: 'bold',
    textAlign: 'center',
    flexShrink: 1,
  },
});
