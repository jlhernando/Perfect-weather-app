<script lang="ts">
	import { getIcon, getDominantCode } from '$lib/utils/icons';
	import AttireSuggestion from './AttireSuggestion.svelte';
	import UmbrellaIndicator from './UmbrellaIndicator.svelte';

	interface Props {
		date: Date;
		currentTemp: number | null;
		maxTemp: number | null;
		minTemp: number | null;
		weatherCodes: number[];
		locationName: string | null;
		dayOffset?: number;
		observedStation?: string | null;
		observedPrecipitation?: number | null;
		attireMaxTemp?: number | null;
		umbrellaWeatherCodes?: number[];
	}

	let { date, currentTemp, maxTemp, minTemp, weatherCodes, locationName, dayOffset = 0, observedStation = null, observedPrecipitation = null, attireMaxTemp = null, umbrellaWeatherCodes = [] }: Props = $props();

	const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
	const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

	const CONDITION_TEXT: Record<number, string> = {
		0: 'Despejado', 1: 'Mayormente despejado', 2: 'Nubes y claros', 3: 'Nublado',
		45: 'Niebla', 48: 'Niebla helada',
		51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna densa',
		61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
		71: 'Nevada ligera', 73: 'Nevada', 75: 'Nevada fuerte',
		80: 'Chubascos', 81: 'Chubascos moderados', 82: 'Chubascos fuertes',
		95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta severa',
	};

	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

	let validCodes = $derived(weatherCodes.filter((c) => c != null));

	let displayCode = $derived.by(() => {
		if (validCodes.length === 0) return 3;
		if (currentTemp != null) {
			const hour = new Date().getHours();
			let code = weatherCodes[hour];
			if (code != null) {
				if (observedPrecipitation != null && observedPrecipitation === 0 && RAIN_CODES.has(code)) {
					code = 2;
				}
				return code;
			}
		}
		return getDominantCode(validCodes);
	});

	let displayIcon = $derived(getIcon(displayCode));

	// Time of day context
	let timeOfDay = $derived.by(() => {
		const hour = new Date().getHours();
		if (dayOffset > 0) return '';
		if (hour < 7) return 'Madrugada';
		if (hour < 13) return 'Manana';
		if (hour < 20) return 'Tarde';
		return 'Noche';
	});

	let timeContext = $derived.by(() => {
		const dayName = DAY_NAMES[date.getDay()];
		const monthName = MONTH_NAMES[date.getMonth()];
		const parts = [`${dayName} ${date.getDate()} ${monthName}`];
		if (timeOfDay) parts.push(timeOfDay);
		return parts.join(' · ');
	});

</script>

<div class="story-header">
	<div class="time-context">{timeContext}</div>
</div>

{#if maxTemp != null && minTemp != null}
	<div class="temp-ambient">
		<div class="temp-number">
			{#if currentTemp != null}
				{currentTemp}&deg;
			{:else}
				{maxTemp}&deg;
			{/if}
		</div>
		<div class="temp-meta">
			<div class="condition">{displayIcon} {CONDITION_TEXT[displayCode] || ''}</div>
			<div class="range">{maxTemp}&deg; / {minTemp}&deg;</div>
		</div>
	</div>

	<div class="pills-row">
		<div class="location-pill">
			<span class="loc-dot"></span>
			<span class="loc-text">{locationName ?? 'Cargando...'}</span>
			{#if observedStation}
				<span class="loc-source">· {observedStation}</span>
			{/if}
		</div>
		{#if attireMaxTemp != null}
			<AttireSuggestion maxTemp={attireMaxTemp} />
		{/if}
		{#if umbrellaWeatherCodes.length > 0}
			<UmbrellaIndicator weatherCodes={umbrellaWeatherCodes} />
		{/if}
	</div>
{:else}
	<div class="no-data">
		No hay datos disponibles para esta fecha
	</div>
{/if}

<style>
	.story-header {
		padding: 52px 24px 0;
	}
	.time-context {
		font-size: 12px;
		font-weight: 500;
		color: var(--color-text-3);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.temp-ambient {
		padding: 20px 24px 0;
		display: flex;
		align-items: flex-end;
		gap: 16px;
	}
	.temp-number {
		font-size: 72px;
		font-weight: 200;
		letter-spacing: -3px;
		line-height: 1;
		color: var(--color-text-1);
	}
	.temp-meta {
		padding-bottom: 12px;
	}
	.condition {
		font-size: 15px;
		color: var(--color-text-2);
	}
	.range {
		font-size: 13px;
		color: var(--color-text-3);
		margin-top: 2px;
	}
	.pills-row {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 16px 24px 0;
		flex-wrap: wrap;
	}
	.location-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 20px;
		background: var(--color-dark-card);
		border: 1px solid var(--color-dark-card-border);
		backdrop-filter: blur(10px);
	}
	.loc-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--color-green);
		animation: pulse 2s infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}
	.loc-text {
		font-size: 13px;
		color: var(--color-text-2);
	}
	.loc-source {
		font-size: 11px;
		color: var(--color-text-3);
		margin-left: 4px;
	}
	.no-data {
		text-align: center;
		padding: 40px 24px;
		font-size: 16px;
		color: var(--color-text-3);
	}
</style>
