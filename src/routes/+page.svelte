<script lang="ts">
	import { onMount } from 'svelte';
	import { getLocation, fetchWeather, reverseGeocode } from '$lib/api/weather';
	import type { WeatherResponse } from '$lib/api/weather';
	import CalendarStrip from '$lib/components/CalendarStrip.svelte';
	import WeatherHeader from '$lib/components/WeatherHeader.svelte';
	import HourlyIcons from '$lib/components/HourlyIcons.svelte';
	import WeatherChart from '$lib/components/WeatherChart.svelte';
	import TempToggle from '$lib/components/TempToggle.svelte';

	let weatherData: WeatherResponse | null = $state(null);
	let locationName: string | null = $state(null);
	let selectedDay = $state(0);
	let tempMode: 'real' | 'feels' = $state('real');
	let loading = $state(true);
	let error: string | null = $state(null);
	let chartComponent: WeatherChart;

	// Derived: days list
	let days = $derived.by(() => {
		if (!weatherData) return [];
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const result = [];
		for (let i = 0; i < 7; i++) {
			const t = weatherData.hourly.time[i * 24];
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

	// Derived: max/min temp for selected day
	let maxTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return Math.round(Math.max(...temps.filter((t) => t != null)));
	});

	let minTemp = $derived.by(() => {
		if (!dayData) return 0;
		const temps = tempMode === 'real' ? dayData.temperature : dayData.feelsLike;
		return Math.round(Math.min(...temps.filter((t) => t != null)));
	});

	function handleDaySelect(index: number) {
		selectedDay = index;
		chartComponent?.scrollToDay(index);
	}

	function handleDayChangeFromChart(day: number) {
		selectedDay = day;
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
	<div class="py-3 pb-8 animate-fade-in">
		<WeatherHeader
			date={days[selectedDay].date}
			{maxTemp}
			{minTemp}
			weatherCodes={dayData.weatherCodes}
			{locationName}
		/>

		<CalendarStrip {days} selectedIndex={selectedDay} onselect={handleDaySelect} />

		<HourlyIcons hours={dayData.hours} weatherCodes={dayData.weatherCodes} />

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
