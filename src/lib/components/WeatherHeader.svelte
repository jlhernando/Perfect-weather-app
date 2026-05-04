<script lang="ts">
	import { formatDateWithLocation } from '$lib/utils/date';
	import { getIcon, getDominantCode } from '$lib/utils/icons';

	interface Props {
		date: Date;
		currentTemp: number | null;
		maxTemp: number | null;
		minTemp: number | null;
		weatherCodes: number[];
		locationName: string | null;
		dayOffset?: number;
		observedStation?: string | null;
	}

	let { date, currentTemp, maxTemp, minTemp, weatherCodes, locationName, dayOffset = 0, observedStation = null }: Props = $props();

	function getAccuracy(offset: number): { pct: number; color: string; label: string } {
		if (offset <= 1) return { pct: 95, color: '#34c759', label: 'Muy fiable' };
		if (offset <= 2) return { pct: 90, color: '#34c759', label: 'Muy fiable' };
		if (offset <= 3) return { pct: 85, color: '#30d158', label: 'Fiable' };
		if (offset <= 4) return { pct: 80, color: '#ffd60a', label: 'Fiable' };
		if (offset <= 5) return { pct: 75, color: '#ffd60a', label: 'Moderada' };
		if (offset <= 6) return { pct: 70, color: '#ff9f0a', label: 'Moderada' };
		if (offset <= 7) return { pct: 65, color: '#ff9f0a', label: 'Baja' };
		if (offset <= 8) return { pct: 55, color: '#ff6b6b', label: 'Baja' };
		return { pct: 50, color: '#ff6b6b', label: 'Baja' };
	}

	let accuracy = $derived(getAccuracy(dayOffset));

	const CONDITION_TEXT: Record<number, string> = {
		0: 'Despejado', 1: 'Mayormente despejado', 2: 'Nubes y claros', 3: 'Nublado',
		45: 'Niebla', 48: 'Niebla helada',
		51: 'Llovizna ligera', 53: 'Llovizna', 55: 'Llovizna densa',
		61: 'Lluvia ligera', 63: 'Lluvia', 65: 'Lluvia fuerte',
		71: 'Nevada ligera', 73: 'Nevada', 75: 'Nevada fuerte',
		80: 'Chubascos', 81: 'Chubascos moderados', 82: 'Chubascos fuertes',
		95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta severa',
	};

	let validCodes = $derived(weatherCodes.filter((c) => c != null));
	// For today: show current hour's condition. For other days: show dominant condition.
	let displayCode = $derived.by(() => {
		if (validCodes.length === 0) return 3;
		if (currentTemp != null) {
			const hour = new Date().getHours();
			const code = weatherCodes[hour];
			if (code != null) return code;
		}
		return getDominantCode(validCodes);
	});
	let displayIcon = $derived(getIcon(displayCode));
</script>

<div class="text-center text-[15px] text-white/60 px-4 py-2 pb-3">
	{formatDateWithLocation(date, locationName)}
</div>

<div class="px-5 pb-2">
	{#if maxTemp != null && minTemp != null}
		<div class="text-center" style="min-height: 140px;">
			{#if currentTemp != null}
				<div class="text-[72px] font-extralight tracking-tighter leading-none">{currentTemp}&deg;</div>
			{:else}
				<div class="text-[72px] font-extralight tracking-tighter leading-none">
					{maxTemp}&deg;<span class="text-white/30 px-2 tracking-normal">/</span><span class="text-white/50">{minTemp}&deg;</span>
				</div>
			{/if}
			<div class="text-[15px] text-white/60 mt-1">{displayIcon} {CONDITION_TEXT[displayCode] || ''}</div>
			<div class="text-[15px] text-white/40 mt-0.5">Max. {maxTemp}&deg;  Min. {minTemp}&deg;</div>
			<div class="text-[12px] mt-1.5" style="color: {accuracy.color}; opacity: 0.7;">
				{#if observedStation}
					Datos reales · {observedStation}
				{:else}
					{accuracy.label} ({accuracy.pct}%)
				{/if}
			</div>
		</div>
	{:else}
		<div class="text-center" style="min-height: 120px;">
			<div class="text-[18px] text-white/30 py-4">
				No hay datos disponibles para esta fecha
			</div>
		</div>
	{/if}
</div>
