
import { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

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

const INITIAL_REGION = {
    latitude: 43.9455,
    longitude: -78.8968,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
};

type MapCardProps = {
    initialSettings?: SavedMapSettings;
    onSaveSettings?: (settings: SavedMapSettings) => Promise<void>;
};

export function MapCard({
    initialSettings = EMPTY_MAP_SETTINGS,
    onSaveSettings,
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

    function clearRoute() {
        // Ignore results from any older in-flight request.
        requestId.current += 1;
        setRoute(null);
        setRouteError('');
        setRouteLoading(false);
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
            />

            <LocationPicker
                title="Destination"
                value={destination}
                onSelect={handleDestinationChange}
            />

            <TravelModeSelector
                value={travelMode}
                onChange={handleTravelModeChange}
            />

            <Pressable
                style={[
                    styles.routeButton,
                    (!origin || !destination || routeLoading) &&
                    styles.disabledButton,
                ]}
                onPress={handleFindRoute}
                disabled={!origin || !destination || routeLoading}
            >
                {routeLoading ? (
                    <View style={styles.loadingRow}>
                        <ActivityIndicator color="#FFF" />
                        <Text style={styles.buttonText}>
                            CALCULATING ROUTE...
                        </Text>
                    </View>
                ) : (
                    <Text style={styles.buttonText}>FIND ROUTE</Text>
                )}
            </Pressable>
            {destination && (
                <Pressable
                    style={styles.externalMapsButton}
                    onPress={handleOpenExternalMaps}
                >
                    <Text style={styles.buttonText}>TAKE ME TO MAPS</Text>
                </Pressable>
            )}


            {onSaveSettings && destination && (
                <Pressable
                    style={[
                        styles.saveMapButton,
                        mapSaving && styles.disabledButton,
                    ]}
                    onPress={handleSaveMapSettings}
                    disabled={mapSaving}
                >
                    {mapSaving ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator color="#FFFFFF" />
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
                        strokeColor="#3578C8"
                        strokeWidth={5}
                    />
                )}
            </MapView>

            {route && <RouteDetails route={route} />}
            <NearbyStops
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
    routeButton: {
        backgroundColor: '#3578C8',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#FFF',
        fontWeight: 'bold',
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
    externalMapsButton: {
        backgroundColor: '#25835A',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    saveMapButton: {
        backgroundColor: '#256344',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginTop: 10,
    },
});
