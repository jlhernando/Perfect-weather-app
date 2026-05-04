<script lang="ts">
	import { searchLocations } from '$lib/api/weather';
	import type { LocationResult } from '$lib/api/weather';

	interface Props {
		onselect: (location: LocationResult) => void;
		showButton?: boolean;
	}

	let { onselect, showButton = true }: Props = $props();

	const POPULAR_CITIES: LocationResult[] = [
		{ name: 'Madrid', admin1: 'Comunidad de Madrid', latitude: 40.4168, longitude: -3.7038 },
		{ name: 'Barcelona', admin1: 'Catalonia', latitude: 41.3874, longitude: 2.1686 },
		{ name: 'Valencia', admin1: 'Comunidad Valenciana', latitude: 39.4699, longitude: -0.3763 },
		{ name: 'Sevilla', admin1: 'Andalucia', latitude: 37.3891, longitude: -5.9845 },
		{ name: 'Bilbao', admin1: 'Pais Vasco', latitude: 43.263, longitude: -2.935 },
		{ name: 'Malaga', admin1: 'Andalucia', latitude: 36.7213, longitude: -4.4214 },
		{ name: 'Zaragoza', admin1: 'Aragon', latitude: 41.6488, longitude: -0.8891 },
		{ name: 'Tres Cantos', admin1: 'Comunidad de Madrid', latitude: 40.6003, longitude: -3.7103 },
	];

	let query = $state('');
	let results: LocationResult[] = $state([]);
	let open = $state(false);
	let searching = $state(false);
	let debounceTimer: ReturnType<typeof setTimeout>;
	let inputEl: HTMLInputElement;

	let displayResults = $derived(query.trim().length >= 2 ? results : POPULAR_CITIES);

	function handleInput() {
		const q = query;
		clearTimeout(debounceTimer);
		if (q.trim().length < 2) {
			results = [];
			searching = false;
			return;
		}
		searching = true;
		debounceTimer = setTimeout(async () => {
			results = await searchLocations(q);
			searching = false;
		}, 300);
	}

	function selectLocation(loc: LocationResult) {
		query = '';
		results = [];
		open = false;
		onselect(loc);
	}

	export function openSearch() {
		open = true;
		setTimeout(() => inputEl?.focus(), 50);
	}

	function closeSearch() {
		open = false;
		query = '';
		results = [];
		searching = false;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape' && open) {
			closeSearch();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if showButton}
<!-- Pin icon button — top right -->
<button
	onclick={openSearch}
	class="pin-button"
	aria-label="Buscar ubicacion"
>
	<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
		<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
		<circle cx="12" cy="10" r="3" />
	</svg>
</button>
{/if}

<!-- Fullscreen overlay -->
{#if open}
	<div class="search-overlay" role="dialog" aria-modal="true">
		<!-- Backdrop -->
		<button class="search-backdrop" onclick={closeSearch} aria-label="Cerrar"></button>

		<!-- Content -->
		<div class="search-content">
			<!-- Search input -->
			<div class="search-input-wrapper">
				<svg class="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.35-4.35" />
				</svg>
				<input
					bind:this={inputEl}
					bind:value={query}
					oninput={handleInput}
					type="text"
					placeholder="Buscar ciudad..."
					class="search-input"
				/>
				<button onclick={closeSearch} class="cancel-btn">Cancelar</button>
			</div>

			<!-- Results list -->
			<div class="results-list">
				{#if searching && query.trim().length >= 2 && results.length === 0}
					<div class="result-placeholder">Buscando...</div>
				{:else if query.trim().length >= 2 && !searching && results.length === 0}
					<div class="result-placeholder">Sin resultados</div>
				{:else}
					{#if query.trim().length < 2}
						<div class="section-label">Ciudades populares</div>
					{/if}
					{#each displayResults as loc}
						<button
							onclick={() => selectLocation(loc)}
							class="result-item"
						>
							<svg class="result-pin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
								<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
								<circle cx="12" cy="10" r="3" />
							</svg>
							<div>
								<div class="result-name">{loc.name}</div>
								{#if loc.admin1}
									<div class="result-region">{loc.admin1}</div>
								{/if}
							</div>
						</button>
					{/each}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.pin-button {
		position: absolute;
		top: 52px;
		right: 12px;
		z-index: 30;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(28, 28, 30, 0.8);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}
	.pin-button:active {
		transform: scale(0.92);
		background: rgba(28, 28, 30, 1);
	}

	.search-overlay {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: flex;
		flex-direction: column;
		animation: overlayIn 0.25s ease;
	}

	.search-backdrop {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(20px) saturate(180%);
		-webkit-backdrop-filter: blur(20px) saturate(180%);
		border: none;
		cursor: default;
	}

	.search-content {
		position: relative;
		z-index: 1;
		max-width: 720px;
		width: 100%;
		margin: 0 auto;
		padding: 12px 16px;
		display: flex;
		flex-direction: column;
		height: 100%;
	}

	.search-input-wrapper {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(28, 28, 30, 0.9);
		border-radius: 12px;
		padding: 10px 14px;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.search-icon {
		width: 18px;
		height: 18px;
		color: rgba(255, 255, 255, 0.35);
		flex-shrink: 0;
	}

	.search-input {
		flex: 1;
		background: transparent;
		border: none;
		outline: none;
		color: white;
		font-size: 16px;
		font-family: inherit;
	}
	.search-input::placeholder {
		color: rgba(255, 255, 255, 0.3);
	}

	.cancel-btn {
		background: none;
		border: none;
		color: #0a84ff;
		font-size: 15px;
		cursor: pointer;
		padding: 0;
		white-space: nowrap;
		font-family: inherit;
	}

	.results-list {
		margin-top: 12px;
		overflow-y: auto;
		flex: 1;
		-webkit-overflow-scrolling: touch;
	}

	.section-label {
		padding: 8px 4px 6px;
		font-size: 12px;
		color: rgba(255, 255, 255, 0.35);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.result-item {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		text-align: left;
		padding: 14px 12px;
		background: rgba(28, 28, 30, 0.7);
		border: none;
		border-bottom: 1px solid rgba(255, 255, 255, 0.05);
		cursor: pointer;
		transition: background 0.15s;
		font-family: inherit;
	}
	.result-item:first-of-type {
		border-radius: 12px 12px 0 0;
	}
	.result-item:last-of-type {
		border-radius: 0 0 12px 12px;
		border-bottom: none;
	}
	.result-item:only-of-type {
		border-radius: 12px;
	}
	.result-item:active {
		background: rgba(44, 44, 46, 0.9);
	}

	.result-pin {
		color: rgba(255, 255, 255, 0.3);
		flex-shrink: 0;
	}

	.result-name {
		font-size: 15px;
		color: white;
	}

	.result-region {
		font-size: 12px;
		color: rgba(255, 255, 255, 0.4);
		margin-top: 1px;
	}

	.result-placeholder {
		padding: 20px 12px;
		font-size: 14px;
		color: rgba(255, 255, 255, 0.35);
		text-align: center;
	}

	@keyframes overlayIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
