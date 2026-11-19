import { Linking, Platform } from 'react-native';

import type { MapLocation } from '../location/locationService';
import type { TravelMode } from './routeTypes';

export async function openExternalMaps(
  destination: MapLocation,
  travelMode: TravelMode,
) {
  const latitude = destination.latitude;
  const longitude = destination.longitude;

  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?daddr=${latitude},${longitude}&dirflg=${
          travelMode === 'walking' ? 'w' : 'd'
        }`
      : `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=${travelMode}`;

  await Linking.openURL(url);
}
