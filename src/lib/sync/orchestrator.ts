import type { TodoStore } from '$lib/storage/store.js';
import type { SyncResult, SyncStatus, Task, List } from '$lib/core/types.js';
import type { SyncEngine, SyncAdapter } from './sync-engine.js';
import { mergeTask, mergeList } from '$lib/core/merge.js';

const SYNC_INTERVAL_MS = 60_000; // 60 seconds

export class SyncOrchestrator implements SyncEngine {
	private store: TodoStore | null = null;
	private adapter: SyncAdapter;
	private deviceId: string = '';
	private status: SyncStatus = 'idle';
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private debounceTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(adapter: SyncAdapter) {
		this.adapter = adapter;
	}

	async initialize(store: TodoStore, deviceId: string): Promise<void> {
		this.store = store;
		this.deviceId = deviceId;

		const available = await this.adapter.isAvailable();
		if (!available) {
			this.status = 'offline';
			return;
		}

		// Initial sync
		await this.sync();

		// Periodic sync
		this.intervalId = setInterval(() => this.sync(), SYNC_INTERVAL_MS);

		// Sync on window focus
		if (typeof window !== 'undefined') {
			window.addEventListener('focus', () => this.debouncedSync());
		}
	}

	getStatus(): SyncStatus {
		return this.status;
	}

	private debouncedSync(): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => this.sync(), 2000);
	}

	async push(): Promise<SyncResult> {
		if (!this.store) return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Store not initialized'] };

		try {
			const lastSync = (await this.store.getLastSyncTime()) || '1970-01-01T00:00:00.000Z';
			const changed = await this.store.getChangedSince(lastSync);

			if (changed.tasks.length === 0 && changed.lists.length === 0) {
				return { pushed: 0, pulled: 0, conflicts: 0, errors: [] };
			}

			const localChanges = {
				tasks: changed.tasks.map((t) => ({
					id: t.id,
					fields: taskToFields(t),
					fieldTimestamps: t.fieldTimestamps
				})),
				lists: changed.lists.map((l) => ({
					id: l.id,
					fields: listToFields(l),
					fieldTimestamps: l.fieldTimestamps
				})),
				timestamp: new Date().toISOString()
			};

			await this.adapter.writeLocalChanges(localChanges, this.deviceId);
			await this.store.setLastSyncTime(localChanges.timestamp);

			return { pushed: changed.tasks.length + changed.lists.length, pulled: 0, conflicts: 0, errors: [] };
		} catch (e) {
			return { pushed: 0, pulled: 0, conflicts: 0, errors: [String(e)] };
		}
	}

	async pull(): Promise<SyncResult> {
		if (!this.store) return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Store not initialized'] };

		try {
			const lastPull = (await this.adapter.getLastPullTime(this.deviceId)) || '1970-01-01T00:00:00.000Z';
			const remote = await this.adapter.readRemoteChanges(lastPull, this.deviceId);

			let pulled = 0;
			let conflicts = 0;

			// Merge tasks
			for (const remoteTask of remote.tasks) {
				const local = await this.store.getTask(remoteTask.id);
				if (local) {
					const remoteAsFull = fieldsToTask(remoteTask.id, remoteTask.fields, remoteTask.fieldTimestamps);
					const merged = mergeTask(local, remoteAsFull);
					await this.store.upsertTask(merged);
					conflicts++;
				} else {
					const newTask = fieldsToTask(remoteTask.id, remoteTask.fields, remoteTask.fieldTimestamps);
					await this.store.upsertTask(newTask);
				}
				pulled++;
			}

			// Merge lists
			for (const remoteList of remote.lists) {
				const local = await this.store.getList(remoteList.id);
				if (local) {
					const remoteAsFull = fieldsToList(remoteList.id, remoteList.fields, remoteList.fieldTimestamps);
					const merged = mergeList(local, remoteAsFull);
					await this.store.upsertList(merged);
					conflicts++;
				} else {
					const newList = fieldsToList(remoteList.id, remoteList.fields, remoteList.fieldTimestamps);
					await this.store.upsertList(newList);
				}
				pulled++;
			}

			await this.adapter.setLastPullTime(this.deviceId, new Date().toISOString());

			return { pushed: 0, pulled, conflicts, errors: [] };
		} catch (e) {
			return { pushed: 0, pulled: 0, conflicts: 0, errors: [String(e)] };
		}
	}

	async sync(): Promise<SyncResult> {
		if (this.status === 'syncing') return { pushed: 0, pulled: 0, conflicts: 0, errors: ['Already syncing'] };

		this.status = 'syncing';
		try {
			const pullResult = await this.pull();
			const pushResult = await this.push();

			this.status = 'idle';
			return {
				pushed: pushResult.pushed,
				pulled: pullResult.pulled,
				conflicts: pullResult.conflicts,
				errors: [...pullResult.errors, ...pushResult.errors]
			};
		} catch (e) {
			this.status = 'error';
			return { pushed: 0, pulled: 0, conflicts: 0, errors: [String(e)] };
		}
	}

	destroy(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = null;
		}
	}
}

// Helper functions to convert between flat field maps and full types

function taskToFields(task: Task): Record<string, any> {
	return {
		title: task.title,
		markdownBody: task.markdownBody,
		isCompleted: task.isCompleted,
		completedAt: task.completedAt,
		dateTarget: task.dateTarget,
		listId: task.listId,
		sortOrder: task.sortOrder,
		priority: task.priority,
		focused: task.focused,
		colorLabel: task.colorLabel,
		parked: task.parked,
		parkedAt: task.parkedAt,
		rolloverCount: task.rolloverCount,
		recurrenceRule: task.recurrenceRule,
		recurrenceNext: task.recurrenceNext,
		steps: task.steps,
		createdAt: task.createdAt,
		updatedAt: task.updatedAt,
		deletedAt: task.deletedAt,
		deviceId: task.deviceId
	};
}

function fieldsToTask(id: string, fields: Record<string, any>, fieldTimestamps: Record<string, string>): Task {
	return {
		id,
		title: fields.title || '',
		markdownBody: fields.markdownBody || null,
		isCompleted: fields.isCompleted || false,
		completedAt: fields.completedAt || null,
		dateTarget: fields.dateTarget || null,
		listId: fields.listId || null,
		sortOrder: fields.sortOrder || 0,
		priority: fields.priority || 'should',
		focused: fields.focused || false,
		colorLabel: fields.colorLabel || 'none',
		parked: fields.parked || false,
		parkedAt: fields.parkedAt || null,
		rolloverCount: fields.rolloverCount || 0,
		recurrenceRule: fields.recurrenceRule || null,
		recurrenceNext: fields.recurrenceNext || null,
		steps: fields.steps || [],
		createdAt: fields.createdAt || new Date().toISOString(),
		updatedAt: fields.updatedAt || new Date().toISOString(),
		deletedAt: fields.deletedAt || null,
		fieldTimestamps,
		deviceId: fields.deviceId || null
	};
}

function listToFields(list: List): Record<string, any> {
	return {
		name: list.name,
		sortOrder: list.sortOrder,
		color: list.color,
		isParkingLot: list.isParkingLot,
		isDefault: list.isDefault,
		createdAt: list.createdAt,
		updatedAt: list.updatedAt,
		deletedAt: list.deletedAt,
		deviceId: list.deviceId
	};
}

function fieldsToList(id: string, fields: Record<string, any>, fieldTimestamps: Record<string, string>): List {
	return {
		id,
		name: fields.name || '',
		sortOrder: fields.sortOrder || 0,
		color: fields.color || null,
		isParkingLot: fields.isParkingLot || false,
		isDefault: fields.isDefault || false,
		createdAt: fields.createdAt || new Date().toISOString(),
		updatedAt: fields.updatedAt || new Date().toISOString(),
		deletedAt: fields.deletedAt || null,
		fieldTimestamps,
		deviceId: fields.deviceId || null
	};
}
