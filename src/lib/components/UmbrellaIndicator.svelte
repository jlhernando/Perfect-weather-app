<script lang="ts">
	interface Props {
		weatherCodes: number[];
	}

	let { weatherCodes }: Props = $props();

	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

	let needsUmbrella = $derived(weatherCodes.some((c) => RAIN_CODES.has(c)));
	let rainHours = $derived(weatherCodes.filter((c) => RAIN_CODES.has(c)).length);
</script>

<div class="insight-pill">
	<span class="pill-icon">{needsUmbrella ? '☂️' : '☀️'}</span>
	<span class="pill-label">{needsUmbrella ? `Paraguas · ${rainHours}h` : 'Sin lluvia'}</span>
</div>

<style>
	.insight-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border-radius: 20px;
		background: var(--color-dark-card);
		border: 1px solid var(--color-dark-card-border);
		backdrop-filter: blur(10px);
	}
	.pill-icon {
		font-size: 14px;
	}
	.pill-label {
		font-size: 13px;
		color: var(--color-text-2);
	}
</style>
