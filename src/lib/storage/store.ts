import type { Task, List, SyncMeta } from '$lib/core/types.js';

export interface TodoStore {
	initialize(): Promise<void>;
	close(): Promise<void>;

	// Tasks
	getAllTasks(): Promise<Task[]>;
	getTasksByDate(date: string): Promise<Task[]>;
	getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]>;
	getTasksByList(listId: string): Promise<Task[]>;
	getParkedTasks(): Promise<Task[]>;
	getTask(id: string): Promise<Task | null>;
	upsertTask(task: Task): Promise<void>;
	upsertTasks(tasks: Task[]): Promise<void>;
	softDeleteTask(id: string): Promise<void>;

	// Lists
	getAllLists(): Promise<List[]>;
	getList(id: string): Promise<List | null>;
	upsertList(list: List): Promise<void>;
	softDeleteList(id: string): Promise<void>;

	// Settings
	getSetting(key: string): Promise<string | null>;
	setSetting(key: string, value: string): Promise<void>;
	getAllSettings(): Promise<Record<string, string>>;

	// Sync support
	getChangedSince(since: string): Promise<SyncMeta>;
	getLastSyncTime(): Promise<string | null>;
	setLastSyncTime(time: string): Promise<void>;
}
