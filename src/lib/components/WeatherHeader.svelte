<script lang="ts">
	import { formatDateLong } from '$lib/utils/date';
	import { getIcon, getDominantCode } from '$lib/utils/icons';

	interface Props {
		date: Date;
		maxTemp: number;
		minTemp: number;
		weatherCodes: number[];
		locationName: string | null;
	}

	let { date, maxTemp, minTemp, weatherCodes, locationName }: Props = $props();

	let dominantIcon = $derived(getIcon(getDominantCode(weatherCodes)));
</script>

{#if locationName}
	<div class="text-center px-4 py-2 text-[13px] text-white/50 tracking-wider uppercase">
		{locationName}
	</div>
{/if}

<div class="text-center text-[15px] text-white/60 px-4 pb-3">
	{formatDateLong(date)}
</div>

<div class="px-5 pb-2">
	<div class="flex items-baseline gap-0.5">
		<span class="text-[42px] font-light tracking-tight">{maxTemp}&deg;</span>
		<span class="text-[42px] font-light tracking-tight text-white/50">{minTemp}&deg;</span>
		<span class="text-4xl ml-2">{dominantIcon}</span>
	</div>
	<div class="text-xs text-white/40 mt-0.5">Celsius (&deg;C)</div>
</div>
