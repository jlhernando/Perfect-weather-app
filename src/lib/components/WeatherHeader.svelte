<script lang="ts">
	import { formatDateWithLocation } from '$lib/utils/date';
	import { getIcon, getDominantCode } from '$lib/utils/icons';

	interface Props {
		date: Date;
		maxTemp: number | null;
		minTemp: number | null;
		weatherCodes: number[];
		locationName: string | null;
	}

	let { date, maxTemp, minTemp, weatherCodes, locationName }: Props = $props();

	let validCodes = $derived(weatherCodes.filter((c) => c != null));
	let dominantIcon = $derived(validCodes.length > 0 ? getIcon(getDominantCode(validCodes)) : '');
</script>

<div class="text-center text-[15px] text-white/60 px-4 py-2 pb-3">
	{formatDateWithLocation(date, locationName)}
</div>

<div class="px-5 pb-2">
	{#if maxTemp != null && minTemp != null}
		<div class="flex items-baseline gap-0.5">
			<span class="text-[42px] font-light tracking-tight">{maxTemp}&deg;</span>
			<span class="text-[42px] font-light tracking-tight text-white/50">{minTemp}&deg;</span>
			<span class="text-4xl ml-2">{dominantIcon}</span>
		</div>
		<div class="text-xs text-white/40 mt-0.5">Celsius (&deg;C)</div>
	{:else}
		<div class="text-[18px] text-white/30 py-4">
			No hay datos disponibles para esta fecha
		</div>
	{/if}
</div>
