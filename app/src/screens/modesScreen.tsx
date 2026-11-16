import { useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops, gradientDirection, fonts, shadows } from '../theme';
import { CHARACTERS } from './createModeScreen';
import type { PresetKey } from './presetModes';
import type { CustomMode } from '../types/mode';
import type { HostedShare, JoinedMode } from '../services/modeGroups';
import { JoinWithCodeModal, ShareModeModal } from '../components/ModeShareModals';

// Colours only used on this screen (same ones as the home screen cards)
const CARD = {
  study: '#5B6BB5',
  sleep: '#D4709A',
  commute: '#7CC4A4',
  create: '#9B8AE0',
};

const PRESETS: { id: PresetKey; label: string; color: string; img: ImageSourcePropType }[] = [
  {
    id: 'study',
    label: 'Study',
    color: CARD.study,
    img: require('../../assets/HomePage/ModoStudy.png'),
  },
  {
    id: 'sleep',
    label: 'Sleep',
    color: CARD.sleep,
    img: require('../../assets/HomePage/ModoSleep.png'),
  },
  {
    id: 'commute',
    label: 'Commute',
    color: CARD.commute,
    img: require('../../assets/HomePage/ModoRun.png'),
  },
];

type Props = {
  customModes: CustomMode[];
  onPresetPress: (mode: PresetKey) => void;
  onCustomModePress: (mode: CustomMode) => void;
  onCreateMode: () => void;
  onEditMode: (mode: CustomMode) => void;
  // These two save to Supabase, so the screen waits for them to finish
  onDeleteMode: (mode: CustomMode) => Promise<void>;
  onReorder: (modes: CustomMode[]) => Promise<void>;

  // Sharing with friends
  hostedShares: Record<string, HostedShare>; // the user's modes that are shared, by mode id
  joinedModes: JoinedMode[]; // friends' modes the user joined
  onShareMode: (mode: CustomMode) => Promise<void>;
  onStopSharing: (mode: CustomMode) => Promise<void>;
  onJoinWithCode: (code: string) => Promise<void>;
  onLeaveMode: (joined: JoinedMode) => Promise<void>;
};

export default function ModesScreen({
  customModes,
  onPresetPress,
  onCustomModePress,
  onCreateMode,
  onEditMode,
  onDeleteMode,
  onReorder,
  hostedShares,
  joinedModes,
  onShareMode,
  onStopSharing,
  onJoinWithCode,
  onLeaveMode,
}: Props) {
  // While reordering, changes stay in `draft` and only save when Done is tapped
  const [reordering, setReordering] = useState(false);
  const [draft, setDraft] = useState<CustomMode[]>([]);
  const [savingOrder, setSavingOrder] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Which popup is open (if any)
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [joinOpen, setJoinOpen] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  const shownModes = reordering ? draft : customModes;
  const sharingMode = customModes.find((m) => m.id === sharingId);

  function startReordering() {
    setDraft(customModes);
    setReordering(true);
  }

  // Swaps a mode with the one above it (-1) or below it (+1)
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;

    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
  }

  async function finishReordering() {
    const changed = draft.some((mode, i) => mode.id !== customModes[i]?.id);

    if (changed) {
      setSavingOrder(true);
      try {
        await onReorder(draft);
      } catch (e) {
        console.warn('Could not save mode order:', e);
        Alert.alert('Unable to save the new order', 'Your modes are back in their old order. Please try again.');
      }
      setSavingOrder(false);
    }

    setReordering(false);
  }

  function confirmDelete(mode: CustomMode) {
    Alert.alert(
      `Delete ${modeName(mode)}?`,
      "It will also disappear from your stats. You can't undo this.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMode(mode) },
      ],
    );
  }

  async function deleteMode(mode: CustomMode) {
    setDeletingId(mode.id);
    try {
      await onDeleteMode(mode);
    } catch (e) {
      console.warn('Could not delete mode:', e);
      Alert.alert('Unable to delete mode', 'Your mode is still here. Please try again.');
    }
    setDeletingId(null);
  }

  function confirmLeave(joined: JoinedMode) {
    Alert.alert(
      `Leave ${modeName(joined.mode)}?`,
      `You can join again later with the code from ${joined.hostName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: () => leaveMode(joined) },
      ],
    );
  }

  async function leaveMode(joined: JoinedMode) {
    setLeavingId(joined.groupId);
    try {
      await onLeaveMode(joined);
    } catch (e) {
      console.warn('Could not leave mode:', e);
      Alert.alert('Unable to leave mode', 'Please try again.');
    }
    setLeavingId(null);
  }

  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={styles.bg}
    >
      {/* Background */}
      <Image
        source={require('../../assets/HomePage/CloudBackground.png')}
        style={styles.backgroundImage}
        resizeMode="stretch"
        pointerEvents="none"
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Modes</Text>
          <Text style={styles.hint}>Tap a mode to start it.</Text>

          {/* The 3 modes that come with the app */}
          <Text style={styles.sectionTitle}>Preset modes</Text>
          <View style={styles.list}>
            {PRESETS.map((preset) => (
              <ModeBar
                key={preset.id}
                name={preset.label}
                color={preset.color}
                image={preset.img}
                disabled={reordering}
                onPress={() => onPresetPress(preset.id)}
              />
            ))}
          </View>

          {/* Modes the user made */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>Your modes</Text>

            {/* Reordering only makes sense with 2 or more modes */}
            {customModes.length > 1 && (
              <Pressable
                onPress={reordering ? finishReordering : startReordering}
                disabled={savingOrder || deletingId !== null}
                style={({ pressed }) => [styles.reorderButton, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                {savingOrder ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <>
                    <Ionicons
                      name={reordering ? 'checkmark' : 'swap-vertical'}
                      size={16}
                      color={colors.text}
                    />
                    <Text style={styles.reorderText}>{reordering ? 'Done' : 'Reorder'}</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>

          <View style={styles.list}>
            {shownModes.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  You haven't made a mode yet. Create one and it will show up here and on your home
                  screen.
                </Text>
              </View>
            )}

            {shownModes.map((mode, index) => (
              <ModeBar
                key={mode.id}
                name={modeName(mode)}
                detail={featureSummary(mode)}
                color={mode.color}
                image={mode.character !== null ? CHARACTERS[mode.character] : undefined}
                disabled={reordering || deletingId !== null}
                onPress={() => onCustomModePress(mode)}
              >
                {reordering ? (
                  <>
                    <CircleButton
                      icon="arrow-up"
                      label={`Move ${modeName(mode)} up`}
                      disabled={index === 0 || savingOrder}
                      onPress={() => move(index, -1)}
                    />
                    <CircleButton
                      icon="arrow-down"
                      label={`Move ${modeName(mode)} down`}
                      disabled={index === shownModes.length - 1 || savingOrder}
                      onPress={() => move(index, 1)}
                    />
                  </>
                ) : (
                  <>
                    <CircleButton
                      icon={hostedShares[mode.id] ? 'people' : 'share-social'}
                      label={`Share ${modeName(mode)}`}
                      disabled={deletingId !== null}
                      onPress={() => setSharingId(mode.id)}
                    />
                    <CircleButton
                      icon="pencil"
                      label={`Edit ${modeName(mode)}`}
                      disabled={deletingId !== null}
                      onPress={() => onEditMode(mode)}
                    />
                    <CircleButton
                      icon="trash"
                      label={`Delete ${modeName(mode)}`}
                      disabled={deletingId !== null}
                      loading={deletingId === mode.id}
                      onPress={() => confirmDelete(mode)}
                    />
                  </>
                )}
              </ModeBar>
            ))}

            {/* Create mode (hidden while reordering so it doesn't get in the way) */}
            {!reordering && (
              <Pressable
                onPress={onCreateMode}
                disabled={deletingId !== null}
                style={({ pressed }) => [
                  styles.bar,
                  { backgroundColor: CARD.create },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <View style={styles.barImgBox}>
                  <Image
                    source={require('../../assets/HomePage/Plus.png')}
                    style={styles.plus}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.barText}>
                  <Text style={styles.barName}>Create a mode</Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Friends' modes the user joined with a code */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionTitle, styles.sectionTitleInRow]}>Shared with you</Text>

            <Pressable
              onPress={() => setJoinOpen(true)}
              disabled={reordering}
              style={({ pressed }) => [styles.reorderButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="enter-outline" size={16} color={colors.text} />
              <Text style={styles.reorderText}>Join with a code</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {joinedModes.length === 0 && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>
                  Got a code from a friend? Tap Join with a code and their mode will show up here.
                </Text>
              </View>
            )}

            {joinedModes.map((joined) => (
              <ModeBar
                key={joined.groupId}
                name={modeName(joined.mode)}
                detail={
                  joined.runningForSeconds !== null
                    ? `${joined.hostName} has it on right now`
                    : `From ${joined.hostName}`
                }
                color={joined.mode.color}
                image={
                  joined.mode.character !== null ? CHARACTERS[joined.mode.character] : undefined
                }
                disabled={reordering || leavingId !== null}
                onPress={() => onCustomModePress(joined.mode)}
              >
                <CircleButton
                  icon="exit-outline"
                  label={`Leave ${modeName(joined.mode)}`}
                  disabled={reordering || leavingId !== null}
                  loading={leavingId === joined.groupId}
                  onPress={() => confirmLeave(joined)}
                />
              </ModeBar>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Popups */}
      {sharingMode && (
        <ShareModeModal
          modeName={modeName(sharingMode)}
          share={hostedShares[sharingMode.id]}
          onCreateCode={() => onShareMode(sharingMode)}
          onStopSharing={() => onStopSharing(sharingMode)}
          onClose={() => setSharingId(null)}
        />
      )}
      {joinOpen && <JoinWithCodeModal onJoin={onJoinWithCode} onClose={() => setJoinOpen(false)} />}
    </LinearGradient>
  );
}

// ---------- One mode in the list ----------

function ModeBar({
  name,
  detail,
  color,
  image,
  disabled,
  onPress,
  children,
}: {
  name: string;
  detail?: string;
  color: string;
  image?: ImageSourcePropType;
  disabled?: boolean;
  onPress: () => void;
  children?: ReactNode; // the round buttons on the right
}) {
  return (
    <View style={[styles.bar, { backgroundColor: color }]}>
      {/* Tapping the picture or the name starts the mode */}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [styles.barMain, pressed && styles.barMainPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Start ${name}`}
      >
        <View style={styles.barImgBox}>
          {image !== undefined && <Image source={image} style={styles.barImg} resizeMode="contain" />}
        </View>

        <View style={styles.barText}>
          {/* Long names shrink a little before they get cut off */}
          <Text style={styles.barName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {name}
          </Text>
          {detail !== undefined && (
            <Text style={styles.barDetail} numberOfLines={2}>
              {detail}
            </Text>
          )}
        </View>
      </Pressable>

      {children}
    </View>
  );
}

// The small white round buttons (edit, delete, move up, move down)
function CircleButton({
  icon,
  label,
  disabled,
  loading,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.circle,
        disabled && !loading && styles.circleDisabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#171717" />
      ) : (
        <Ionicons name={icon} size={17} color="#171717" />
      )}
    </Pressable>
  );
}

// ---------- Helpers ----------

function modeName(mode: CustomMode) {
  return mode.name.trim() || 'Custom mode';
}

// "25 min timer and Spotify playlist", "25 min timer", "No features yet"...
function featureSummary(mode: CustomMode) {
  const parts: string[] = [];

  if (mode.timerEnabled && mode.timerDuration !== null) {
    parts.push(`${Math.round(mode.timerDuration / 60)} min timer`);
  }
  if (mode.musicEnabled) {
    parts.push('Spotify playlist');
  }

  return parts.length > 0 ? parts.join(' and ') : 'No features yet';
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    aspectRatio: 786 / 1602,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 110,
  },

  title: {
    fontSize: 34,
    fontFamily: fonts.headingBold,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },

  hint: {
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: -4,
  },

  sectionTitle: {
    fontSize: 22,
    fontFamily: fonts.headingBold,
    color: colors.text,
    marginTop: 20,
    marginBottom: 10,
  },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 10,
  },

  sectionTitleInRow: {
    marginTop: 0,
    marginBottom: 0,
  },

  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minWidth: 96,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },

  reorderText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },

  list: {
    rowGap: 12,
  },

  // A mode in the list: a wide version of the home screen cards
  bar: {
    minHeight: 76,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingLeft: 10,
    paddingRight: 12,
    gap: 6,
    ...shadows.raised,
  },

  barMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  barMainPressed: {
    opacity: 0.8,
  },

  barImgBox: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },

  barImg: {
    width: 56,
    height: 56,
  },

  plus: {
    width: 38,
    height: 38,
  },

  barText: {
    flex: 1,
  },

  barName: {
    color: '#fff',
    fontSize: 20,
    lineHeight: 26,
    fontFamily: fonts.headingBold,
    letterSpacing: 0.5,
  },

  barDetail: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 17,
    fontFamily: fonts.bodyBold,
    opacity: 0.92,
  },

  circle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleDisabled: {
    opacity: 0.45,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    ...shadows.raised,
  },

  emptyText: {
    fontSize: 15,
    lineHeight: 20,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.75,
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});
