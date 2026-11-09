import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradientStops, gradientDirection, fonts, shadows } from '../theme';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../../lib/supabase';

// Colours only used on this screen (same palette as the home screen cards)
const ACCENT = {
  avatar: '#9B8AE0',
  save: '#7CC4A4',
  logout: '#5B6BB5',
  danger: '#D9534F',
};

type Props = {
  onBack: () => void;
};

export default function ProfileScreen({ onBack }: Props) {
  const { user, signOut } = useAuth();

  const savedName: string = user?.user_metadata?.display_name ?? '';
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(savedName);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
      })
    : null;

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
      {/* Background */}
      <Image
        source={require('../../assets/HomePage/Cloud Background.png')}
        style={styles.backgroundImage}
        resizeMode="stretch"
        pointerEvents="none"
      />

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
              <Pressable
                style={({ pressed }) => [styles.circleButton, pressed && styles.pressed]}
                onPress={onBack}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="chevron-back" size={24} color="#171717" />
              </Pressable>

              <Text style={styles.title}>Profile</Text>

              {/* Empty box the same size as the back button, keeps the title centered */}
              <View style={styles.circleSpacer} />
            </View>

            {/* Avatar + name */}
            <View style={styles.hero}>
              <View style={styles.avatar}>
                <Image
                  source={require('../../assets/HomePage/ClassicModo 1.png')}
                  style={styles.avatarImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroName}>{savedName || 'No name yet'}</Text>
              {memberSince && (
                <Text style={styles.heroSub}>Member since {memberSince}</Text>
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
                  <Ionicons name="pencil" size={18} color={colors.text} />
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
    </LinearGradient>
  );
}

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
    paddingBottom: 60,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },

  circleSpacer: {
    width: 44,
  },

  title: {
    fontSize: 34,
    fontFamily: fonts.headingBold,
    color: colors.text,
  },

  hero: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
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

  heroName: {
    marginTop: 12,
    fontSize: 26,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },

  heroSub: {
    marginTop: 2,
    fontSize: 14,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.7,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    ...shadows.raised,
  },

  cardLabel: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.text,
    opacity: 0.55,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },

  value: {
    flexShrink: 1,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },

  divider: {
    height: 1,
    backgroundColor: '#ECECF0',
    marginVertical: 14,
  },

  input: {
    borderWidth: 1.5,
    borderColor: ACCENT.avatar,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: fonts.bodyBold,
    color: colors.text,
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
    color: colors.text,
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

  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
});