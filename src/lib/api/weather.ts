const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/reverse';
const MADRID = { lat: 40.4168, lon: -3.7038 };

export interface HourlyData {
	time: string[];
	temperature_2m: number[];
	apparent_temperature: number[];
	precipitation_probability: number[];
	weathercode: number[];
}

export interface WeatherResponse {
	hourly: HourlyData;
	timezone: string;
}

export interface Coords {
	lat: number;
	lon: number;
}

export async function getLocation(): Promise<Coords> {
	// Allow URL params: ?lat=40.41&lon=-3.70
	if (typeof window !== 'undefined') {
		const params = new URLSearchParams(window.location.search);
		if (params.has('lat') && params.has('lon')) {
			return { lat: parseFloat(params.get('lat')!), lon: parseFloat(params.get('lon')!) };
		}
	}

	return new Promise((resolve) => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			resolve(MADRID);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
			() => resolve(MADRID),
			{ timeout: 5000, maximumAge: 300000 }
		);
	});
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResponse> {
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		hourly: 'temperature_2m,apparent_temperature,precipitation_probability,weathercode',
		models: 'meteofrance_seamless',
		forecast_days: '7',
		timezone: 'auto'
	});

	const res = await fetch(`${API_BASE}?${params}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json();
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
	try {
		const res = await fetch(`${GEOCODE_BASE}?latitude=${lat}&longitude=${lon}&count=1`);
		const data = await res.json();
		return data.results?.[0]?.name ?? null;
	} catch {
		return null;
	}
}
