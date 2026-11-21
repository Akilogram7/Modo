import { useEffect, useState } from 'react'; import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getCurrentLocation,
  type MapLocation,
} from '../location/locationService';

import { getNearbyStops } from './transitService';
import type { TransitStop } from './transitTypes';
import {
  getGoUpcomingArrivals,
  type GoArrival,
} from './goArrivalService';
import {
  getUpcomingArrivals,
  type BusArrival,
} from './arrivalService';

type NearbyStopsProps = {
  searchLocation?: MapLocation | null;
  onStopsFound?: (stops: TransitStop[]) => void;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string | null) => void;
};

export function NearbyStops({
  searchLocation,
  onStopsFound,
  selectedStopId: externalSelectedStopId,
  onSelectStop,
}: NearbyStopsProps) {
  const [stops, setStops] = useState<TransitStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [internalSelectedStopId, setInternalSelectedStopId] =
    useState<string | null>(null);

  const selectedStopId =
    externalSelectedStopId !== undefined
      ? externalSelectedStopId
      : internalSelectedStopId;

  function updateSelectedStop(stopId: string | null) {
    if (onSelectStop) {
      onSelectStop(stopId);
    } else {
      setInternalSelectedStopId(stopId);
    }
  }
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [goArrivals, setGoArrivals] = useState<GoArrival[]>([]);
  const [goLoading, setGoLoading] = useState(false);
  const [goError, setGoError] = useState('');

  async function handleFindStops() {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const location = searchLocation ?? await getCurrentLocation();
      const nearby = getNearbyStops(location, 3000, 20);
      updateSelectedStop(null);
      setStops(nearby);
      onStopsFound?.(nearby);
    } catch {
      setError(
        'Unable to find nearby stops. Check your location permissions.'
      );
    } finally {
      setLoading(false);
    }
  }
  //clock refreshes every 30 seconds to update the arrival times for the selected stop
  useEffect(() => {
    if (!selectedStopId) return;

    setCurrentTime(new Date());

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 30_000);

    return () => clearInterval(interval);
  }, [selectedStopId]);
  //Go departure fetch 
  useEffect(() => {
    const selectedStop = stops.find(
      (stop) => stop.id === selectedStopId
    );

    if (!selectedStop || selectedStop.agency !== 'GO') {
      setGoArrivals([]);
      setGoLoading(false);
      setGoError('');
      return;
    }

    let cancelled = false;

    async function loadGoArrivals() {
      setGoLoading(true);
      setGoError('');

      try {
        const arrivals = await getGoUpcomingArrivals(
          selectedStop!.id
        );

        if (!cancelled) {
          setGoArrivals(arrivals);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('GO Transit arrivals error:', error);
          setGoError('Unable to load GO Transit departures.');
          setGoArrivals([]);
        }
      } finally {
        if (!cancelled) {
          setGoLoading(false);
        }
      }
    }

    setGoArrivals([]);
    loadGoArrivals();

    return () => {
      cancelled = true;
    };
  }, [selectedStopId, stops, currentTime]);


  function handleSelectStop(stopId: string) {
    updateSelectedStop(
      selectedStopId === stopId ? null : stopId
    );
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
          Find DRT or GO bus stops near your current location.
        </Text>
      )}


      {stops.map((stop) => {
        const isSelected = selectedStopId === stop.id;

        const arrivals: BusArrival[] | GoArrival[] =
          !isSelected
            ? []
            : stop.agency === 'GO'
              ? goArrivals
              : getUpcomingArrivals(stop.id, currentTime);

        if (isSelected) {
          console.log('TRANSIT DEBUG:', {
            stopId: stop.id,
            stopName: stop.name,
            currentTime: new Date().toISOString(),
            arrivals,
          });
        }

        return (
          <View key={stop.id} style={styles.stopCard}>
            <Pressable onPress={() => handleSelectStop(stop.id)}>
              <Text style={styles.stopName}>
                {stop.agency === 'GO'
                  ? stop.transitType === 'train'
                    ? '🚆 GO Train'
                    : '🚌 GO Bus'
                  : '🚌 DRT'}{' '}
                — {stop.name}
              </Text>

              <Text style={styles.stopDetails}>
                Stop #{stop.code ?? stop.id} ·{' '}
                {Math.round(stop.distanceMeters ?? 0)} m away
              </Text>

              <Text style={styles.expandHint}>
                {isSelected ? 'Hide arrivals ▲' : 'View arrivals ▼'}
              </Text>
            </Pressable>

            {isSelected && (
              <View style={styles.arrivalsContainer}>
                <Text style={styles.arrivalsTitle}>
                  {stop.agency === 'GO'
                    ? 'Upcoming scheduled GO departures'
                    : 'Upcoming scheduled DRT buses'}
                </Text>

                {stop.agency === 'GO' && goLoading ? (
                  <ActivityIndicator color="#3578C8" />
                ) : stop.agency === 'GO' && goError ? (
                  <Text style={styles.error}>{goError}</Text>
                ) : arrivals.length === 0 ? (
                  <Text style={styles.empty}>
                    No scheduled departures available for this stop.
                  </Text>
                ) : (
                  arrivals.map((arrival, index) => (
                    <View
                      key={`${stop.agency}-${stop.id}-${index}`}
                      style={styles.arrivalRow}
                    >
                      <View style={styles.routeBadge}>
                        <Text style={styles.routeText}>
                          {arrival.route}
                        </Text>
                      </View>

                      <View style={styles.arrivalInfo}>
                        <Text style={styles.destination}>
                          {arrival.destination}
                        </Text>

                        <Text style={styles.scheduledTime}>
                          Scheduled: {arrival.arrivalTime}
                        </Text>
                      </View>

                      <Text style={styles.minutesAway}>
                        {arrival.minutesUntilArrival === 0
                          ? 'Due'
                          : `${arrival.minutesUntilArrival} min`}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}

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
  //arrival time styles
  expandHint: {
    fontSize: 12,
    color: '#3578C8',
    marginTop: 8,
    fontWeight: '600',
  },
  arrivalsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  arrivalsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 10,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  routeBadge: {
    backgroundColor: '#3578C8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 48,
    alignItems: 'center',
  },
  routeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  arrivalInfo: {
    flex: 1,
  },
  destination: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  scheduledTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 3,
  },
  minutesAway: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#3578C8',
  },

});
