import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { searchCities, type CityResult } from './cityService';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (city: CityResult) => void;
  onUseCurrentLocation: () => void;
};

export function CityPicker({
  visible,
  onClose,
  onSelectCity,
  onUseCurrentLocation,
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (query.trim().length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setResults([]);
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const cities = await searchCities(query);

        if (!cancelled) {
          setResults(cities);
        }
      } catch {
        if (!cancelled) {
          setError('Unable to search for cities.');
          setResults([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, visible]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Choose Location</Text>

            <Pressable onPress={onClose} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color="#256344" />
            </Pressable>
          </View>

          <Pressable
            style={styles.currentLocation}
            onPress={onUseCurrentLocation}
          >
            <Ionicons name="locate" size={22} color="#256344" />
            <Text style={styles.currentLocationText}>
              Use my current location
            </Text>
          </Pressable>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search for a city..."
            placeholderTextColor="#688B78"
            style={styles.input}
            autoCapitalize="words"
          />

          {loading && <ActivityIndicator color="#256344" />}

          {error && <Text style={styles.error}>{error}</Text>}

          <ScrollView keyboardShouldPersistTaps="handled">
            {results.map((city) => (
              <Pressable
                key={city.id}
                style={styles.cityRow}
                onPress={() => onSelectCity(city)}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#256344"
                />

                <Text style={styles.cityText}>
                  {city.name}
                  {city.admin1 ? `, ${city.admin1}` : ''}
                  {`, ${city.country}`}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#E5FFF1',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    height: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#256344',
  },
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  currentLocationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#256344',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    fontSize: 16,
    color: '#256344',
    marginBottom: 16,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#C6E5D5',
  },
  cityText: {
    flex: 1,
    fontSize: 15,
    color: '#256344',
  },
  error: {
    color: '#A52A2A',
    marginBottom: 12,
  },
});
