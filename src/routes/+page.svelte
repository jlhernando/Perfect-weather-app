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
	import { getIcon, getDominantCode } from '$lib/utils/icons';

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

	// Derived: icons and temps for each day in the calendar strip
	let dayIcons = $derived.by(() => {
		if (!weatherData) return [];
		return days.map((_, i) => {
			const start = i * 24;
			const codes = weatherData!.hourly.weathercode.slice(start, start + 24).filter(c => c != null);
			const dominant = getDominantCode(codes);
			return getIcon(dominant);
		});
	});

	let dayTemps = $derived.by(() => {
		if (!weatherData) return [];
		return days.map((_, i) => {
			const start = i * 24;
			const temps = weatherData!.hourly.temperature_2m.slice(start, start + 24).filter(t => t != null);
			return temps.length > 0 ? Math.round(Math.max(...temps)) : null;
		});
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

	let dayHasData = $derived.by(() => {
		if (!dayData) return false;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return temps.some((t) => t != null);
	});

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

	let currentTemp = $derived.by(() => {
		if (!dayData || !days[selectedDay]?.isToday) return null;
		if (aemetData && tempMode === 'real') {
			return Math.round(aemetData.temperature);
		}
		const hour = new Date().getHours();
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return temps[hour] != null ? Math.round(temps[hour]) : null;
	});

	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

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
				if (obs.precipitation === 0 && RAIN_CODES.has(hourly.weathercode[hourIdx])) {
					hourly.weathercode[hourIdx] = 2;
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
	<div class="loading-screen">
		<div class="spinner"></div>
		<p>Localizando...</p>
	</div>
{:else if error}
	<div class="error-screen">
		No se pudo cargar los datos del tiempo.<br />{error}
	</div>
{:else if weatherData && dayData}
	<!-- Ambient gradient background -->
	<div class="ambient-bg"></div>

	<div class="content animate-fade-in">
		<!-- Hidden location search (accessible from toolbar) -->
		<LocationSearch bind:this={locationSearch} onselect={handleLocationSelect} showButton={false} />

		<!-- Narrative header + temperature -->
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

		<!-- Day scroller -->
		<CalendarStrip {days} selectedIndex={selectedDay} onselect={handleDaySelect} {dayIcons} {dayTemps} />

		<!-- Chart section -->
		<div class="chart-wrap">
			<WeatherChart
				bind:this={chartComponent}
				hourly={correctedHourly ?? weatherData.hourly}
				daily={weatherData.daily}
				mode={tempMode}
				{selectedDay}
				onDayChange={handleDayChangeFromChart}
			/>
			<div class="chart-controls">
				<TempToggle mode={tempMode} onchange={(m) => (tempMode = m)} />
				<div class="legend-row">
					<span><span class="dot dot-temp"></span>Temp</span>
					<span><span class="dot dot-rain"></span>Lluvia</span>
				</div>
			</div>
		</div>

		<!-- Insight chips -->
		<div class="insights">
			<AttireSuggestion {maxTemp} />
			<UmbrellaIndicator weatherCodes={dayData.weatherCodes} />
		</div>

		<!-- Spacer for bottom bar -->
		<div class="bottom-spacer"></div>
	</div>

	<!-- Bottom toolbar -->
	<div class="bottom-bar">
		<button class="bar-btn active" aria-label="Tiempo">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
			<span class="bar-label">Tiempo</span>
		</button>
		<button class="bar-btn" onclick={() => locationSearch?.openSearch()} aria-label="Ubicacion">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
			<span class="bar-label">Ubicacion</span>
		</button>
		<button class="bar-btn" onclick={handleShare} aria-label="Compartir">
			{#if shareStatus === 'copied'}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
				<span class="bar-label">Copiado</span>
			{:else}
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
				<span class="bar-label">Compartir</span>
			{/if}
		</button>
	</div>
{/if}

<style>
	/* Ambient gradient background */
	.ambient-bg {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 50vh;
		background: linear-gradient(180deg,
			#1e3a5f 0%,
			#0f2744 40%,
			var(--color-dark-bg) 100%);
		pointer-events: none;
		z-index: 0;
	}
	.ambient-bg::before {
		content: '';
		position: absolute;
		top: 10%;
		left: 20%;
		width: 60%;
		height: 40%;
		background: radial-gradient(ellipse, rgba(96, 165, 250, 0.15) 0%, transparent 70%);
		animation: drift 8s ease-in-out infinite;
	}

	.content {
		position: relative;
		z-index: 1;
	}

	/* Loading/error states */
	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 16px;
	}
	.loading-screen p {
		color: var(--color-text-3);
		font-size: 15px;
	}
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid rgba(255, 255, 255, 0.1);
		border-top-color: rgba(255, 255, 255, 0.7);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.error-screen {
		text-align: center;
		padding: 40px;
		color: var(--color-text-3);
		font-size: 14px;
	}

	/* Chart wrapper */
	.chart-wrap {
		margin: 0 16px;
		background: var(--color-dark-card);
		border: 1px solid var(--color-dark-card-border);
		border-radius: 20px;
		padding: 16px;
		backdrop-filter: blur(10px);
	}
	.chart-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 12px;
	}
	.legend-row {
		display: flex;
		gap: 12px;
	}
	.legend-row span {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 10px;
		color: var(--color-text-3);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 2px;
	}
	.dot-temp {
		background: var(--color-accent);
	}
	.dot-rain {
		background: rgba(96, 165, 250, 0.3);
	}

	/* Insights */
	.insights {
		display: flex;
		gap: 10px;
		padding: 20px 16px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.insights::-webkit-scrollbar { display: none; }

	/* Bottom spacer */
	.bottom-spacer {
		height: calc(80px + env(safe-area-inset-bottom, 34px));
	}

	/* Bottom toolbar */
	.bottom-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 40;
		display: flex;
		justify-content: center;
		gap: 32px;
		padding: 14px 14px calc(14px + env(safe-area-inset-bottom, 20px));
		background: rgba(10, 22, 40, 0.95);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.bar-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3px;
		background: none;
		border: none;
		color: var(--color-text-3);
		cursor: pointer;
		min-width: 44px;
		min-height: 44px;
		padding: 4px 12px;
		transition: color 0.2s;
	}
	.bar-btn.active {
		color: var(--color-accent);
	}
	.bar-btn:active {
		color: var(--color-text-1);
	}
	.bar-label {
		font-size: 10px;
		font-weight: 500;
	}

	/* Animations */
	.animate-fade-in {
		animation: fadeIn 0.4s ease;
	}
	@keyframes fadeIn {
		from { opacity: 0; transform: translateY(8px); }
		to { opacity: 1; transform: translateY(0); }
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
	@keyframes drift {
		0%, 100% { transform: translateX(0) translateY(0); }
		50% { transform: translateX(15px) translateY(-10px); }
	}
</style>
