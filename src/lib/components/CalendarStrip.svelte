<script lang="ts">
	import { dayNameShort } from '$lib/utils/date';

	interface DayInfo {
		date: Date;
		isToday: boolean;
	}

	interface Props {
		days: DayInfo[];
		selectedIndex: number;
		onselect: (index: number) => void;
	}

	let { days, selectedIndex, onselect }: Props = $props();

	function dayNameClass(day: DayInfo): string {
		return `text-[11px] font-semibold uppercase mb-1.5 ${day.isToday ? 'text-[#0a84ff]' : 'text-white/50'}`;
	}

	function dayNumClass(day: DayInfo, i: number): string {
		const base = 'text-[17px] font-medium w-8 h-8 flex items-center justify-center rounded-full transition-all';
		if (i === selectedIndex && day.isToday) return `${base} bg-[#0a84ff] text-white font-semibold`;
		if (i === selectedIndex && !day.isToday) return `${base} bg-white/90 text-black font-semibold`;
		if (day.isToday) return `${base} text-[#0a84ff]`;
		return base;
	}
</script>

<div class="flex overflow-x-auto px-4 py-2 gap-1 scrollbar-none scroll-snap-x">
	{#each days as day, i}
		<button
			class="flex flex-col items-center min-w-12 py-2 px-1 rounded-2xl transition-colors select-none"
			onclick={() => onselect(i)}
		>
			<span class={dayNameClass(day)}>
				{dayNameShort(day.date)}
			</span>
			<span class={dayNumClass(day, i)}>
				{day.date.getDate()}
			</span>
		</button>
	{/each}
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
