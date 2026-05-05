<script lang="ts">
	interface Props {
		weatherCodes: number[];
	}

	let { weatherCodes }: Props = $props();

	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

	let needsUmbrella = $derived(weatherCodes.some((c) => RAIN_CODES.has(c)));
	let rainHours = $derived(weatherCodes.filter((c) => RAIN_CODES.has(c)).length);
</script>

<div class="insight-chip">
	<span class="insight-icon">{needsUmbrella ? '☂️' : '☀️'}</span>
	<div class="insight-text">
		<div class="it-title">{needsUmbrella ? 'Lleva paraguas' : 'Sin paraguas'}</div>
		<div class="it-sub">{needsUmbrella ? `${rainHours}h de lluvia` : '0% lluvia'}</div>
	</div>
</div>

<style>
	.insight-chip {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		background: var(--color-dark-card);
		border: 1px solid var(--color-dark-card-border);
		border-radius: 14px;
		backdrop-filter: blur(10px);
	}
	.insight-icon {
		font-size: 22px;
	}
	.it-title {
		font-size: 13px;
		font-weight: 500;
		color: var(--color-text-1);
	}
	.it-sub {
		font-size: 11px;
		color: var(--color-text-3);
	}
</style>
