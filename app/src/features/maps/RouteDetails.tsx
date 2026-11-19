import { StyleSheet, Text, View } from 'react-native';

import type { RouteResult } from './routeTypes';

import { useState } from 'react';
import { Pressable } from 'react-native';

type Props = {
    route: RouteResult;
};

export function RouteDetails({ route }: Props) {
    const minutes = Math.ceil(route.durationSeconds / 60);
    const kilometres = (route.distanceMeters / 1000).toFixed(1);
    const [showDirections, setShowDirections] = useState(false);

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>ROUTE DETAILS</Text>

            <Text style={styles.summary}>
                {minutes} min • {kilometres} km
            </Text>
            
            <Pressable
                style={styles.directionsHeader}
                onPress={() => setShowDirections((previous) => !previous)}
                accessibilityRole="button"
                accessibilityState={{ expanded: showDirections }}
            >
                <Text style={styles.subheading}>
                    DIRECTIONS
                </Text>

                <Text style={styles.dropdownIcon}>
                    {showDirections ? '▲' : '▼'}
                </Text>
            </Pressable>

            {showDirections && (
                <View>
                    {route.steps.map((step, index) => (
                        <View key={index} style={styles.step}>
                            <Text style={styles.stepNumber}>
                                {index + 1}.
                            </Text>

                            <View style={styles.stepContent}>
                                <Text style={styles.instruction}>
                                    {step.instruction}
                                </Text>

                                <Text style={styles.distance}>
                                    {step.distanceMeters >= 1000
                                        ? `${(step.distanceMeters / 1000).toFixed(1)} km`
                                        : `${Math.round(step.distanceMeters)} m`}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F3F5F8',
    },
    heading: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#222',
    },
    summary: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#3578C8',
        marginVertical: 12,
    },
    subheading: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    step: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 14,
    },
    stepNumber: {
        fontWeight: 'bold',
        color: '#3578C8',
    },
    stepContent: {
        flex: 1,
    },
    instruction: {
        fontSize: 14,
        color: '#222',
    },
    distance: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    directionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    dropdownIcon: {
        fontSize: 14,
        color: '#3578C8',
        fontWeight: 'bold',
    },
});
