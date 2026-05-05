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
		dayIcons?: string[];
		dayTemps?: (number | null)[];
	}

	let { days, selectedIndex, onselect, dayIcons = [], dayTemps = [] }: Props = $props();

	function getLabel(day: DayInfo): string {
		if (day.isToday) return 'Hoy';
		return dayNameShort(day.date);
	}
</script>

<div class="day-scroller">
	{#each days as day, i}
		<button
			class="day-card"
			class:active={i === selectedIndex}
			onclick={() => onselect(i)}
		>
			<span class="dc-name">{getLabel(day)}</span>
			<span class="dc-icon">{dayIcons[i] || '⛅'}</span>
			<span class="dc-num">{dayTemps[i] != null ? `${dayTemps[i]}°` : `${day.date.getDate()}`}</span>
		</button>
	{/each}
</div>

<style>
	.day-scroller {
		display: flex;
		gap: 6px;
		padding: 20px 24px;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.day-scroller::-webkit-scrollbar { display: none; }
	.day-card {
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		padding: 12px 14px;
		border-radius: 14px;
		background: var(--color-dark-card);
		border: 1px solid transparent;
		cursor: pointer;
		min-width: 54px;
		transition: all 0.2s;
	}
	.day-card.active {
		border-color: var(--color-accent);
		background: rgba(96, 165, 250, 0.1);
	}
	.dc-name {
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-3);
	}
	.day-card.active .dc-name {
		color: var(--color-accent);
	}
	.dc-num {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text-2);
	}
	.day-card.active .dc-num {
		color: var(--color-text-1);
	}
	.dc-icon {
		font-size: 16px;
	}
</style>
