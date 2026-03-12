import type { Task, List, SyncMeta, TaskStep } from '$lib/core/types.js';
import type { TodoStore } from './store.js';

// Tauri SQL plugin types
interface Database {
	select<T>(query: string, bindValues?: unknown[]): Promise<T>;
	execute(query: string, bindValues?: unknown[]): Promise<{ rowsAffected: number }>;
	close(): Promise<boolean>;
}

interface TaskRow {
	id: string;
	title: string;
	markdown_body: string | null;
	is_completed: number;
	completed_at: string | null;
	date_target: string | null;
	list_id: string | null;
	sort_order: number;
	priority: string;
	focused: number;
	color_label: string;
	parked: number;
	parked_at: string | null;
	rollover_count: number;
	recurrence_rule: string | null;
	recurrence_next: string | null;
	steps: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	field_timestamps: string;
	device_id: string | null;
}

interface ListRow {
	id: string;
	name: string;
	sort_order: number;
	color: string | null;
	is_parking_lot: number;
	is_default: number;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	field_timestamps: string;
	device_id: string | null;
}

interface SettingRow {
	key: string;
	value: string;
	updated_at: string;
	device_id: string | null;
}

function rowToTask(row: TaskRow): Task {
	return {
		id: row.id,
		title: row.title,
		markdownBody: row.markdown_body,
		isCompleted: row.is_completed === 1,
		completedAt: row.completed_at,
		dateTarget: row.date_target,
		listId: row.list_id,
		sortOrder: row.sort_order,
		priority: row.priority as Task['priority'],
		focused: (row.focused ?? 0) === 1,
		colorLabel: (row.color_label as Task['colorLabel']) ?? 'none',
		parked: row.parked === 1,
		parkedAt: row.parked_at,
		rolloverCount: row.rollover_count,
		recurrenceRule: row.recurrence_rule,
		recurrenceNext: row.recurrence_next,
		steps: row.steps ? JSON.parse(row.steps) : [],
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		fieldTimestamps: JSON.parse(row.field_timestamps || '{}'),
		deviceId: row.device_id
	};
}

function rowToList(row: ListRow): List {
	return {
		id: row.id,
		name: row.name,
		sortOrder: row.sort_order,
		color: row.color,
		isParkingLot: row.is_parking_lot === 1,
		isDefault: row.is_default === 1,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		deletedAt: row.deleted_at,
		fieldTimestamps: JSON.parse(row.field_timestamps || '{}'),
		deviceId: row.device_id
	};
}

export class SqliteStore implements TodoStore {
	private db: Database | null = null;

	async initialize(): Promise<void> {
		const { default: Database } = await import('@tauri-apps/plugin-sql');
		this.db = await (Database as any).load('sqlite:omtedoen.db');
		await this.runMigrations();
	}

	private async runMigrations(): Promise<void> {
		const db = this.db!;

		await db.execute(`
			CREATE TABLE IF NOT EXISTS tasks (
				id TEXT PRIMARY KEY,
				title TEXT NOT NULL DEFAULT '',
				markdown_body TEXT,
				is_completed INTEGER NOT NULL DEFAULT 0,
				completed_at TEXT,
				date_target TEXT,
				list_id TEXT,
				sort_order REAL NOT NULL DEFAULT 0,
				priority TEXT DEFAULT 'should' CHECK(priority IN ('must', 'should', 'want')),
				parked INTEGER NOT NULL DEFAULT 0,
				parked_at TEXT,
				rollover_count INTEGER NOT NULL DEFAULT 0,
				recurrence_rule TEXT,
				recurrence_next TEXT,
				steps TEXT,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
				deleted_at TEXT,
				field_timestamps TEXT NOT NULL DEFAULT '{}',
				device_id TEXT
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS lists (
				id TEXT PRIMARY KEY,
				name TEXT NOT NULL,
				sort_order REAL NOT NULL DEFAULT 0,
				color TEXT,
				is_parking_lot INTEGER NOT NULL DEFAULT 0,
				is_default INTEGER NOT NULL DEFAULT 0,
				created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
				deleted_at TEXT,
				field_timestamps TEXT NOT NULL DEFAULT '{}',
				device_id TEXT
			)
		`);

		await db.execute(`
			CREATE TABLE IF NOT EXISTS settings (
				key TEXT PRIMARY KEY,
				value TEXT NOT NULL,
				updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%f', 'now')),
				device_id TEXT
			)
		`);

		// Migration: add focused and color_label columns
		await db.execute(`ALTER TABLE tasks ADD COLUMN focused INTEGER NOT NULL DEFAULT 0`).catch(() => {});
		await db.execute(`ALTER TABLE tasks ADD COLUMN color_label TEXT NOT NULL DEFAULT 'none'`).catch(() => {});
		await db.execute(`ALTER TABLE lists ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0`).catch(() => {});

		await db.execute(
			`CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date_target) WHERE deleted_at IS NULL`
		);
		await db.execute(
			`CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id) WHERE deleted_at IS NULL`
		);
		await db.execute(
			`CREATE INDEX IF NOT EXISTS idx_tasks_parked ON tasks(parked) WHERE deleted_at IS NULL AND parked = 1`
		);
		await db.execute(`CREATE INDEX IF NOT EXISTS idx_tasks_updated ON tasks(updated_at)`);
	}

	async close(): Promise<void> {
		if (this.db) {
			await this.db.close();
			this.db = null;
		}
	}

	// Tasks

	async getAllTasks(): Promise<Task[]> {
		const rows = await this.db!.select<TaskRow[]>('SELECT * FROM tasks WHERE deleted_at IS NULL');
		return rows.map(rowToTask);
	}

	async getTasksByDate(date: string): Promise<Task[]> {
		const rows = await this.db!.select<TaskRow[]>(
			'SELECT * FROM tasks WHERE date_target = $1 AND deleted_at IS NULL AND parked = 0 ORDER BY sort_order',
			[date]
		);
		return rows.map(rowToTask);
	}

	async getTasksByDateRange(startDate: string, endDate: string): Promise<Task[]> {
		const rows = await this.db!.select<TaskRow[]>(
			'SELECT * FROM tasks WHERE date_target >= $1 AND date_target <= $2 AND deleted_at IS NULL AND parked = 0 ORDER BY date_target, sort_order',
			[startDate, endDate]
		);
		return rows.map(rowToTask);
	}

	async getTasksByList(listId: string): Promise<Task[]> {
		const rows = await this.db!.select<TaskRow[]>(
			'SELECT * FROM tasks WHERE list_id = $1 AND deleted_at IS NULL ORDER BY sort_order',
			[listId]
		);
		return rows.map(rowToTask);
	}

	async getParkedTasks(): Promise<Task[]> {
		const rows = await this.db!.select<TaskRow[]>(
			'SELECT * FROM tasks WHERE parked = 1 AND deleted_at IS NULL ORDER BY parked_at DESC'
		);
		return rows.map(rowToTask);
	}

	async getTask(id: string): Promise<Task | null> {
		const rows = await this.db!.select<TaskRow[]>('SELECT * FROM tasks WHERE id = $1', [id]);
		return rows.length > 0 ? rowToTask(rows[0]) : null;
	}

	async upsertTask(task: Task): Promise<void> {
		await this.db!.execute(
			`INSERT INTO tasks (id, title, markdown_body, is_completed, completed_at,
				date_target, list_id, sort_order, priority, focused, color_label,
				parked, parked_at,
				rollover_count, recurrence_rule, recurrence_next, steps,
				created_at, updated_at, deleted_at, field_timestamps, device_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
			ON CONFLICT(id) DO UPDATE SET
				title=excluded.title, markdown_body=excluded.markdown_body,
				is_completed=excluded.is_completed, completed_at=excluded.completed_at,
				date_target=excluded.date_target, list_id=excluded.list_id,
				sort_order=excluded.sort_order, priority=excluded.priority,
				focused=excluded.focused, color_label=excluded.color_label,
				parked=excluded.parked, parked_at=excluded.parked_at,
				rollover_count=excluded.rollover_count, recurrence_rule=excluded.recurrence_rule,
				recurrence_next=excluded.recurrence_next, steps=excluded.steps,
				updated_at=excluded.updated_at, deleted_at=excluded.deleted_at,
				field_timestamps=excluded.field_timestamps, device_id=excluded.device_id`,
			[
				task.id,
				task.title,
				task.markdownBody,
				task.isCompleted ? 1 : 0,
				task.completedAt,
				task.dateTarget,
				task.listId,
				task.sortOrder,
				task.priority,
				task.focused ? 1 : 0,
				task.colorLabel,
				task.parked ? 1 : 0,
				task.parkedAt,
				task.rolloverCount,
				task.recurrenceRule,
				task.recurrenceNext,
				task.steps.length > 0 ? JSON.stringify(task.steps) : null,
				task.createdAt,
				task.updatedAt,
				task.deletedAt,
				JSON.stringify(task.fieldTimestamps),
				task.deviceId
			]
		);
	}

	async upsertTasks(tasks: Task[]): Promise<void> {
		for (const task of tasks) {
			await this.upsertTask(task);
		}
	}

	async softDeleteTask(id: string): Promise<void> {
		const now = new Date().toISOString();
		await this.db!.execute(
			'UPDATE tasks SET deleted_at = $1, updated_at = $1 WHERE id = $2',
			[now, id]
		);
	}

	// Lists

	async getAllLists(): Promise<List[]> {
		const rows = await this.db!.select<ListRow[]>(
			'SELECT * FROM lists WHERE deleted_at IS NULL ORDER BY sort_order'
		);
		return rows.map(rowToList);
	}

	async getList(id: string): Promise<List | null> {
		const rows = await this.db!.select<ListRow[]>('SELECT * FROM lists WHERE id = $1', [id]);
		return rows.length > 0 ? rowToList(rows[0]) : null;
	}

	async upsertList(list: List): Promise<void> {
		await this.db!.execute(
			`INSERT INTO lists (id, name, sort_order, color, is_parking_lot, is_default,
				created_at, updated_at, deleted_at, field_timestamps, device_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
			ON CONFLICT(id) DO UPDATE SET
				name=excluded.name, sort_order=excluded.sort_order,
				color=excluded.color, is_parking_lot=excluded.is_parking_lot,
				is_default=excluded.is_default,
				updated_at=excluded.updated_at, deleted_at=excluded.deleted_at,
				field_timestamps=excluded.field_timestamps, device_id=excluded.device_id`,
			[
				list.id,
				list.name,
				list.sortOrder,
				list.color,
				list.isParkingLot ? 1 : 0,
				list.isDefault ? 1 : 0,
				list.createdAt,
				list.updatedAt,
				list.deletedAt,
				JSON.stringify(list.fieldTimestamps),
				list.deviceId
			]
		);
	}

	async softDeleteList(id: string): Promise<void> {
		const now = new Date().toISOString();
		await this.db!.execute(
			'UPDATE lists SET deleted_at = $1, updated_at = $1 WHERE id = $2',
			[now, id]
		);
	}

	// Settings

	async getSetting(key: string): Promise<string | null> {
		const rows = await this.db!.select<SettingRow[]>(
			'SELECT * FROM settings WHERE key = $1',
			[key]
		);
		return rows.length > 0 ? rows[0].value : null;
	}

	async setSetting(key: string, value: string): Promise<void> {
		const now = new Date().toISOString();
		await this.db!.execute(
			`INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
			ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at`,
			[key, value, now]
		);
	}

	async getAllSettings(): Promise<Record<string, string>> {
		const rows = await this.db!.select<SettingRow[]>('SELECT * FROM settings');
		const result: Record<string, string> = {};
		for (const row of rows) {
			result[row.key] = row.value;
		}
		return result;
	}

	// Sync

	async getChangedSince(since: string): Promise<SyncMeta> {
		const tasks = (
			await this.db!.select<TaskRow[]>('SELECT * FROM tasks WHERE updated_at > $1', [since])
		).map(rowToTask);

		const lists = (
			await this.db!.select<ListRow[]>('SELECT * FROM lists WHERE updated_at > $1', [since])
		).map(rowToList);

		const settings = (
			await this.db!.select<SettingRow[]>('SELECT * FROM settings WHERE updated_at > $1', [
				since
			])
		).map((r) => ({ key: r.key, value: r.value, updatedAt: r.updated_at }));

		return { tasks, lists, settings };
	}

	async getLastSyncTime(): Promise<string | null> {
		return this.getSetting('__last_sync_time');
	}

	async setLastSyncTime(time: string): Promise<void> {
		await this.setSetting('__last_sync_time', time);
	}
}
