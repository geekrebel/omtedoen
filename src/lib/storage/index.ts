import type { TodoStore } from './store.js';

export type { TodoStore };
export type StoreType = 'sqlite' | 'memory';

export async function createStore(): Promise<{ store: TodoStore; type: StoreType }> {
	if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
		try {
			const { SqliteStore } = await import('./sqlite-store.js');
			const store = new SqliteStore();
			await store.initialize();
			console.log('[OmTeDoen] Using SQLite store (persistent)');
			return { store, type: 'sqlite' };
		} catch (err) {
			console.error('[OmTeDoen] SQLite failed to initialize — data will NOT persist!', err);
			// Still fall through to memory store so the app is usable,
			// but surface a warning the user can see.
		}
	}
	// Fallback for web/PWA/dev — data is in-memory only
	console.warn('[OmTeDoen] Using in-memory store — tasks will be lost on restart');
	const { MemoryStore } = await import('./memory-store.js');
	const store = new MemoryStore();
	await store.initialize();
	return { store, type: 'memory' };
}
