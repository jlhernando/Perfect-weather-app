const API_BASE = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_BASE = 'https://geocoding-api.open-meteo.com/v1/reverse';
const GEOCODE_SEARCH = 'https://geocoding-api.open-meteo.com/v1/search';
const TRES_CANTOS = { lat: 40.6003, lon: -3.7103 };

export interface HourlyData {
	time: string[];
	temperature_2m: number[];
	apparent_temperature: number[];
	precipitation: number[];
	weathercode: number[];
}

export interface DailyData {
	sunrise: string[];
	sunset: string[];
}

export interface WeatherResponse {
	hourly: HourlyData;
	daily: DailyData;
	timezone: string;
}

export interface Coords {
	lat: number;
	lon: number;
}

export interface LocationResult {
	name: string;
	admin1?: string;
	latitude: number;
	longitude: number;
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
			resolve(TRES_CANTOS);
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
			() => resolve(TRES_CANTOS),
			{ timeout: 5000, maximumAge: 300000 }
		);
	});
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResponse> {
	const params = new URLSearchParams({
		latitude: String(lat),
		longitude: String(lon),
		hourly: 'temperature_2m,apparent_temperature,precipitation,weathercode',
		daily: 'sunrise,sunset',
		models: 'best_match',
		forecast_days: '7',
		timezone: 'auto'
	});

	const res = await fetch(`${API_BASE}?${params}`);
	if (!res.ok) throw new Error(`API error: ${res.status}`);
	return res.json();
}

export async function searchLocations(query: string): Promise<LocationResult[]> {
	if (query.trim().length < 2) return [];
	try {
		const params = new URLSearchParams({
			name: query.trim(),
			count: '5',
			language: 'es',
			country_code: 'ES'
		});
		const res = await fetch(`${GEOCODE_SEARCH}?${params}`);
		const data = await res.json();
		return (data.results ?? []).map((r: any) => ({
			name: r.name,
			admin1: r.admin1,
			latitude: r.latitude,
			longitude: r.longitude
		}));
	} catch {
		return [];
	}
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
	// Try Open-Meteo reverse geocoding first
	try {
		const res = await fetch(`${GEOCODE_BASE}?latitude=${lat}&longitude=${lon}&count=1`);
		const data = await res.json();
		if (data.results?.[0]?.name) return data.results[0].name;
	} catch {}

	// Fallback: use Nominatim for reverse geocoding
	try {
		const res = await fetch(
			`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`
		);
		const data = await res.json();
		return data.address?.city ?? data.address?.town ?? data.address?.village ?? data.name ?? null;
	} catch {
		return null;
	}
}
