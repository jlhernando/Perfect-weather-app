<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="max-w-[430px] sm:max-w-[540px] md:max-w-[640px] lg:max-w-[720px] mx-auto min-h-screen relative font-sans px-0 sm:px-4 md:px-6">
	{@render children()}
</div>
