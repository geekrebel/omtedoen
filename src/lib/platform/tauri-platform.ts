import type { Platform } from './platform.js';

export class TauriPlatform implements Platform {
	private deviceId: string | null = null;

	isTauri(): boolean {
		return true;
	}

	async registerGlobalShortcut(shortcut: string, callback: () => void): Promise<void> {
		try {
			const { register } = await import('@tauri-apps/plugin-global-shortcut');
			await register(shortcut, callback);
		} catch (e) {
			console.warn('Failed to register global shortcut:', e);
		}
	}

	async unregisterGlobalShortcut(shortcut: string): Promise<void> {
		try {
			const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
			await unregister(shortcut);
		} catch (e) {
			console.warn('Failed to unregister global shortcut:', e);
		}
	}

	async getDeviceId(): Promise<string> {
		if (this.deviceId) return this.deviceId;

		// Try to load from SQLite settings
		try {
			const { default: Database } = await import('@tauri-apps/plugin-sql');
			const db = await (Database as any).load('sqlite:omtedoen.db');
			const rows = await db.select(
				"SELECT value FROM settings WHERE key = '__device_id'"
			) as Array<{ value: string }>;
			if (rows.length > 0) {
				this.deviceId = rows[0].value;
				return this.deviceId;
			}
		} catch {
			// ignore
		}

		// Generate new device ID
		const { ulid } = await import('ulidx');
		this.deviceId = `device-${ulid()}`;

		// Persist it
		try {
			const { default: Database } = await import('@tauri-apps/plugin-sql');
			const db = await (Database as any).load('sqlite:omtedoen.db');
			await db.execute(
				"INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('__device_id', $1, $2)",
				[this.deviceId, new Date().toISOString()]
			);
		} catch {
			// ignore
		}

		return this.deviceId;
	}
}
