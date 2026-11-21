import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { colors, fonts } from '../../../assets/theme';
import { LocationPicker } from '../location/LocationPicker';
import {
    getCurrentLocation,
    type MapLocation,
} from '../location/locationService';

import { getRoute } from './routeService';
import { RouteDetails } from './RouteDetails';
import { TravelModeSelector } from './TravelModeSelector';
import type { RouteResult, TravelMode } from './routeTypes';
import { openExternalMaps } from './externalMaps';
import { NearbyStops } from '../transit/NearbyStops';
import type { TransitStop } from '../transit/transitTypes';
import {
    EMPTY_MAP_SETTINGS,
    type SavedMapSettings,
} from './mapTypes';

import {
    planGoJourney,
    type GoJourney,
} from '../transit/goJourneyPlanner';

import {
    planDrtJourney,
    type DrtJourney,
} from '../transit/drtJourneyPlanner';

// The Baloo font sits a little high in its line on iPhone, so the text is nudged down to the middle
const TEXT_NUDGE = Platform.OS === 'ios' ? 3 : 0;

const INITIAL_REGION = {
    latitude: 43.9455,
    longitude: -78.8968,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

type MapCardProps = {
    initialSettings?: SavedMapSettings;
    onSaveSettings?: (settings: SavedMapSettings) => Promise<void>;
    accentColor?: string; // button and route-line colour (defaults to the theme's brown)
};

export function MapCard({
    initialSettings = EMPTY_MAP_SETTINGS,
    onSaveSettings,
    accentColor = colors.otherText,
}: MapCardProps) {
    const mapRef = useRef<MapView>(null);
    const requestId = useRef(0);

    const [origin, setOrigin] = useState<MapLocation | null>(null);
    const [destination, setDestination] =
        useState<MapLocation | null>(initialSettings.destination);

    const [travelMode, setTravelMode] =
        useState<TravelMode>(initialSettings.travelMode);

    const [route, setRoute] = useState<RouteResult | null>(null);
    const [transitStops, setTransitStops] = useState<TransitStop[]>([]);

    const [selectedTransitStopId, setSelectedTransitStopId] =
        useState<string | null>(null);

    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState('');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [mapSaving, setMapSaving] = useState(false);

    const [goJourneys, setGoJourneys] = useState<GoJourney[]>([]);
    const [drtJourneys, setDrtJourneys] = useState<DrtJourney[]>([]);
    const [goRouteLoading, setGoRouteLoading] = useState(false);
    const [goRouteError, setGoRouteError] = useState('');

    function clearRoute() {
        // Ignore results from any older in-flight request.
        requestId.current += 1;
        setRoute(null);
        setRouteError('');
        setRouteLoading(false);
        setGoJourneys([]);
        setDrtJourneys([]);
        setGoRouteError('');
        setGoRouteLoading(false);
    }

    function handleOriginChange(location: MapLocation) {
        clearRoute();
        setOrigin(location);
        mapRef.current?.animateToRegion({
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
        });
    }

    function handleDestinationChange(location: MapLocation) {
        clearRoute();
        setDestination(location);
    }

    function handleTravelModeChange(mode: TravelMode) {
        clearRoute();
        setTravelMode(mode);
    }

    async function handleUseGPS() {
        if (gpsLoading) return;

        setGpsLoading(true);

        try {
            const location = await getCurrentLocation();
            handleOriginChange(location);
        } catch {
            Alert.alert(
                'Location unavailable',
                'Enable location permissions or enter a starting address.',
            );
        } finally {
            setGpsLoading(false);
        }
    }

    async function handleFindRoute() {
        if (!origin || !destination || routeLoading) return;

        const currentRequest = ++requestId.current;

        setRouteLoading(true);
        setRouteError('');
        setRoute(null);

        try {
            const result = await getRoute(
                origin,
                destination,
                travelMode,
            );

            if (currentRequest !== requestId.current) return;

            if (!result.coordinates || result.coordinates.length < 2) {
                throw new Error('No valid route coordinates returned.');
            }

            setRoute(result);

            // Wait until React has rendered the route.
            requestAnimationFrame(() => {
                if (currentRequest !== requestId.current) return;

                mapRef.current?.fitToCoordinates(result.coordinates, {
                    edgePadding: {
                        top: 60,
                        right: 40,
                        bottom: 60,
                        left: 40,
                    },
                    animated: true,
                });
            });
        } catch (error) {
            if (currentRequest !== requestId.current) return;

            console.error('Route calculation failed:', error);

            setRouteError(
                error instanceof Error
                    ? error.message
                    : 'Unable to calculate route.',
            );
        } finally {
            if (currentRequest === requestId.current) {
                setRouteLoading(false);
            }
        }
    }



    async function handleFindTransitRoute() {
        if (!origin || !destination || goRouteLoading) return;

        const currentRequest = ++requestId.current;

        setGoRouteLoading(true);
        setGoRouteError('');
        setGoJourneys([]);
        setDrtJourneys([]);

        try {
            const results = await Promise.allSettled([
                planGoJourney(origin, destination),
                planDrtJourney(origin, destination),
            ]);

            if (currentRequest !== requestId.current) return;

            const [goResult, drtResult] = results;

            const go = goResult.status === 'fulfilled'
                ? goResult.value
                : [];

            const drt = drtResult.status === 'fulfilled'
                ? drtResult.value
                : [];

            setGoJourneys(go);
            setDrtJourneys(drt);

            if (goResult.status === 'rejected') {
                console.error('GO journey planning failed:', goResult.reason);
            }

            if (drtResult.status === 'rejected') {
                console.error('DRT journey planning failed:', drtResult.reason);
            }

            if (go.length === 0 && drt.length === 0) {
                setGoRouteError(
                    goResult.status === 'rejected' ||
                        drtResult.status === 'rejected'
                        ? 'Unable to complete all transit searches. Please try again.'
                        : 'No scheduled DRT or direct GO journeys found between these locations.'
                );
            }
        } catch (error) {
            if (currentRequest !== requestId.current) return;

            console.error('Transit journey planning failed:', error);
            setGoRouteError('Unable to find transit journeys.');
        } finally {
            if (currentRequest === requestId.current) {
                setGoRouteLoading(false);
            }
        }
    }


    async function handleOpenExternalMaps() {
        if (!destination) return;

        try {
            await openExternalMaps(destination, travelMode);
        } catch {
            Alert.alert(
                'Unable to open Maps',
                'Please check that a compatible maps application is available.',
            );
        }
    }


    async function handleSaveMapSettings() {
        if (!destination || !onSaveSettings || mapSaving) return;

        setMapSaving(true);

        try {
            await onSaveSettings({
                enabled: true,
                destination,
                travelMode,
            });

            Alert.alert(
                'Saved!',
                'Your destination and travel preference have been saved.',
            );
        } catch (error) {
            console.error('Failed to save map settings:', error);

            Alert.alert(
                'Save failed',
                'Unable to save your map settings.',
            );
        } finally {
            setMapSaving(false);
        }
    }


    return (
        <View style={styles.container}>
            <Text style={styles.title}>YOUR ROUTE</Text>

            <LocationPicker
                title="Starting Location"
                value={origin}
                onSelect={handleOriginChange}
                onUseGPS={handleUseGPS}
                gpsLoading={gpsLoading}
                accentColor={accentColor}
            />

            <LocationPicker
                title="Destination"
                value={destination}
                onSelect={handleDestinationChange}
            />

            <TravelModeSelector
                value={travelMode}
                onChange={handleTravelModeChange}
                accentColor={accentColor}
            />

            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: accentColor },
                    (!origin || !destination || routeLoading) &&
                    styles.disabledButton,
                    pressed && styles.pressed,
                ]}
                onPress={handleFindRoute}
                disabled={!origin || !destination || routeLoading}
            >
                {routeLoading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color={colors.buttonText} />
                        <Text style={styles.buttonText}>
                            CALCULATING ROUTE...
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.buttonText}>FIND ROUTE</Text>
                )}
            </Pressable>

            {/* Find transit route: same brown as the other buttons, faded until both places are entered */}
            <Pressable
                style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: accentColor },
                    (!origin || !destination || goRouteLoading) &&
                    styles.disabledButton,
                    pressed && styles.pressed,
                ]}
                onPress={handleFindTransitRoute}
                disabled={!origin || !destination || goRouteLoading}
            >
                {goRouteLoading ? (
                    <ActivityIndicator color={colors.buttonText} />
                ) : (
                    <Text style={styles.buttonText}>
                        FIND TRANSIT ROUTE
                    </Text>
                )}
            </Pressable>
            {!!goRouteError && (
                <Text style={styles.error}>{goRouteError}</Text>
            )}

            {goJourneys.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.title}>GO TRANSIT JOURNEYS</Text>

                    {goJourneys.map((journey) => (
                        <View
                            key={`${journey.route.tripId}-${journey.originStop.id}-${journey.destinationStop.id}`}
                            style={{
                                padding: 12,
                                marginBottom: 10,
                                borderRadius: 10,
                                backgroundColor: '#F1F5F9',
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                                {journey.route.transitType === 'train' ? '🚆' : '🚌'}{' '}
                                GO {journey.route.route}
                            </Text>

                            <Text>
                                From: {journey.originStop.name}
                            </Text>

                            <Text>
                                To: {journey.destinationStop.name}
                            </Text>

                            <Text>
                                Departure:{' '}
                                {new Date(
                                    journey.route.scheduledDeparture
                                ).toLocaleTimeString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </Text>

                            <Text>
                                Arrival:{' '}
                                {new Date(
                                    journey.route.scheduledArrival
                                ).toLocaleTimeString('en-CA', {
                                    timeZone: 'America/Toronto',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </Text>

                            <Text>
                                Transit duration: {journey.route.durationMinutes} min
                            </Text>

                            <Text>
                                Approximate straight-line access distance:{' '}
                                {Math.round(journey.walkingDistanceMeters)} m
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {drtJourneys.length > 0 && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.title}>DRT JOURNEYS</Text>

                    {drtJourneys.map((journey) => (
                        <View
                            key={`${journey.route.firstTripId}-${journey.route.secondTripId ?? 'direct'}-${journey.originStop.id}-${journey.destinationStop.id}`}
                            style={{
                                padding: 12,
                                marginBottom: 10,
                                borderRadius: 10,
                                backgroundColor: '#EFF6FF',
                            }}
                        >
                            <Text style={{ fontWeight: 'bold', fontSize: 16 }}>
                                🚌 DRT {journey.route.firstRoute}
                                {journey.route.secondRoute
                                    ? ` → ${journey.route.secondRoute}`
                                    : ''}
                            </Text>

                            <Text>
                                {journey.route.transferCount === 0
                                    ? 'Direct bus'
                                    : '1 transfer'}
                            </Text>

                            <Text>From: {journey.originStop.name}</Text>
                            <Text>To: {journey.destinationStop.name}</Text>

                            <Text>
                                Departure:{' '}
                                {new Date(journey.route.departureTime).toLocaleTimeString(
                                    'en-CA',
                                    {
                                        timeZone: 'America/Toronto',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }
                                )}
                            </Text>

                            {journey.route.transferStopId && (
                                <>
                                    <Text>
                                        Transfer at stop: {journey.route.transferStopId}
                                    </Text>

                                    {journey.route.transferDepartureTime && (
                                        <Text>
                                            Second bus departure:{' '}
                                            {new Date(
                                                journey.route.transferDepartureTime
                                            ).toLocaleTimeString('en-CA', {
                                                timeZone: 'America/Toronto',
                                                hour: 'numeric',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    )}
                                </>
                            )}

                            <Text>
                                Arrival:{' '}
                                {new Date(journey.route.arrivalTime).toLocaleTimeString(
                                    'en-CA',
                                    {
                                        timeZone: 'America/Toronto',
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    }
                                )}
                            </Text>

                            <Text>
                                Transit duration: {journey.route.durationMinutes} min
                            </Text>

                            <Text>
                                Approximate straight-line access distance:{' '}
                                {Math.round(journey.walkingDistanceMeters)} m
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {destination && (
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        styles.outlineButton,
                        { borderColor: accentColor },
                        pressed && styles.pressed,
                    ]}
                    onPress={handleOpenExternalMaps}
                >
                    <Text style={[styles.buttonText, { color: accentColor }]}>
                        TAKE ME TO MAPS
                    </Text>
                </Pressable>
            )}


            {onSaveSettings && destination && (
                <Pressable
                    style={({ pressed }) => [
                        styles.button,
                        { backgroundColor: accentColor },
                        mapSaving && styles.disabledButton,
                        pressed && styles.pressed,
                    ]}
                    onPress={handleSaveMapSettings}
                    disabled={mapSaving}
                >
                    {mapSaving ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color={colors.buttonText} />
                            <Text style={styles.buttonText}>SAVING...</Text>
                        </View>
                    ) : (
                        <Text style={styles.buttonText}>SAVE MAP SETTINGS</Text>
                    )}
                </Pressable>
            )}


            {!!routeError && (
                <Text style={styles.error}>{routeError}</Text>
            )}

            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={INITIAL_REGION}
            >
                {origin && (
                    <Marker
                        coordinate={origin}
                        title="Starting Location"
                        description={origin.label}
                        pinColor="green"
                    />
                )}

                {destination && (
                    <Marker
                        coordinate={destination}
                        title="Destination"
                        description={destination.label}
                        pinColor="red"
                    />
                )}
                {/* marker code */}
                {transitStops.map((stop) => (
                    <Marker
                        key={`${stop.agency}-${stop.id}`}
                        coordinate={{
                            latitude: stop.latitude,
                            longitude: stop.longitude,
                        }}
                        title={stop.name}
                        description={`${stop.agency} ${stop.transitType === 'train' ? 'Train Station' : 'Bus Stop'
                            }`}
                        pinColor={
                            stop.agency === 'DRT'
                                ? '#3578C8'
                                : stop.transitType === 'train'
                                    ? '#8B5CF6'
                                    : '#16A34A'
                        }
                        onPress={() => setSelectedTransitStopId(stop.id)}
                    />
                ))}

                {route && (
                    <Polyline
                        coordinates={route.coordinates}
                        strokeColor={accentColor}
                        strokeWidth={5}
                    />
                )}
            </MapView>

            {route && <RouteDetails route={route} />}
            <NearbyStops
                searchLocation={origin}
                onStopsFound={setTransitStops}
                selectedStopId={selectedTransitStopId}
                onSelectStop={setSelectedTransitStopId}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 16,
        borderRadius: 20,
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#222',
    },
    map: {
        width: '100%',
        height: 300,
        borderRadius: 12,
        marginTop: 12,
    },
    // every button on the card: rounded, same shape
    button: {
        borderRadius: 24,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 2,
    },
    disabledButton: {
        opacity: 0.5,
    },
    pressed: {
        transform: [{ scale: 0.97 }],
    },
    buttonText: {
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
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    error: {
        color: '#B00020',
        marginTop: 10,
    },
});