<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocation, fetchWeather, reverseGeocode } from '$lib/api/weather';
	import type { WeatherResponse, LocationResult } from '$lib/api/weather';
	import CalendarStrip from '$lib/components/CalendarStrip.svelte';
	import WeatherHeader from '$lib/components/WeatherHeader.svelte';
	import HourlyIcons from '$lib/components/HourlyIcons.svelte';
	import WeatherChart from '$lib/components/WeatherChart.svelte';
	import TempToggle from '$lib/components/TempToggle.svelte';
	import LocationSearch from '$lib/components/LocationSearch.svelte';

	let weatherData: WeatherResponse | null = $state(null);
	let locationName: string | null = $state(null);
	let selectedDay = $state(0);
	let tempMode: 'real' | 'feels' = $state('real');
	let loading = $state(true);
	let error: string | null = $state(null);
	let chartComponent: WeatherChart;

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

	// Derived: max/min temp for selected day
	let maxTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		const valid = temps.filter((t) => t != null);
		return valid.length > 0 ? Math.round(Math.max(...valid)) : 0;
	});

	let minTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		const valid = temps.filter((t) => t != null);
		return valid.length > 0 ? Math.round(Math.min(...valid)) : 0;
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
			const [weather, name] = await Promise.all([
				fetchWeather(loc.latitude, loc.longitude),
				reverseGeocode(loc.latitude, loc.longitude)
			]);
			weatherData = weather;
			locationName = name ?? loc.name;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load weather data';
		} finally {
			loading = false;
		}
	}

	onMount(async () => {
		try {
			const coords = await getLocation();
			const [weather, name] = await Promise.all([
				fetchWeather(coords.lat, coords.lon),
				reverseGeocode(coords.lat, coords.lon)
			]);
			weatherData = weather;
			locationName = name;
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
	<LocationSearch onselect={handleLocationSelect} />
	<div class="py-3 pb-8 animate-fade-in">
		<WeatherHeader
			date={days[selectedDay].date}
			maxTemp={dayHasData ? maxTemp : null}
			minTemp={dayHasData ? minTemp : null}
			weatherCodes={dayData.weatherCodes}
			{locationName}
		/>

		<CalendarStrip {days} selectedIndex={selectedDay} onselect={handleDaySelect} />

		{#if dayHasData}
			<HourlyIcons hours={dayData.hours} weatherCodes={dayData.weatherCodes} />
		{/if}

		<WeatherChart
			bind:this={chartComponent}
			hourly={weatherData.hourly}
			mode={tempMode}
			{selectedDay}
			onDayChange={handleDayChangeFromChart}
		/>

		<TempToggle mode={tempMode} onchange={(m) => (tempMode = m)} />

		<!-- Legend -->
		<div class="flex justify-center gap-5 pt-4 px-5">
			<div class="flex items-center gap-1.5 text-xs text-white/50">
				<span class="w-2.5 h-2.5 rounded-sm bg-gradient-to-b from-ios-cyan to-[#007aff]"></span>
				<span>Temperatura</span>
			</div>
			<div class="flex items-center gap-1.5 text-xs text-white/50">
				<span class="w-2.5 h-2.5 rounded-sm bg-rain-bar"></span>
				<span>Prob. precipitacion</span>
			</div>
		</div>
	</div>
{/if}

<style>
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
