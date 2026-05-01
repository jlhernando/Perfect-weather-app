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
		return `day-name ${day.isToday ? 'today' : ''}`;
	}

	function dayNumClass(day: DayInfo, i: number): string {
		let cls = 'day-num';
		if (i === selectedIndex && day.isToday) cls += ' selected-today';
		else if (i === selectedIndex) cls += ' selected';
		else if (day.isToday) cls += ' today';
		return cls;
	}
</script>

<div class="calendar-strip">
	{#each days as day, i}
		<button class="day-btn" onclick={() => onselect(i)}>
			<span class={dayNameClass(day)}>{dayNameShort(day.date)}</span>
			<span class={dayNumClass(day, i)}>{day.date.getDate()}</span>
		</button>
	{/each}
</div>

<style>
	.calendar-strip {
		display: flex;
		justify-content: flex-start;
		padding: 8px 16px;
		gap: 2px;
	}
	.day-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 1;
		max-width: 52px;
		padding: 6px 2px;
		border-radius: 14px;
		border: none;
		background: none;
		cursor: pointer;
		-webkit-user-select: none;
		user-select: none;
		transition: background 0.2s;
	}
	.day-btn:active {
		background: rgba(255,255,255,0.08);
	}
	.day-name {
		font-size: 11px;
		font-weight: 600;
		text-transform: uppercase;
		margin-bottom: 4px;
		color: rgba(255,255,255,0.5);
	}
	.day-name.today {
		color: #0a84ff;
	}
	.day-num {
		font-size: 16px;
		font-weight: 500;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		color: white;
		transition: all 0.2s;
	}
	.day-num.today {
		color: #0a84ff;
	}
	.day-num.selected {
		background: rgba(255,255,255,0.9);
		color: black;
		font-weight: 600;
	}
	.day-num.selected-today {
		background: #0a84ff;
		color: white;
		font-weight: 600;
	}
</style>
