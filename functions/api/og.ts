import satori, { init } from 'satori/standalone';
import { initWasm, Resvg } from '@resvg/resvg-wasm';
// @ts-ignore — wrangler resolves WASM imports
import resvgWasm from '@resvg/resvg-wasm/index_bg.wasm';
// @ts-ignore — wrangler resolves WASM imports
import yogaWasm from 'satori/yoga.wasm';

let initialized = false;
let fontCache: ArrayBuffer | null = null;

const WEATHER_CONDITIONS: Record<number, string> = {
	0: 'Cielo despejado', 1: 'Mayormente despejado',
	2: 'Parcialmente nublado', 3: 'Nublado',
	45: 'Niebla', 48: 'Niebla helada',
	51: 'Llovizna ligera', 53: 'Llovizna moderada', 55: 'Llovizna densa',
	61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia fuerte',
	71: 'Nevada ligera', 73: 'Nevada moderada', 75: 'Nevada fuerte',
	80: 'Chubascos ligeros', 81: 'Chubascos moderados', 82: 'Chubascos fuertes',
	95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo fuerte',
};

const WEATHER_ICONS: Record<number, string> = {
	0: '\u2600\uFE0F', 1: '\uD83C\uDF24\uFE0F', 2: '\u26C5', 3: '\u2601\uFE0F',
	45: '\uD83C\uDF2B\uFE0F', 48: '\uD83C\uDF2B\uFE0F',
	51: '\uD83C\uDF26\uFE0F', 53: '\uD83C\uDF26\uFE0F', 55: '\uD83C\uDF27\uFE0F',
	61: '\uD83C\uDF27\uFE0F', 63: '\uD83C\uDF27\uFE0F', 65: '\uD83C\uDF27\uFE0F',
	71: '\uD83C\uDF28\uFE0F', 73: '\uD83C\uDF28\uFE0F', 75: '\u2744\uFE0F',
	80: '\uD83C\uDF26\uFE0F', 81: '\uD83C\uDF27\uFE0F', 82: '\u26C8\uFE0F',
	95: '\u26C8\uFE0F', 96: '\u26C8\uFE0F', 99: '\u26C8\uFE0F',
};

async function getFont(): Promise<ArrayBuffer> {
	if (fontCache) return fontCache;
	// Fetch CSS to get the current font URL (Google changes URLs over time)
	const cssRes = await fetch(
		'https://fonts.googleapis.com/css2?family=Inter:wght@400',
		{ headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OGBot/1.0)' } }
	);
	const css = await cssRes.text();
	const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
	if (!match) throw new Error('Font URL not found');
	const fontRes = await fetch(match[1]);
	fontCache = await fontRes.arrayBuffer();
	return fontCache;
}

async function ensureInit() {
	if (initialized) return;
	await init(yogaWasm);
	await initWasm(resvgWasm);
	initialized = true;
}

interface WeatherApiResponse {
	hourly: { temperature_2m: number[]; weathercode: number[] };
	daily: {
		sunrise: string[]; sunset: string[];
		temperature_2m_max: number[]; temperature_2m_min: number[];
	};
}

export const onRequest: PagesFunction = async (context) => {
	const url = new URL(context.request.url);
	const lat = url.searchParams.get('lat') || '40.6003';
	const lon = url.searchParams.get('lon') || '-3.7103';
	const city = decodeURIComponent(url.searchParams.get('city') || 'Tres Cantos');

	const [weatherRes, fontData] = await Promise.all([
		fetch(
			`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
			`&hourly=temperature_2m,weathercode&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min` +
			`&forecast_days=1&timezone=auto`
		),
		getFont(),
	]);
	const weather: WeatherApiResponse = await weatherRes.json();

	const hourIndex = Math.min(new Date().getHours(), weather.hourly.temperature_2m.length - 1);
	const temp = Math.round(weather.hourly.temperature_2m[hourIndex]);
	const weatherCode = weather.hourly.weathercode[hourIndex] ?? 0;
	const maxTemp = Math.round(weather.daily.temperature_2m_max[0]);
	const minTemp = Math.round(weather.daily.temperature_2m_min[0]);
	const sunrise = weather.daily.sunrise[0]?.slice(11) || '07:00';
	const sunset = weather.daily.sunset[0]?.slice(11) || '21:00';
	const condition = WEATHER_CONDITIONS[weatherCode] || 'Desconocido';

	await ensureInit();

	const svg = await satori(
		{
			type: 'div',
			props: {
				style: {
					width: '100%', height: '100%', display: 'flex',
					flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
					background: 'linear-gradient(135deg, #0f1729 0%, #1a1a3e 50%, #2d1b4e 100%)',
					color: 'white', fontFamily: 'Inter', padding: '40px',
				},
				children: [
					{
						type: 'div',
						props: {
							style: { fontSize: '30px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', letterSpacing: '2px' },
							children: city.toUpperCase(),
						},
					},
					{
						type: 'div',
						props: {
							style: { fontSize: '160px', fontWeight: 700, letterSpacing: '-6px', lineHeight: '1' },
							children: `${temp}\u00B0`,
						},
					},
					{
						type: 'div',
						props: {
							style: { fontSize: '32px', color: 'rgba(255,255,255,0.6)', marginTop: '8px', marginBottom: '36px' },
							children: condition,
						},
					},
					{
						type: 'div',
						props: {
							style: { display: 'flex', gap: '48px', fontSize: '22px' },
							children: [
								{ type: 'span', props: { children: `Max ${maxTemp}\u00B0`, style: { color: 'rgba(255,214,10,0.8)' } } },
								{ type: 'span', props: { children: `Min ${minTemp}\u00B0`, style: { color: 'rgba(90,200,250,0.8)' } } },
								{ type: 'span', props: { children: sunrise, style: { color: 'rgba(255,180,50,0.7)' } } },
								{ type: 'span', props: { children: '\u2013', style: { color: 'rgba(255,255,255,0.3)' } } },
								{ type: 'span', props: { children: sunset, style: { color: 'rgba(140,100,220,0.7)' } } },
							],
						},
					},
					{
						type: 'div',
						props: {
							style: { fontSize: '16px', color: 'rgba(255,255,255,0.2)', marginTop: '40px', letterSpacing: '3px' },
							children: 'PERFECT WEATHER',
						},
					},
				],
			},
		},
		{
			width: 1200,
			height: 630,
			fonts: [{ name: 'Inter', data: fontData, weight: 400, style: 'normal' as const }],
		}
	);

	const resvg = new Resvg(svg, { fitTo: { mode: 'width' as const, value: 1200 } });
	const png = resvg.render().asPng();

	return new Response(png, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=1800, s-maxage=3600',
		},
	});
};
