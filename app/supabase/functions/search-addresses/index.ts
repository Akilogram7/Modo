
type AddressRequest = {
    query: string;
};

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
        const body = await request.json() as AddressRequest;

        if (
            typeof body?.query !== 'string' ||
            body.query.trim().length < 3 ||
            body.query.trim().length > 150
        ) {
            return jsonResponse(
                { error: 'Invalid search query' },
                400,
            );
        }

        const query = body.query.trim();

        // Temporary response to verify the Edge Function.
        // We'll connect an approved geocoding provider next.

        const apiKey = Deno.env.get('ORS_API_KEY');

        if (!apiKey) {
            return jsonResponse(
                { error: 'Geocoding API key is not configured' },
                500,
            );
        }

        const params = new URLSearchParams({
            text: query,
            size: '5',
            'focus.point.lat': '43.9455',
            'focus.point.lon': '-78.8968',
        });

        const response = await fetch(
            `https://api.openrouteservice.org/geocode/autocomplete?${params.toString()}`,
            {
                headers: {
                    Authorization: apiKey,
                    Accept: 'application/json',
                },
            },
        );

        if (!response.ok) {
            console.error('Geocoding provider error:', {
                status: response.status,
            });

            return jsonResponse(
                {
                    error: 'Unable to search addresses',
                    providerStatus: response.status,
                },
                502,
            );
        }

        const data = await response.json();

        return jsonResponse({
            features: data.features ?? [],
        });

    } catch (error) {
        console.error('Address search error:', error);

        return jsonResponse(
            { error: 'Unable to process address search' },
            500,
        );
    }
});
