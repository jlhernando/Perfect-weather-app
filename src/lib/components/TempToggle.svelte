<script lang="ts">
	interface Props {
		mode: 'real' | 'feels';
		onchange: (mode: 'real' | 'feels') => void;
	}

	let { mode, onchange }: Props = $props();

	function btnClass(target: 'real' | 'feels'): string {
		const base = 'flex-1 py-2 px-4 rounded-[18px] text-sm font-medium transition-all font-sans cursor-pointer border-none';
		if (mode === target) return `${base} bg-white/[0.18] text-white`;
		return `${base} text-white/50`;
	}
</script>

<div class="flex mx-5 mt-4 bg-white/[0.08] rounded-[20px] p-[3px]">
	<button
		class={btnClass('real')}
		onclick={() => onchange('real')}
	>
		Real
	</button>
	<button
		class={btnClass('feels')}
		onclick={() => onchange('feels')}
	>
		Sensacion
	</button>
</div>
<div class="text-center text-xs text-white/35 pt-2 px-5">
	{mode === 'real' ? 'La temperatura real.' : 'Sensacion termica.'}
</div>
