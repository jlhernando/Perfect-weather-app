// WMO Weather Code → emoji mapping (day)
const WMO_ICONS: Record<number, string> = {
	0: '\u2600\uFE0F',       // Clear sky
	1: '\uD83C\uDF24',       // Mainly clear
	2: '\u26C5',              // Partly cloudy
	3: '\u2601\uFE0F',       // Overcast
	45: '\uD83C\uDF2B\uFE0F', // Fog
	48: '\uD83C\uDF2B\uFE0F', // Rime fog
	51: '\uD83C\uDF26',      // Light drizzle
	53: '\uD83C\uDF26',      // Moderate drizzle
	55: '\uD83C\uDF27',      // Dense drizzle
	56: '\uD83C\uDF28',      // Freezing drizzle light
	57: '\uD83C\uDF28',      // Freezing drizzle dense
	61: '\uD83C\uDF27',      // Slight rain
	63: '\uD83C\uDF27',      // Moderate rain
	65: '\uD83C\uDF27',      // Heavy rain
	66: '\uD83C\uDF28',      // Freezing rain light
	67: '\uD83C\uDF28',      // Freezing rain heavy
	71: '\uD83C\uDF28',      // Slight snow
	73: '\uD83C\uDF28',      // Moderate snow
	75: '\u2744\uFE0F',      // Heavy snow
	77: '\u2744\uFE0F',      // Snow grains
	80: '\uD83C\uDF26',      // Slight showers
	81: '\uD83C\uDF27',      // Moderate showers
	82: '\u26C8\uFE0F',      // Violent showers
	85: '\uD83C\uDF28',      // Slight snow showers
	86: '\uD83C\uDF28',      // Heavy snow showers
	95: '\u26C8\uFE0F',      // Thunderstorm
	96: '\u26C8\uFE0F',      // Thunderstorm w/ slight hail
	99: '\u26C8\uFE0F',      // Thunderstorm w/ heavy hail
};

// Night variants — only codes that look different at night
const WMO_ICONS_NIGHT: Record<number, string> = {
	0: '\uD83C\uDF19',       // Clear sky → crescent moon
	1: '\uD83C\uDF19',       // Mainly clear → crescent moon
	2: '\u2601\uFE0F',       // Partly cloudy → cloud (no sun to show)
	80: '\uD83C\uDF27',      // Slight showers → rain (no sun peeking)
};

export function getIcon(code: number, isNight = false): string {
	if (isNight && code in WMO_ICONS_NIGHT) {
		return WMO_ICONS_NIGHT[code];
	}
	return WMO_ICONS[code] ?? '\u2601\uFE0F';
}

export function getDominantCode(codes: number[]): number {
	const priority = [99, 96, 95, 86, 85, 82, 81, 80, 75, 73, 71, 77, 67, 66, 65, 63, 61, 57, 56, 55, 53, 51, 48, 45, 3, 2, 1, 0];
	for (const p of priority) {
		if (codes.includes(p)) return p;
	}
	return codes[0] ?? 3;
}
