
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getWeather, getWeatherCondition } from './weatherService';
import type { WeatherData } from './weatherTypes';
import { CityPicker } from './CityPicker';
import type { CityResult } from './cityService';
import {
    loadWeatherLocation,
    saveWeatherLocation,
    clearWeatherLocation,
} from './weatherPreferences';
import {
    getWeatherLocation,
    type WeatherLocation,
} from './locationService';


export function WeatherCard() {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshCount, setRefreshCount] = useState(0);
    const [locationLabel, setLocationLabel] = useState('Finding location...');
    const [pickerVisible, setPickerVisible] = useState(false);
    const [selectedLocation, setSelectedLocation] =
        useState<WeatherLocation | null>(null);
    const [locationReady, setLocationReady] = useState(false);

    //load the saved location from async storage when the component mounts
    useEffect(() => {
        let active = true;

        async function initializeLocation() {
            try {
                const savedLocation = await loadWeatherLocation();

                if (active) {
                    setSelectedLocation(savedLocation);
                }
            } catch (error) {
                console.error('Unable to load weather preferences:', error);
            } finally {
                if (active) {
                    setLocationReady(true);
                }
            }
        }

        initializeLocation();

        return () => {
            active = false;
        };
    }, []);
    //uses coordinates for preexisting locations instead of getting the current location again
    useEffect(() => {
        if (!locationReady) return;

        let active = true;

        async function loadWeather() {
            setLoading(true);
            setError(null);

            try {
                const location =
                    selectedLocation ?? (await getWeatherLocation());

                if (!active) return;

                const result = await getWeather(
                    location.latitude,
                    location.longitude,
                );

                if (active) {
                    setWeather(result);
                    setLocationLabel(location.label);
                }
            } catch (error) {
                console.error('Failed to fetch weather:', error);

                if (active) {
                    setError('Unable to load weather.');
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadWeather();

        return () => {
            active = false;
        };
    }, [selectedLocation, locationReady, refreshCount]);

    async function handleSelectCity(city: CityResult) {
        const location: WeatherLocation = {
            latitude: city.latitude,
            longitude: city.longitude,
            label: `${city.name}, ${city.country}`,
        };

        setPickerVisible(false);
        setSelectedLocation(location);

        try {
            await saveWeatherLocation(location);
        } catch (error) {
            console.error('Unable to save selected city:', error);
        }
    }


    async function handleUseCurrentLocation() {
        try {
            // Require a real GPS result when the user explicitly selects GPS.
            const location = await getWeatherLocation(false);

            await clearWeatherLocation();

            setSelectedLocation(location);
            setPickerVisible(false);
            setRefreshCount((count) => count + 1);
        } catch (error) {
            console.error('Unable to use current location:', error);

            Alert.alert(
                'Location unavailable',
                'Please allow location access in your device settings, or choose a city manually.',
            );
        }
    }


    const condition = weather
        ? getWeatherCondition(weather.weatherCode)
        : null;

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.heading}>CURRENT WEATHER</Text>

                <Pressable
                    onPress={() => setRefreshCount((count) => count + 1)}
                    disabled={loading}
                    accessibilityRole="button"
                    accessibilityLabel="Refresh weather"
                >
                    <Ionicons name="refresh" size={21} color="#256344" />
                </Pressable>
            </View>

            {loading ? (
                <ActivityIndicator color="#256344" size="large" />
            ) : error ? (
                <Text style={styles.error}>{error}</Text>
            ) : weather && condition ? (
                <>
                    <View style={styles.mainWeather}>
                        <Ionicons
                            name={condition.icon as keyof typeof Ionicons.glyphMap}
                            size={46}
                            color="#256344"
                        />

                        <View>
                            <Text style={styles.temperature}>
                                {Math.round(weather.temperature)}°C
                            </Text>

                            <Text style={styles.condition}>
                                {condition.description}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.details}>
                        <View style={styles.detail}>
                            <Text style={styles.detailLabel}>FEELS LIKE</Text>
                            <Text style={styles.detailValue}>
                                {Math.round(weather.feelsLike)}°C
                            </Text>
                        </View>

                        <View style={styles.detail}>
                            <Text style={styles.detailLabel}>RAIN CHANCE</Text>
                            <Text style={styles.detailValue}>
                                {weather.precipitationProbability}%
                            </Text>
                        </View>

                        <View style={styles.detail}>
                            <Text style={styles.detailLabel}>WIND</Text>
                            <Text style={styles.detailValue}>
                                {Math.round(weather.windSpeed)} km/h
                            </Text>
                        </View>
                    </View>

                    <Pressable
                        onPress={() => setPickerVisible(true)}
                        style={styles.locationButton}
                        accessibilityRole="button"
                        accessibilityLabel="Change weather location"
                    >
                        <Ionicons
                            name="location-outline"
                            size={16}
                            color="#256344"
                        />

                        <Text style={styles.location}>
                            {locationLabel}
                        </Text>

                        <Ionicons
                            name="chevron-down"
                            size={16}
                            color="#256344"
                        />
                    </Pressable>
                </>
            ) : null}

            <CityPicker
                visible={pickerVisible}
                onClose={() => setPickerVisible(false)}
                onSelectCity={handleSelectCity}
                onUseCurrentLocation={handleUseCurrentLocation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#E5FFF1',
        borderRadius: 18,
        padding: 16,
        marginTop: 10,
        marginLeft: 46,
        minHeight: 110,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    heading: {
        fontSize: 13,
        fontWeight: '800',
        color: '#256344',
    },
    mainWeather: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginBottom: 18,
    },
    temperature: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#256344',
    },
    condition: {
        fontSize: 14,
        color: '#256344',
    },
    details: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    detail: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#477B61',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#256344',
        marginTop: 4,
    },
    location: {
        fontSize: 11,
        color: '#477B61',
        marginTop: 14,
    },
    error: {
        color: '#A52A2A',
        fontSize: 13,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
    },
});
