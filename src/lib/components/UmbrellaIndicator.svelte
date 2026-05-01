<script lang="ts">
	interface Props {
		weatherCodes: number[];
	}

	let { weatherCodes }: Props = $props();

	const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 85, 86, 95, 96, 99]);

	let needsUmbrella = $derived(weatherCodes.some((c) => RAIN_CODES.has(c)));
</script>

<div class="card">
	<div class="icon-wrap">
		<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
			<!-- Umbrella -->
			<path
				d="M12 2C6.5 2 2 6.5 2 12h4.5c0-1.5 1-3 3.5-3s3.5 1.5 3.5 3H22c0-5.5-4.5-10-10-10z"
				fill={needsUmbrella ? 'rgba(90, 160, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)'}
			/>
			<!-- Handle -->
			<path
				d="M12 12v7c0 1.1-.9 2-2 2s-2-.9-2-2"
				stroke={needsUmbrella ? 'rgba(90, 160, 255, 0.85)' : 'rgba(255, 255, 255, 0.2)'}
				stroke-width="2"
				stroke-linecap="round"
				fill="none"
			/>
			<!-- Strikethrough line when no rain -->
			{#if !needsUmbrella}
				<line
					x1="4" y1="20" x2="20" y2="4"
					stroke="rgba(255, 255, 255, 0.35)"
					stroke-width="2"
					stroke-linecap="round"
				/>
			{/if}
		</svg>
	</div>
	<div class="label" class:active={needsUmbrella}>{needsUmbrella ? 'Lleva paraguas' : 'Sin paraguas'}</div>
	<div class="sub">{needsUmbrella ? 'Se espera lluvia' : 'No se espera lluvia'}</div>
</div>

<style>
	.card {
		flex: 1;
		background: rgba(255, 255, 255, 0.06);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		padding: 14px 12px;
		text-align: center;
	}
	.icon-wrap {
		display: flex;
		justify-content: center;
	}
	.label {
		font-size: 14px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 6px;
	}
	.label.active {
		color: rgba(90, 160, 255, 0.9);
	}
	.sub {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 2px;
	}
</style>
