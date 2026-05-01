<script lang="ts">
	interface Props {
		maxTemp: number;
	}

	let { maxTemp }: Props = $props();

	let suggestion = $derived.by(() => {
		if (maxTemp > 30) return { icon: '👕', label: 'Camiseta ligera', sub: 'Hace mucho calor' };
		if (maxTemp > 20) return { icon: '👕', label: 'Camiseta', sub: 'Temperatura agradable' };
		if (maxTemp > 14) return { icon: '🧥', label: 'Chaqueta', sub: 'Refresca un poco' };
		if (maxTemp > 5) return { icon: '🧣', label: 'Abrigo', sub: 'Hace frio' };
		return { icon: '🧣', label: 'Abrigo grueso', sub: 'Mucho frio' };
	});
</script>

<div class="card">
	<div class="icon">{suggestion.icon}</div>
	<div class="label">{suggestion.label}</div>
	<div class="sub">{suggestion.sub}</div>
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
	.icon {
		font-size: 28px;
		line-height: 1;
	}
	.label {
		font-size: 14px;
		font-weight: 500;
		color: rgba(255, 255, 255, 0.85);
		margin-top: 6px;
	}
	.sub {
		font-size: 11px;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 2px;
	}
</style>
