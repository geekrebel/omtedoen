import type { TodoStore } from './store.js';

export type { TodoStore };

export async function createStore(): Promise<TodoStore> {
	if (typeof window !== 'undefined' && '__TAURI__' in window) {
		const { SqliteStore } = await import('./sqlite-store.js');
		const store = new SqliteStore();
		await store.initialize();
		return store;
	}
	// Fallback for web/PWA/dev
	const { MemoryStore } = await import('./memory-store.js');
	const store = new MemoryStore();
	await store.initialize();
	return store;
}
