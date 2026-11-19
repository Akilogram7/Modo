import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getCurrentLocation,
} from '../location/locationService';

import { getNearbyStops } from './transitService';
import type { TransitStop } from './transitTypes';

export function NearbyStops() {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleFindStops() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const location = await getCurrentLocation();
      const nearby = getNearbyStops(location, 1000, 10);

      setStops(nearby);
    } catch {
      setError(
        'Unable to find nearby stops. Check your location permissions.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NEARBY BUS STOPS</Text>

      <Pressable
        style={styles.button}
        onPress={handleFindStops}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>
            FIND NEARBY STOPS
          </Text>
        )}
      </Pressable>

      {!!error && (
        <Text style={styles.error}>{error}</Text>
      )}

      {!loading && !error && stops.length === 0 && (
        <Text style={styles.empty}>
          Find DRT bus stops near your current location.
        </Text>
      )}

      {stops.map((stop) => (
        <View key={stop.id} style={styles.stopCard}>
          <Text style={styles.stopName}>{stop.name}</Text>

          <Text style={styles.stopDetails}>
            Stop #{stop.code ?? stop.id} ·{' '}
            {Math.round(stop.distanceMeters ?? 0)} m away
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 20,
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#222',
  },
  button: {
    backgroundColor: '#3578C8',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  stopCard: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  stopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  stopDetails: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  error: {
    color: '#B00020',
    marginTop: 10,
  },
  empty: {
    color: '#666',
    marginTop: 12,
  },
});
