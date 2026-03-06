import type { SyncAdapter, RemoteChanges, LocalChanges } from './sync-engine.js';

/**
 * iCloud Drive sync adapter.
 *
 * Writes/reads JSON files to ~/Library/Mobile Documents/com~apple~CloudDocs/OmTeDoen/
 * iCloud Drive handles the actual cloud sync between devices.
 *
 * File structure:
 *   OmTeDoen/
 *   ├── manifest.json
 *   └── {deviceId}/
 *       ├── snapshot.json      (periodic full state)
 *       └── changes/
 *           ├── {timestamp}.json
 *           └── ...
 */

const ICLOUD_BASE = '~/Library/Mobile Documents/com~apple~CloudDocs/OmTeDoen';

async function getTauriFsOps() {
	const { readTextFile, writeTextFile, readDir, mkdir, exists, remove } = await import(
		'@tauri-apps/plugin-fs'
	);
	return { readTextFile, writeTextFile, readDir, mkdir, exists, remove };
}

function expandPath(p: string): string {
	// Tauri fs plugin handles ~ expansion via BaseDirectory, but we'll use the resolved path
	return p.replace('~', '');
}

export class ICloudAdapter implements SyncAdapter {
	private basePath: string;

	constructor() {
		// Resolve the actual home directory path at runtime
		this.basePath = '';
	}

	private async ensureBasePath(): Promise<string> {
		if (this.basePath) return this.basePath;

		try {
			const { homeDir } = await import('@tauri-apps/api/path');
			const home = await homeDir();
			this.basePath = `${home}Library/Mobile Documents/com~apple~CloudDocs/OmTeDoen`;
		} catch {
			// Fallback for dev
			this.basePath = '/tmp/OmTeDoen-sync';
		}
		return this.basePath;
	}

	async isAvailable(): Promise<boolean> {
		try {
			const base = await this.ensureBasePath();
			const { exists, mkdir } = await getTauriFsOps();
			const parentDir = base.replace(/\/OmTeDoen$/, '');

			// Check if iCloud Drive directory exists
			if (await exists(parentDir)) {
				// Create our app directory if it doesn't exist
				if (!(await exists(base))) {
					await mkdir(base, { recursive: true });
				}
				return true;
			}
			return false;
		} catch {
			return false;
		}
	}

	async readRemoteChanges(since: string, deviceId: string): Promise<RemoteChanges> {
		const base = await this.ensureBasePath();
		const { readDir, readTextFile, exists } = await getTauriFsOps();

		const result: RemoteChanges = { tasks: [], lists: [] };

		try {
			const entries = await readDir(base);

			for (const entry of entries) {
				if (!entry.isDirectory || entry.name === deviceId) continue;

				const changesDir = `${base}/${entry.name}/changes`;
				if (!(await exists(changesDir))) continue;

				const changeFiles = await readDir(changesDir);
				for (const file of changeFiles) {
					if (!file.name?.endsWith('.json')) continue;

					// Extract timestamp from filename
					const fileTs = file.name.replace('.json', '').replace(/-/g, ':');
					if (fileTs <= since) continue;

					try {
						const content = await readTextFile(`${changesDir}/${file.name}`);
						const changes: LocalChanges = JSON.parse(content);
						result.tasks.push(...changes.tasks);
						result.lists.push(...changes.lists);
					} catch {
						// Skip corrupted files
					}
				}
			}
		} catch {
			// Directory might not exist yet
		}

		return result;
	}

	async writeLocalChanges(changes: LocalChanges, deviceId: string): Promise<void> {
		const base = await this.ensureBasePath();
		const { writeTextFile, mkdir, exists } = await getTauriFsOps();

		const deviceDir = `${base}/${deviceId}`;
		const changesDir = `${deviceDir}/changes`;

		if (!(await exists(changesDir))) {
			await mkdir(changesDir, { recursive: true });
		}

		// Use timestamp as filename (colons replaced with dashes for filesystem)
		const filename = changes.timestamp.replace(/:/g, '-').replace(/\./g, '-');
		await writeTextFile(
			`${changesDir}/${filename}.json`,
			JSON.stringify(changes, null, 2)
		);
	}

	async getLastPullTime(deviceId: string): Promise<string | null> {
		const base = await this.ensureBasePath();
		const { readTextFile, exists } = await getTauriFsOps();

		const metaPath = `${base}/${deviceId}/meta.json`;
		try {
			if (await exists(metaPath)) {
				const content = await readTextFile(metaPath);
				const meta = JSON.parse(content);
				return meta.lastPullTime || null;
			}
		} catch {
			// ignore
		}
		return null;
	}

	async setLastPullTime(deviceId: string, time: string): Promise<void> {
		const base = await this.ensureBasePath();
		const { writeTextFile, mkdir, exists } = await getTauriFsOps();

		const deviceDir = `${base}/${deviceId}`;
		if (!(await exists(deviceDir))) {
			await mkdir(deviceDir, { recursive: true });
		}

		await writeTextFile(
			`${deviceDir}/meta.json`,
			JSON.stringify({ lastPullTime: time, updatedAt: new Date().toISOString() })
		);
	}
}
