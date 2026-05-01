<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="max-w-[430px] mx-auto min-h-screen relative font-sans">
	{@render children()}
</div>
