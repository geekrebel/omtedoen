import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	// Prevent vite from obscuring rust errors
	clearScreen: false,
	server: {
		port: 5173,
		strictPort: true,
		watch: {
			ignored: ['**/omtedoen.db', '**/omtedoen.db-wal', '**/omtedoen.db-shm']
		},
		fs: {
			allow: ['..']
		}
	}
});
