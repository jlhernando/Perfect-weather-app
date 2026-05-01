import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: ({ filename }) => (filename.split(/[/\\]/).includes('node_modules') ? undefined : true)
	},
	kit: {
		adapter: adapter(),
		prerender: {
			handleHttpError({ path }) {
				// /api/* routes are CF Pages Functions, not SvelteKit routes
				if (path.startsWith('/api/')) return 'ignore';
				throw new Error(`404: ${path}`);
			}
		}
	}
};

export default config;
