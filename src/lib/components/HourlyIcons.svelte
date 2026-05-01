<script lang="ts">
	import { getIcon } from '$lib/utils/icons';

	interface Props {
		hours: number[];
		weatherCodes: number[];
	}

	let { hours, weatherCodes }: Props = $props();
</script>

<div class="overflow-x-auto scrollbar-none py-3">
	<div class="flex px-5 min-w-max">
		{#each hours as hour, i}
			<div class="flex flex-col items-center min-w-10 gap-0.5">
				<span class="text-xl leading-tight">{getIcon(weatherCodes[i])}</span>
				<span class="text-[9px] font-medium text-white/35">{String(hour).padStart(2, '0')}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.scrollbar-none {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}
	.scrollbar-none::-webkit-scrollbar {
		display: none;
	}
</style>
