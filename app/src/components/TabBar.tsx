
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadows } from '../theme';

const TABS = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'stats', label: 'Stats', icon: 'stats-chart' },
  { key: 'modes', label: 'Modes', icon: 'radio-button-on' },
  { key: 'profile', label: 'Profile', icon: 'person' },
] as const;

export type TabKey = (typeof TABS)[number]['key'];

export default function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom - 12, 8) },
      ]}
    >
      {TABS.map((t) => {
        const on = t.key === active;
        const tint = on ? '#fff' : 'rgba(255,255,255,0.65)';

        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => onChange(t.key)}
          >
            <Ionicons name={t.icon} size={26} color={tint} />
            <Text style={[styles.label, { color: tint }]}>
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.gradientMain,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    ...shadows.inset,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
  },

  label: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fonts.heading,
    marginTop: 2,
  },
});
