const BOT_AGENTS = [
	'twitterbot', 'facebookexternalhit', 'linkedinbot',
	'slackbot', 'telegrambot', 'discordbot', 'whatsapp',
	'googlebot', 'bingbot', 'yandexbot',
];

function isBot(ua: string): boolean {
	const lower = ua.toLowerCase();
	return BOT_AGENTS.some((bot) => lower.includes(bot));
}

async function getCityName(lat: string, lon: string): Promise<string> {
	try {
		const res = await fetch(
			`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&count=1`
		);
		const data: any = await res.json();
		if (data.results?.[0]?.name) return data.results[0].name;
	} catch {}
	return 'Tres Cantos';
}

async function getWeatherSummary(lat: string, lon: string): Promise<{ temp: number; condition: string }> {
	try {
		const res = await fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
			`&hourly=temperature_2m,weathercode&forecast_days=1&timezone=auto`
		);
		const data: any = await res.json();
		const localNow = new Date(Date.now() + (data.utc_offset_seconds ?? 0) * 1000);
		const hour = Math.min(localNow.getUTCHours(), data.hourly.temperature_2m.length - 1);
		const conditions: Record<number, string> = {
			0: 'Cielo despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
			45: 'Niebla', 51: 'Llovizna', 61: 'Lluvia', 65: 'Lluvia fuerte',
			71: 'Nevada', 80: 'Chubascos', 95: 'Tormenta',
		};
		return {
			temp: Math.round(data.hourly.temperature_2m[hour]),
			condition: conditions[data.hourly.weathercode[hour]] || 'Clima actual',
		};
	} catch {
		return { temp: 0, condition: 'Clima actual' };
	}
}

export const onRequest: PagesFunction = async (context) => {
	const response = await context.next();

	const ua = context.request.headers.get('user-agent') || '';
	if (!isBot(ua)) return response;

	const contentType = response.headers.get('content-type') || '';
	if (!contentType.includes('text/html')) return response;

	const url = new URL(context.request.url);
	const lat = url.searchParams.get('lat') || '40.6003';
	const lon = url.searchParams.get('lon') || '-3.7103';

	const [city, weather] = await Promise.all([
		getCityName(lat, lon),
		getWeatherSummary(lat, lon),
	]);

	const ogImageUrl = `${url.origin}/api/og?lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`;
	const title = `${weather.temp}\u00B0C en ${city}`;
	const description = `${weather.condition} \u00B7 Perfect Weather`;

	const ogTags = [
		`<meta property="og:title" content="${title}" />`,
		`<meta property="og:description" content="${description}" />`,
		`<meta property="og:image" content="${ogImageUrl}" />`,
		`<meta property="og:image:width" content="1200" />`,
		`<meta property="og:image:height" content="630" />`,
		`<meta property="og:type" content="website" />`,
		`<meta name="twitter:card" content="summary_large_image" />`,
		`<meta name="twitter:title" content="${title}" />`,
		`<meta name="twitter:description" content="${description}" />`,
		`<meta name="twitter:image" content="${ogImageUrl}" />`,
	].join('\n    ');

	let html = await response.text();
	// Remove static OG tags before injecting dynamic ones
	html = html.replace(/<meta property="og:[^"]*"[^>]*\/?\s*>/g, '');
	html = html.replace(/<meta name="twitter:[^"]*"[^>]*\/?\s*>/g, '');
	html = html.replace('</head>', `    ${ogTags}\n  </head>`);

	return new Response(html, {
		headers: {
			...Object.fromEntries(response.headers),
			'content-type': 'text/html; charset=utf-8',
		},
	});
};
