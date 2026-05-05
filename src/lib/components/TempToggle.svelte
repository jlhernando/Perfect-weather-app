<script lang="ts">
	interface Props {
		mode: 'real' | 'feels';
		onchange: (mode: 'real' | 'feels') => void;
	}

	let { mode, onchange }: Props = $props();
</script>

<div class="toggle-pills">
	<button class:on={mode === 'real'} onclick={() => onchange('real')}>Real</button>
	<button class:on={mode === 'feels'} onclick={() => onchange('feels')}>Sensacion</button>
</div>

<style>
	.toggle-pills {
		display: flex;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 8px;
		padding: 2px;
	}
	button {
		padding: 6px 12px;
		border: none;
		border-radius: 6px;
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		background: none;
		color: var(--color-text-3);
		transition: all 0.2s;
	}
	button.on {
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-text-1);
	}
</style>
