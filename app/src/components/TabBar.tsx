
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../assets/theme';

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
        {
          backgroundColor: '#F2A56A',
          marginHorizontal: 28,
          marginBottom: Math.max(insets.bottom, 12) + 8,
        },
      ]}
    >
      {TABS.map((t) => {
        const on = t.key === active;

        return (
          <Pressable
            key={t.key}
            style={styles.tab}
            onPress={() => onChange(t.key)}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
          >
            <View
              style={[
                styles.iconContainer,
                on && styles.activeIcon,
              ]}
            >
              <Ionicons
                name={t.icon}
                size={25}
                color={on ? '#60483F' : '#FFFFFF'}
              />
            </View>
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
    borderRadius: 40,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'space-around',

    elevation: 5,
    shadowColor: '#60483F',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },

  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255,243,230,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  activeIcon: {
    backgroundColor: '#FFF3E6',
  },
});