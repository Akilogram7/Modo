import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, fonts } from '../../../assets/theme';
import { searchAddresses } from './addressService';
import type { MapLocation } from './locationService';

// The Baloo font sits a little high in its line on iPhone, so the text is nudged down to the middle
const TEXT_NUDGE = Platform.OS === 'ios' ? 3 : 0;

type Props = {
  title: string;
  value: MapLocation | null;
  onSelect: (location: MapLocation) => void;
  onUseGPS?: () => void;
  gpsLoading?: boolean;
  accentColor?: string; // button colour (defaults to the theme's brown)
};

export function LocationPicker({
  title,
  value,
  onSelect,
  onUseGPS,
  gpsLoading = false,
  accentColor = colors.otherText,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MapLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const search = query.trim();

    if (search.length < 3) {
      setResults([]);
      setLoading(false);
      setError('');
      return;
    }

    const controller = new AbortController();

    setLoading(false);
    setResults([]);
    setError('');

    const timeout = setTimeout(async () => {
      setLoading(true);

      try {
        const locations = await searchAddresses(
          search,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setResults(locations);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Address autocomplete failed:', err);
          setError('Unable to load suggestions. Try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 700);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function selectLocation(location: MapLocation) {
    setQuery('');
    setResults([]);
    setError('');
    onSelect(location);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <TextInput
        style={styles.input}
        placeholder="Search for a place or address"
        placeholderTextColor="#888"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />


      {onUseGPS && (
        <Pressable
          style={({ pressed }) => [
            styles.gpsButton,
            { backgroundColor: accentColor },
            gpsLoading && styles.gpsButtonDisabled,
            pressed && styles.pressed,
          ]}
          onPress={onUseGPS}
          disabled={gpsLoading}
          accessibilityRole="button"
          accessibilityLabel={
            gpsLoading ? 'Getting location' : 'Use my location'
          }
        >
          {gpsLoading ? (
            <View style={styles.gpsLoadingRow}>
              <ActivityIndicator size="small" color={colors.buttonText} />
              <Text style={styles.gpsText}>
                GETTING LOCATION...
              </Text>
            </View>
          ) : (
            <Text style={styles.gpsText}>
              USE MY LOCATION
            </Text>
          )}
        </Pressable>
      )}


      {loading && <ActivityIndicator />}

      {!!error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {results.map((location, index) => (
        <Pressable
          key={`${location.latitude}-${location.longitude}-${index}`}
          style={styles.result}
          onPress={() => selectLocation(location)}
        >
          <Text style={styles.resultText}>
            {location.label}
          </Text>
        </Pressable>
      ))}

      {value && (
        <Text style={styles.selected}>
          Selected: {value.label}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 10,
    padding: 12,
    color: '#222',
    backgroundColor: '#FFF',
  },
  // same rounded shape and font as the other buttons on the route card
  gpsButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsText: {
    color: colors.buttonText,
    fontFamily: fonts.headingBold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.5,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false, // Android only: removes extra space above and below the text
    transform: [{ translateY: TEXT_NUDGE }],
  },
  result: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  resultText: {
    color: '#222',
    fontSize: 13,
  },
  selected: {
    color: '#555',
    fontSize: 12,
  },
  error: {
    color: '#B00020',
  },
  gpsButtonDisabled: {
    opacity: 0.7,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
  },
  gpsLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});