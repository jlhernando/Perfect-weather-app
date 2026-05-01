<script lang="ts">
	import { getIcon } from '$lib/utils/icons';

	interface Props {
		hours: number[];
		weatherCodes: number[];
	}

	let { hours, weatherCodes }: Props = $props();

	// Show every 3 hours to fit within chart width
	let filteredIndices = $derived(
		hours.map((_, i) => i).filter((i) => i % 3 === 0)
	);
</script>

<div class="icons-row">
	{#each filteredIndices as i}
		<div class="icon-item">
			<span class="icon">{getIcon(weatherCodes[i])}</span>
			<span class="hour-label">{String(hours[i]).padStart(2, '0')}</span>
		</div>
	{/each}
</div>

<style>
	.icons-row {
		display: flex;
		justify-content: space-between;
		padding: 10px 40px 4px;
	}
	.icon-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.icon {
		font-size: 18px;
		line-height: 1.2;
	}
	.hour-label {
		font-size: 9px;
		font-weight: 500;
		color: rgba(255,255,255,0.35);
	}
</style>
