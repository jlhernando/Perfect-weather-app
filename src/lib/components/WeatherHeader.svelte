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
	}

	let { date, currentTemp, maxTemp, minTemp, weatherCodes, locationName }: Props = $props();

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
	let dominantIcon = $derived(validCodes.length > 0 ? getIcon(getDominantCode(validCodes)) : '');
</script>

<div class="text-center text-[15px] text-white/60 px-4 py-2 pb-3">
	{formatDateWithLocation(date, locationName)}
</div>

<div class="px-5 pb-2">
	{#if maxTemp != null && minTemp != null}
		<div class="text-center" style="min-height: 120px;">
			{#if currentTemp != null}
				<div class="text-[72px] font-extralight tracking-tighter leading-none">{currentTemp}&deg;</div>
			{:else}
				<div class="text-[72px] font-extralight tracking-tighter leading-none">
					{maxTemp}&deg;<span class="text-white/30 px-2 tracking-normal">/</span><span class="text-white/50">{minTemp}&deg;</span>
				</div>
			{/if}
			<div class="text-[15px] text-white/60 mt-1">{dominantIcon} {CONDITION_TEXT[getDominantCode(validCodes)] || ''}</div>
			{#if currentTemp != null}
				<div class="text-[15px] text-white/40 mt-0.5">Max. {maxTemp}&deg;  Min. {minTemp}&deg;</div>
			{/if}
		</div>
	{:else}
		<div class="text-center" style="min-height: 120px;">
			<div class="text-[18px] text-white/30 py-4">
				No hay datos disponibles para esta fecha
			</div>
		</div>
	{/if}
</div>
