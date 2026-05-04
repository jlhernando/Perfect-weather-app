interface Env {
	AEMET_API_KEY: string;
}

interface AemetObservation {
	idema: string;
	ubi: string;
	lat: number;
	lon: number;
	ta: number;
	prec: number;
	hr: number;
	vv: number;
	dv: number;
	tamax: number;
	tamin: number;
	fint: string;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const url = new URL(context.request.url);
	const lat = parseFloat(url.searchParams.get('lat') || '');
	const lon = parseFloat(url.searchParams.get('lon') || '');

	if (isNaN(lat) || isNaN(lon)) {
		return new Response(JSON.stringify({ error: 'lat and lon required' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const apiKey = context.env.AEMET_API_KEY;
	if (!apiKey) {
		return new Response(JSON.stringify({ error: 'AEMET API key not configured' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		// Step 1: Get the data URL from AEMET
		const metaRes = await fetch(
			`https://opendata.aemet.es/opendata/api/observacion/convencional/todas?api_key=${apiKey}`
		);
		const meta = (await metaRes.json()) as { estado: number; datos?: string };
		if (meta.estado !== 200 || !meta.datos) {
			return new Response(JSON.stringify({ error: 'AEMET API error', details: meta }), {
				status: 502,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Step 2: Fetch actual observation data (AEMET returns ISO-8859-15 encoding)
		const dataRes = await fetch(meta.datos);
		const rawBytes = await dataRes.arrayBuffer();
		const decodedText = new TextDecoder('iso-8859-15').decode(rawBytes);
		const observations = JSON.parse(decodedText) as AemetObservation[];

		// Step 3: Find the most recent observation from the nearest station
		let bestStation: AemetObservation | null = null;
		let bestDistance = Infinity;

		// Group by station, pick latest observation per station
		const latestByStation = new Map<string, AemetObservation>();
		for (const obs of observations) {
			if (obs.ta == null || obs.lat == null || obs.lon == null) continue;
			const existing = latestByStation.get(obs.idema);
			if (!existing || obs.fint > existing.fint) {
				latestByStation.set(obs.idema, obs);
			}
		}

		// Find nearest station
		for (const obs of latestByStation.values()) {
			const dist = haversineDistance(lat, lon, obs.lat, obs.lon);
			if (dist < bestDistance) {
				bestDistance = dist;
				bestStation = obs;
			}
		}

		if (!bestStation) {
			return new Response(JSON.stringify({ error: 'No stations found nearby' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Collect all hourly observations for the nearest station (sorted by time)
		const stationHistory = observations
			.filter((obs) => obs.idema === bestStation!.idema && obs.ta != null)
			.sort((a, b) => a.fint.localeCompare(b.fint))
			.map((obs) => ({
				time: obs.fint,
				temperature: obs.ta,
				precipitation: obs.prec,
			}));

		return new Response(
			JSON.stringify({
				station: bestStation.ubi,
				stationId: bestStation.idema,
				distance: Math.round(bestDistance * 10) / 10,
				timestamp: bestStation.fint,
				temperature: bestStation.ta,
				precipitation: bestStation.prec,
				humidity: bestStation.hr,
				windSpeed: bestStation.vv,
				windDirection: bestStation.dv,
				tempMax: bestStation.tamax,
				tempMin: bestStation.tamin,
				hourly: stationHistory,
			}),
			{
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'public, max-age=600',
					'Access-Control-Allow-Origin': '*',
				},
			}
		);
	} catch (e) {
		return new Response(
			JSON.stringify({ error: 'Failed to fetch AEMET data', message: String(e) }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
