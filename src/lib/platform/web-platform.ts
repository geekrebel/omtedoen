import type { Platform } from './platform.js';

export class WebPlatform implements Platform {
	isTauri(): boolean {
		return false;
	}

	async registerGlobalShortcut(_shortcut: string, _callback: () => void): Promise<void> {
		// Global shortcuts not supported in web mode
	}

	async unregisterGlobalShortcut(_shortcut: string): Promise<void> {
		// No-op
	}

	async getDeviceId(): Promise<string> {
		let id = localStorage.getItem('omtedoen_device_id');
		if (!id) {
			const { ulid } = await import('ulidx');
			id = `web-${ulid()}`;
			localStorage.setItem('omtedoen_device_id', id);
		}
		return id;
	}
}
