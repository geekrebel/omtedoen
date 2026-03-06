import type { Platform } from './platform.js';

export type { Platform };

export async function createPlatform(): Promise<Platform> {
	if (typeof window !== 'undefined' && '__TAURI__' in window) {
		const { TauriPlatform } = await import('./tauri-platform.js');
		return new TauriPlatform();
	}
	const { WebPlatform } = await import('./web-platform.js');
	return new WebPlatform();
}
