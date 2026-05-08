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

<div class="insight-pill">
	<span class="pill-icon">{suggestion.icon}</span>
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
