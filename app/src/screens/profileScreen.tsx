import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { colors, gradientStops, gradientDirection, fonts, shadows, backgroundColors } from '../../assets/theme';

// Modos users can pick as their profile picture.
// The key is what gets saved on the account, so don't rename keys once people use them.
// To add more, copy a line and point it at another file in assets/Modos.
const AVATARS = [
  { key: 'drink', src: require('../../assets/Modos/ModoDrink.png') },
  { key: 'excited', src: require('../../assets/Modos/ModoExcited.png') },
  { key: 'flower', src: require('../../assets/Modos/ModoFlower.png') },
  { key: 'heart', src: require('../../assets/Modos/ModoHeart.png') },
  { key: 'lazy', src: require('../../assets/Modos/ModoLazy.png') },
  { key: 'music', src: require('../../assets/Modos/ModoMusic.png') },
  { key: 'peep', src: require('../../assets/Modos/ModoPeep.png') },
  { key: 'question', src: require('../../assets/Modos/ModoQuestion.png') },
  { key: 'run', src: require('../../assets/Modos/ModoRun.png') },
  { key: 'sad', src: require('../../assets/Modos/ModoSad.png') },
  { key: 'sleep', src: require('../../assets/Modos/ModoSleep.png') },
  { key: 'study', src: require('../../assets/Modos/ModoStudy.png') },
  { key: 'sunglasses', src: require('../../assets/Modos/ModoSunglasses.png') },
  { key: 'wave', src: require('../../assets/Modos/ModoWave.png') },
  { key: 'wink', src: require('../../assets/Modos/ModoWink.png') },
  { key: 'yippe', src: require('../../assets/Modos/ModoYippee.png') },
];

const ACCENT = {
  avatar: backgroundColors[0],
  save: backgroundColors[3],
  logout: backgroundColors[10],
  danger: backgroundColors[10],
};

const DEFAULT_AVATAR = 'wave';

function avatarSource(key: string | undefined) {
  return (AVATARS.find((a) => a.key === key) ?? AVATARS[0]).src;
}

type Props = {
  // Not used anymore (the back button is gone), but App.tsx still passes it
  onBack?: () => void;
};

export default function ProfileScreen(_props: Props) {
  const { user, signOut } = useAuth();
  const { width } = useWindowDimensions();

  const savedName: string = user?.user_metadata?.display_name ?? '';
  const savedAvatar: string = user?.user_metadata?.avatar ?? DEFAULT_AVATAR;
  const savedColor: string = user?.user_metadata?.avatar_color ?? backgroundColors[0];

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState(savedAvatar);
  const [draftColor, setDraftColor] = useState(savedColor);
  const [savingAvatar, setSavingAvatar] = useState(false);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
      month: 'long',
      year: 'numeric',
    })
    : null;

  // 3 Modos per row inside the picker sheet
  const COLUMNS = 3;
  const optionSize = (width - 40 - 36) / COLUMNS; // screen minus sheet margins and padding

  function startEditing() {
    setDraftName(savedName);
    setEditing(true);
  }

  async function saveName() {
    const trimmed = draftName.trim();

    if (!trimmed) {
      Alert.alert("Your name can't be empty");
      return;
    }
    if (trimmed === savedName) {
      setEditing(false);
      return;
    }

    setSaving(true);
    // Updates the same display_name we saved at sign up.
    // AuthProvider hears about the change, so the home screen updates too.
    const { error } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save your name', error.message);
      return;
    }
    setEditing(false);
  }

  function openPicker() {
    setDraftAvatar(savedAvatar);
    setDraftColor(savedColor);
    setPickerOpen(true);
  }

  async function saveAvatar() {
    if (draftAvatar === savedAvatar && draftColor === savedColor) {
      setPickerOpen(false);
      return;
    }

    setSavingAvatar(true);
    // Saved next to display_name in the account's metadata
    const { error } = await supabase.auth.updateUser({
      data: { avatar: draftAvatar, avatar_color: draftColor },
    });
    setSavingAvatar(false);

    if (error) {
      Alert.alert('Could not save your picture', error.message);
      return;
    }
    setPickerOpen(false);
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      "This permanently deletes your account and everything in it. You can't undo this.",
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteAccount },
      ],
    );
  }

  async function deleteAccount() {
    setDeleting(true);

    // Calls the delete_own_account function we made in the Supabase SQL editor
    const { error } = await supabase.rpc('delete_own_account');

    if (error) {
      setDeleting(false);
      Alert.alert('Could not delete your account', error.message);
      return;
    }

    // The account is gone now, so just clear the login saved on this phone.
    // AuthGate then sends them back to the sign in screen.
    await supabase.auth.signOut({ scope: 'local' });
  }

  return (
    <LinearGradient
      colors={[colors.gradientLight, colors.gradientMain]}
      locations={[...gradientStops]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      style={styles.bg}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Top bar */}
            <View style={styles.topBar}>
              <Text style={styles.title}>Profile</Text>
            </View>

            {/* Avatar + name */}
            <View style={styles.Modo}>
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: savedColor }]}>
                  <Image
                    source={avatarSource(savedAvatar)}
                    style={styles.avatarImg}
                    resizeMode="contain"
                  />
                </View>

                {/* Edit picture button */}
                <Pressable
                  onPress={openPicker}
                  style={({ pressed }) => [styles.editBadge, pressed && styles.pressed]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Change profile picture"
                >
                  <Ionicons name="create" size={20} color={backgroundColors[1]} />
                </Pressable>
              </View>

              <Text style={styles.ModoName}>{savedName || 'No name yet'}</Text>
              {memberSince && (
                <Text style={styles.ModoSub}>Member since {memberSince}</Text>
              )}
            </View>
            
            {/* Account info */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Name</Text>

              {editing ? (
                <>
                  <TextInput
                    value={draftName}
                    onChangeText={setDraftName}
                    style={styles.input}
                    autoFocus
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="done"
                    maxLength={40}
                    onSubmitEditing={saveName}
                  />
                  <View style={styles.editActions}>
                    <Pressable
                      onPress={() => setEditing(false)}
                      style={({ pressed }) => [
                        styles.smallButton,
                        styles.smallButtonGhost,
                        pressed && styles.pressed,
                      ]}
                      accessibilityRole="button"
                    >
                      <Text style={styles.smallButtonGhostText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={saveName}
                      disabled={saving}
                      style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                      accessibilityRole="button"
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.smallButtonText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  onPress={startEditing}
                  style={styles.row}
                  accessibilityRole="button"
                  accessibilityLabel="Edit name"
                >
                  <Text style={styles.value}>{savedName || 'Add your name'}</Text>
                  <Ionicons name="create" size={20} color={backgroundColors[1]} />
                </Pressable>
              )}

              <View style={styles.divider} />

              <Text style={styles.cardLabel}>Email</Text>
              <Text style={styles.value}>{user?.email}</Text>
            </View>

            {/* Log out */}
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
              <Text style={styles.logoutText}>Log out</Text>
            </Pressable>

            {/* Delete account */}
            <Pressable
              onPress={confirmDelete}
              disabled={deleting}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
              accessibilityRole="button"
            >
              {deleting ? (
                <ActivityIndicator color={ACCENT.danger} />
              ) : (
                <Text style={styles.deleteText}>Delete account</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Modo picker */}
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          {/* Inner Pressable stops taps on the sheet from closing it */}
          <Pressable style={styles.sheet} onPress={() => { }}>
            <Text style={styles.sheetTitle}>Choose your Modo</Text>

            {/* Background colour */}
            <View style={styles.swatchRow}>
              {backgroundColors.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setDraftColor(c)}
                  style={[styles.swatch, { backgroundColor: c }, c === draftColor && styles.swatchOn]}
                  accessibilityRole="button"
                  accessibilityLabel={`Colour ${c}`}
                />
              ))}
            </View>

            <ScrollView
              style={{ maxHeight: optionSize * 3.4 }}
              contentContainerStyle={styles.sheetGrid}
              showsVerticalScrollIndicator={false}
            >
              {AVATARS.map((a) => {
                const selected = a.key === draftAvatar;
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => setDraftAvatar(a.key)}
                    style={[
                      styles.option,
                      { width: optionSize, height: optionSize },
                      selected && styles.optionSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <Image
                      source={a.src}
                      style={{ width: '82%', height: '82%' }}
                      resizeMode="contain"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.editActions}>
              <Pressable
                onPress={() => setPickerOpen(false)}
                style={({ pressed }) => [
                  styles.smallButton,
                  styles.smallButtonGhost,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.smallButtonGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={saveAvatar}
                disabled={savingAvatar}
                style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                {savingAvatar ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.smallButtonText}>Save</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </LinearGradient >
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 150,
  },

  topBar: {
    alignItems: 'center',
    marginTop: 8,
  },

  title: {
    fontSize: 34,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },

  Modo: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
  },

  avatarWrap: {
    width: 120,
    height: 120,
  },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ACCENT.avatar,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.raised,
  },

  avatarImg: {
    width: '78%',
    height: '78%',
  },

  editBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },

  ModoName: {
    marginTop: 12,
    fontSize: 26,
    fontFamily: fonts.bodyBold,
    color: colors.name,
  },

  ModoSub: {
    marginTop: 2,
    fontSize: 20,
    fontFamily: fonts.headingBold,
    color: colors.heading,
  },

  card: {
    backgroundColor: '#fff6f3',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 18,
    ...shadows.raised,
  },

  cardLabel: {
    fontSize: 13,
    fontFamily: fonts.heading,
    color: colors.heading,
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 0,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  value: {
    flexShrink: 1,
    fontSize: 20,
    fontFamily: fonts.heading,
    color: colors.heading,
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECF0',
    marginVertical: 0,
  },

  input: {
    borderWidth: 1.5,
    borderColor: ACCENT.avatar,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.otherText,
  },

  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },

  smallButton: {
    minWidth: 84,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: ACCENT.save,
    alignItems: 'center',
  },

  smallButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },

  smallButtonGhost: {
    backgroundColor: '#F1F1F4',
  },

  smallButtonGhostText: {
    color: colors.otherText,
    fontSize: 16,
    fontFamily: fonts.headingBold,
  },

  logout: {
    marginTop: 18,
    height: 58,
    borderRadius: 22,
    backgroundColor: ACCENT.logout,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...shadows.raised,
  },

  logoutText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: fonts.headingBold,
  },

  deleteButton: {
    marginTop: 14,
    height: 52,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteText: {
    color: ACCENT.danger,
    fontSize: 17,
    fontFamily: fonts.headingBold,
  },

  // Picker
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  sheet: {
    backgroundColor: '#FFF3E6',
    borderRadius: 28,
    padding: 18,
  },

  sheetTitle: {
    fontSize: 24,
    fontFamily: fonts.headingBold,
    color: colors.otherText,
    textAlign: 'center',
    marginBottom: 12,
  },

  swatchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },

  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  swatchOn: {
    borderWidth: 3,
    borderColor: '#60483F',
    transform: [{ scale: 1.1 }],
  },

  sheetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  option: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'transparent',
  },

  optionSelected: {
    borderColor: ACCENT.avatar,
    backgroundColor: 'rgba(165,155,231,0.18)',
  },

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});