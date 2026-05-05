<script lang="ts">
	import '../app.css';

	let { children } = $props();
</script>

<div class="app-container">
	{@render children()}
</div>

<style>
	.app-container {
		max-width: 430px;
		margin: 0 auto;
		min-height: 100vh;
		position: relative;
		font-family: var(--font-sans);
		overflow: hidden;
	}
	@media (min-width: 640px) {
		.app-container {
			max-width: 540px;
		}
	}
</style>
