<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocation, fetchWeather, reverseGeocode, fetchAemetObservation } from '$lib/api/weather';
	import type { WeatherResponse, LocationResult, AemetObservation } from '$lib/api/weather';
	import CalendarStrip from '$lib/components/CalendarStrip.svelte';
	import WeatherHeader from '$lib/components/WeatherHeader.svelte';

	import WeatherChart from '$lib/components/WeatherChart.svelte';
	import TempToggle from '$lib/components/TempToggle.svelte';
	import LocationSearch from '$lib/components/LocationSearch.svelte';
	import AttireSuggestion from '$lib/components/AttireSuggestion.svelte';
	import UmbrellaIndicator from '$lib/components/UmbrellaIndicator.svelte';

	let weatherData: WeatherResponse | null = $state(null);
	let aemetData: AemetObservation | null = $state(null);
	let locationName: string | null = $state(null);
	let currentCoords: { lat: number; lon: number } | null = $state(null);
	let selectedDay = $state(0);
	let tempMode: 'real' | 'feels' = $state('real');
	let loading = $state(true);
	let error: string | null = $state(null);
	let chartComponent: WeatherChart;
	let locationSearch: LocationSearch;
	let shareStatus: 'idle' | 'copied' = $state('idle');

	// Derived: days list (only include days with actual temperature data)
	let days = $derived.by(() => {
		if (!weatherData) return [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const result = [];
		const totalHours = weatherData.hourly.time.length;
		const totalDays = Math.ceil(totalHours / 24);
		for (let i = 0; i < totalDays; i++) {
			const startIdx = i * 24;
			if (startIdx >= totalHours) break;
			// Check if this day has any valid temperature data
			const dayTemps = weatherData.hourly.temperature_2m.slice(startIdx, startIdx + 24);
			const hasData = dayTemps.some((t) => t != null);
			if (!hasData) break;
			const t = weatherData.hourly.time[startIdx];
			const date = new Date(t);
			result.push({
				date,
				isToday: date.toDateString() === today.toDateString()
			});
		}
		return result;
	});

	// Derived: current day data
	let dayData = $derived.by(() => {
		if (!weatherData) return null;
		const start = selectedDay * 24;
		const end = start + 24;
		const h = weatherData.hourly;
		return {
			hours: h.time.slice(start, end).map((t) => new Date(t).getHours()),
			temperature: h.temperature_2m.slice(start, end),
			feelsLike: h.apparent_temperature.slice(start, end),
			weatherCodes: h.weathercode.slice(start, end)
		};
	});

	// Does this day have valid data?
	let dayHasData = $derived.by(() => {
		if (!dayData) return false;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return temps.some((t) => t != null);
	});

	// Derived: max/min temp for selected day — corrected with AEMET observed data for today
	let maxTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		const valid = temps.filter((t) => t != null);
		let forecastMax = valid.length > 0 ? Math.round(Math.max(...valid)) : 0;
		if (selectedDay === 0 && aemetData && tempMode === 'real') {
			forecastMax = Math.max(forecastMax, Math.round(aemetData.tempMax));
		}
		return forecastMax;
	});

	let minTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		const valid = temps.filter((t) => t != null);
		let forecastMin = valid.length > 0 ? Math.round(Math.min(...valid)) : 0;
		if (selectedDay === 0 && aemetData && tempMode === 'real') {
			forecastMin = Math.min(forecastMin, Math.round(aemetData.tempMin));
		}
		return forecastMin;
	});

	// Current temperature (only for today) — prefer AEMET real observation
	let currentTemp = $derived.by(() => {
		if (!dayData || !days[selectedDay]?.isToday) return null;
		if (aemetData && tempMode === 'real') {
			return Math.round(aemetData.temperature);
		}
		const hour = new Date().getHours();
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return temps[hour] != null ? Math.round(temps[hour]) : null;
	});

	// Rain weather codes that should be overridden when AEMET shows no precipitation
	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

	// Corrected hourly data: replace today's past hours with AEMET real observations
	let correctedHourly = $derived.by(() => {
		if (!weatherData || !aemetData?.hourly?.length) return weatherData?.hourly ?? null;
		const hourly = {
			...weatherData.hourly,
			temperature_2m: [...weatherData.hourly.temperature_2m],
			weathercode: [...weatherData.hourly.weathercode],
		};
		const dataStartTime = new Date(hourly.time[0]).getTime();
		for (const obs of aemetData.hourly) {
			const obsTime = new Date(obs.time).getTime();
			const hourIdx = Math.round((obsTime - dataStartTime) / 3600000);
			if (hourIdx >= 0 && hourIdx < hourly.temperature_2m.length) {
				hourly.temperature_2m[hourIdx] = obs.temperature;
				// Override rain icons for past hours where AEMET shows no rain
				if (obs.precipitation === 0 && RAIN_CODES.has(hourly.weathercode[hourIdx])) {
					hourly.weathercode[hourIdx] = 2; // Partly cloudy
				}
			}
		}
		return hourly;
	});

	function handleDaySelect(index: number) {
		selectedDay = index;
		chartComponent?.scrollToDay(index);
	}

	function handleDayChangeFromChart(day: number) {
		selectedDay = day;
	}

	async function handleLocationSelect(loc: LocationResult) {
		loading = true;
		error = null;
		selectedDay = 0;
		try {
			const [weather, name, aemet] = await Promise.all([
				fetchWeather(loc.latitude, loc.longitude),
				reverseGeocode(loc.latitude, loc.longitude),
				fetchAemetObservation(loc.latitude, loc.longitude)
			]);
			weatherData = weather;
			locationName = name ?? loc.name;
			currentCoords = { lat: loc.latitude, lon: loc.longitude };
			aemetData = aemet;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load weather data';
		} finally {
			loading = false;
		}
	}

	async function handleShare() {
		if (!currentCoords) return;
		const url = `${window.location.origin}/?lat=${currentCoords.lat}&lon=${currentCoords.lon}`;
		const shareData = {
			title: `${locationName ? 'Tiempo en ' + locationName : 'Perfect Weather'}`,
			url
		};
		let shared = false;
		if (navigator.share) {
			try {
				await navigator.share(shareData);
				shared = true;
			} catch {}
		}
		if (!shared) {
			try {
				await navigator.clipboard.writeText(url);
			} catch {
				// Clipboard API also requires secure context; use fallback
				const ta = document.createElement('textarea');
				ta.value = url;
				ta.style.position = 'fixed';
				ta.style.opacity = '0';
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
			}
			shareStatus = 'copied';
			setTimeout(() => (shareStatus = 'idle'), 2000);
		}
	}

	onMount(async () => {
		try {
			const coords = await getLocation();
			const [weather, name, aemet] = await Promise.all([
				fetchWeather(coords.lat, coords.lon),
				reverseGeocode(coords.lat, coords.lon),
				fetchAemetObservation(coords.lat, coords.lon)
			]);
			weatherData = weather;
			locationName = name;
			currentCoords = coords;
			aemetData = aemet;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load weather data';
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<div class="flex flex-col items-center justify-center h-screen gap-4">
		<div class="w-8 h-8 border-3 border-white/15 border-t-white/80 rounded-full animate-spin"></div>
		<p class="text-white/60 text-[15px]">Locating you...</p>
	</div>
{:else if error}
	<div class="text-center p-10 text-white/50 text-sm">
		Could not load weather data.<br />{error}
	</div>
{:else if weatherData && dayData}
	<!-- App header -->
	<div class="app-header">
		<span class="app-title">Perfect Weather</span>
	</div>
	<LocationSearch bind:this={locationSearch} onselect={handleLocationSelect} showButton={false} />
	<div class="pb-20 animate-fade-in">
		<WeatherHeader
			date={days[selectedDay].date}
			{currentTemp}
			maxTemp={dayHasData ? maxTemp : null}
			minTemp={dayHasData ? minTemp : null}
			weatherCodes={dayData.weatherCodes}
			{locationName}
			dayOffset={selectedDay}
			observedStation={selectedDay === 0 && aemetData ? aemetData.station : null}
			observedPrecipitation={selectedDay === 0 && aemetData ? aemetData.precipitation : null}
		/>

		<CalendarStrip {days} selectedIndex={selectedDay} onselect={handleDaySelect} />

		<WeatherChart
			bind:this={chartComponent}
			hourly={correctedHourly ?? weatherData.hourly}
			daily={weatherData.daily}
			mode={tempMode}
			{selectedDay}
			onDayChange={handleDayChangeFromChart}
		/>

		<TempToggle mode={tempMode} onchange={(m) => (tempMode = m)} />

		<!-- Attire & Umbrella modules -->
		<div class="flex gap-3 px-5 pt-4">
			<AttireSuggestion {maxTemp} />
			<UmbrellaIndicator weatherCodes={dayData.weatherCodes} />
		</div>

		<!-- Legend -->
		<div class="flex justify-center gap-5 pt-4 px-5">
			<div class="flex items-center gap-1.5 text-xs text-white/50">
				<span class="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-ios-cyan to-[#007aff]"></span>
				<span>Temperatura</span>
			</div>
			<div class="flex items-center gap-1.5 text-xs text-white/50">
				<span class="w-2.5 h-2.5 rounded-sm bg-rain-bar"></span>
				<span>Precipitacion (mm)</span>
			</div>
		</div>
	</div>
	<!-- Bottom toolbar -->
	<div class="bottom-toolbar">
		<button class="toolbar-btn" onclick={() => locationSearch?.openSearch()} aria-label="Buscar ubicacion">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
				<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
				<circle cx="12" cy="10" r="3" />
			</svg>
			<span class="toolbar-label">Ubicacion</span>
		</button>
		<button class="toolbar-btn" onclick={handleShare} aria-label="Compartir">
			{#if shareStatus === 'copied'}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
				<span class="toolbar-label">Copiado</span>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
				<span class="toolbar-label">Compartir</span>
			{/if}
		</button>
	</div>
{/if}

<style>
	.app-header {
		background: rgba(255, 255, 255, 0.04);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding: 14px 16px;
		text-align: center;
	}
	.app-title {
		font-size: 15px;
		font-weight: 600;
		color: rgba(255, 255, 255, 0.7);
		letter-spacing: 0.03em;
	}
	.bottom-toolbar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 40;
		display: flex;
		justify-content: center;
		gap: 32px;
		padding: 10px 16px;
		padding-bottom: max(10px, env(safe-area-inset-bottom));
		background: rgba(28, 28, 30, 0.85);
		backdrop-filter: blur(16px);
		-webkit-backdrop-filter: blur(16px);
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}
	.toolbar-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.55);
		cursor: pointer;
		padding: 4px 16px;
		transition: color 0.2s;
	}
	.toolbar-btn:active {
		color: rgba(255, 255, 255, 0.85);
	}
	.toolbar-label {
		font-size: 10px;
		font-weight: 500;
	}
	.animate-fade-in {
		animation: fadeIn 0.4s ease;
	}
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
	.animate-spin {
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
