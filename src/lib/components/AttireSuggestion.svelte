<script lang="ts">
	interface Props {
		maxTemp: number;
	}

	let { maxTemp }: Props = $props();

	let suggestion = $derived.by(() => {
		if (maxTemp > 30) return { icon: '👕', label: 'Camiseta ligera', sub: 'Mucho calor' };
		if (maxTemp > 20) return { icon: '👕', label: 'Camiseta', sub: 'Dia agradable' };
		if (maxTemp > 14) return { icon: '🧥', label: 'Chaqueta', sub: 'Refresca' };
		if (maxTemp > 5) return { icon: '🧣', label: 'Abrigo', sub: 'Hace frio' };
		return { icon: '🧣', label: 'Abrigo grueso', sub: 'Mucho frio' };
	});
</script>

<div class="insight-chip">
	<span class="insight-icon">{suggestion.icon}</span>
	<div class="insight-text">
		<div class="it-title">{suggestion.label}</div>
		<div class="it-sub">{suggestion.sub}</div>
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
