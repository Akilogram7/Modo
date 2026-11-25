type Coordinates = {
  latitude: number;
  longitude: number;
};

type RouteRequest = {
  origin: Coordinates;
  destination: Coordinates;
  travelMode: 'driving' | 'walking';
};

function validCoordinates(value: unknown): value is Coordinates {
  if (!value || typeof value !== 'object') return false;

  const point = value as Record<string, unknown>;

  return (
    typeof point.latitude === 'number' &&
    Number.isFinite(point.latitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    typeof point.longitude === 'number' &&
    Number.isFinite(point.longitude) &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await request.json() as RouteRequest;

    if (
      !validCoordinates(body.origin) ||
      !validCoordinates(body.destination) ||
      !['driving', 'walking'].includes(body.travelMode)
    ) {
      return jsonResponse({ error: 'Invalid route request' }, 400);
    }

    const apiKey = Deno.env.get('ORS_API_KEY');

    if (!apiKey) {
      return jsonResponse({ error: 'Routing is not configured' }, 500);
    }

    const profile =
      body.travelMode === 'walking'
        ? 'foot-walking'
        : 'driving-car';

    const response = await fetch(
      `https://api.heigit.org/openrouteservice/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/geo+json',
        },
        body: JSON.stringify({
          coordinates: [
            [body.origin.longitude, body.origin.latitude],
            [body.destination.longitude, body.destination.latitude],
          ],
          instructions: true,
        }),
      },
    );

    
const responseText = await response.text();
const contentType = response.headers.get('content-type');

console.log('ORS response:', {
  status: response.status,
  statusText: response.statusText,
  contentType,
});

if (!response.ok) {
  console.error('Routing provider error:', {
    status: response.status,
    contentType,
    body: responseText.substring(0, 500),
  });

  return jsonResponse(
    {
      error: 'Unable to calculate route',
      providerStatus: response.status,
    },
    502,
  );
}

let data;

try {
  data = JSON.parse(responseText);
} catch {
  console.error('ORS returned invalid JSON:', {
    status: response.status,
    contentType,
    body: responseText.substring(0, 500),
  });

  return jsonResponse(
    {
      error: 'Routing provider returned an invalid response',
      providerStatus: response.status,
    },
    502,
  );
}


    const feature = data.features?.[0];
    const segment = feature?.properties?.segments?.[0];

    if (!feature || !segment) {
      return jsonResponse({ error: 'No route found' }, 404);
    }

    return jsonResponse({
      distanceMeters: segment.distance,
      durationSeconds: segment.duration,
      coordinates: feature.geometry.coordinates.map(
        ([longitude, latitude]: [number, number]) => ({
          latitude,
          longitude,
        }),
      ),
      steps: segment.steps.map(
        (step: {
          instruction: string;
          distance: number;
          duration: number;
        }) => ({
          instruction: step.instruction,
          distanceMeters: step.distance,
          durationSeconds: step.duration,
        }),
      ),
    });
  } catch (error) {
    console.error('Route function error:', error);
    return jsonResponse(
      { error: 'Unexpected routing error' },
      500,
    );
  }
});
