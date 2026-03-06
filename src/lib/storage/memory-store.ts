import type { Task, List, SyncMeta } from '$lib/core/types.js';
import type { TodoStore } from './store.js';

/**
 * In-memory store for development and testing.
 * Data is lost when the app is closed.
 */
export class MemoryStore implements TodoStore {
	private tasks: Map<string, Task> = new Map();
	private lists: Map<string, List> = new Map();
	private settings: Map<string, { value: string; updatedAt: string }> = new Map();
	private lastSyncTime: string | null = null;

	async initialize(): Promise<void> {
		// Nothing to do
	}

	async close(): Promise<void> {
		// Nothing to do
	}

	// Tasks

	async getAllTasks(): Promise<Task[]> {
		return Array.from(this.tasks.values()).filter((t) => !t.deletedAt);
	}

	async getTasksByDate(date: string): Promise<Task[]> {
		return Array.from(this.tasks.values())
			.filter((t) => t.dateTarget === date && !t.deletedAt && !t.parked)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]> {
		return Array.from(this.tasks.values())
			.filter(
				(t) =>
					t.dateTarget !== null &&
					t.dateTarget >= startDate &&
					t.dateTarget <= endDate &&
					!t.deletedAt &&
					!t.parked
			)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async getTasksByList(listId: string): Promise<Task[]> {
		return Array.from(this.tasks.values())
			.filter((t) => t.listId === listId && !t.deletedAt)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async getParkedTasks(): Promise<Task[]> {
		return Array.from(this.tasks.values())
			.filter((t) => t.parked && !t.deletedAt)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async getTask(id: string): Promise<Task | null> {
		return this.tasks.get(id) ?? null;
	}

	async upsertTask(task: Task): Promise<void> {
		this.tasks.set(task.id, { ...task });
	}

	async upsertTasks(tasks: Task[]): Promise<void> {
		for (const task of tasks) {
			this.tasks.set(task.id, { ...task });
		}
	}

	async softDeleteTask(id: string): Promise<void> {
		const task = this.tasks.get(id);
		if (task) {
			const now = new Date().toISOString();
			this.tasks.set(id, {
				...task,
				deletedAt: now,
				updatedAt: now,
				fieldTimestamps: { ...task.fieldTimestamps, deletedAt: now }
			});
		}
	}

	// Lists

	async getAllLists(): Promise<List[]> {
		return Array.from(this.lists.values())
			.filter((l) => !l.deletedAt)
			.sort((a, b) => a.sortOrder - b.sortOrder);
	}

	async getList(id: string): Promise<List | null> {
		return this.lists.get(id) ?? null;
	}

	async upsertList(list: List): Promise<void> {
		this.lists.set(list.id, { ...list });
	}

	async softDeleteList(id: string): Promise<void> {
		const list = this.lists.get(id);
		if (list) {
			const now = new Date().toISOString();
			this.lists.set(id, {
				...list,
				deletedAt: now,
				updatedAt: now,
				fieldTimestamps: { ...list.fieldTimestamps, deletedAt: now }
			});
		}
	}

	// Settings

	async getSetting(key: string): Promise<string | null> {
		return this.settings.get(key)?.value ?? null;
	}

	async setSetting(key: string, value: string): Promise<void> {
		this.settings.set(key, { value, updatedAt: new Date().toISOString() });
	}

	async getAllSettings(): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		for (const [key, { value }] of this.settings) {
			result[key] = value;
		}
		return result;
	}

	// Sync

	async getChangedSince(since: string): Promise<SyncMeta> {
		const tasks = Array.from(this.tasks.values()).filter((t) => t.updatedAt > since);
		const lists = Array.from(this.lists.values()).filter((l) => l.updatedAt > since);
		const settings = Array.from(this.settings.entries())
			.filter(([, v]) => v.updatedAt > since)
			.map(([key, v]) => ({ key, value: v.value, updatedAt: v.updatedAt }));
		return { tasks, lists, settings };
	}

	async getLastSyncTime(): Promise<string | null> {
		return this.lastSyncTime;
	}

	async setLastSyncTime(time: string): Promise<void> {
		this.lastSyncTime = time;
	}
}
