import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TravelMode } from './routeTypes';

type Props = {
  value: TravelMode;
  onChange: (mode: TravelMode) => void;
};

export function TravelModeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[
          styles.button,
          value === 'driving' && styles.selected,
        ]}
        onPress={() => onChange('driving')}
      >
        <Text style={styles.buttonText}>DRIVE</Text>
      </Pressable>

      <Pressable
        style={[
          styles.button,
          value === 'walking' && styles.selected,
        ]}
        onPress={() => onChange('walking')}
      >
        <Text style={styles.buttonText}>WALK</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#999',
    alignItems: 'center',
  },
  selected: {
    backgroundColor: '#3578C8',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
});
