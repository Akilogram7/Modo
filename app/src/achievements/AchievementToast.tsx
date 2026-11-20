import { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts, shadows } from '../../assets/theme';
import { useAchievements } from './AchievementsProvider';

// Slides down from the top when an achievement unlocks.
// Tapping it opens the profile (where the XP bar is), or just hides it if there's nowhere to go.

const SHOW_MS = 4000;

type Props = {
  onOpen?: () => void;
};

export default function AchievementToast({ onOpen }: Props) {
  const { toast, dismissToast } = useAchievements();
  const insets = useSafeAreaInsets();
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    slide.setValue(0);
    Animated.spring(slide, { toValue: 1, useNativeDriver: true, friction: 7 }).start();
    const hide = setTimeout(dismissToast, SHOW_MS);
    return () => clearTimeout(hide);
    // A new toast has a new key, so that's all this needs to watch
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);

  if (!toast) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: slide,
          transform: [{ translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          dismissToast();
          onOpen?.();
        }}
        style={styles.card}
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title} ${toast.subtitle}`}
        accessibilityHint={onOpen ? 'Opens your profile' : undefined}
      >
        <Text style={styles.emoji}>{toast.emoji}</Text>
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={1}>
            {toast.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {toast.subtitle}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 1000,
    elevation: 1000,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#D38900',
    borderRadius: 22,
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...shadows.raised,
  },
  emoji: {
    fontSize: 34,
  },
  text: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  subtitle: {
    fontFamily: fonts.headingBold,
    fontSize: 14,
    color: '#FFE3A3',
  },
});
