export type Priority = 'must' | 'should' | 'want';
export type ColorLabel = 'none' | 'red' | 'amber' | 'teal';

export interface TaskStep {
	id: string;
	text: string;
	done: boolean;
}

export interface Task {
	id: string;
	title: string;
	markdownBody: string | null;
	isCompleted: boolean;
	completedAt: string | null;

	// Scheduling
	dateTarget: string | null; // ISO date YYYY-MM-DD, null for someday
	listId: string | null; // FK to List, null for date-scheduled
	sortOrder: number;

	// ADHD features
	priority: Priority;
	focused: boolean;
	colorLabel: ColorLabel;
	parked: boolean;
	parkedAt: string | null;
	rolloverCount: number;

	// Recurrence
	recurrenceRule: string | null;
	recurrenceNext: string | null;

	// Decomposition
	steps: TaskStep[];

	// Sync metadata
	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	fieldTimestamps: Record<string, string>;
	deviceId: string | null;
}

export interface List {
	id: string;
	name: string;
	sortOrder: number;
	color: string | null;
	isParkingLot: boolean;
	isDefault: boolean;

	createdAt: string;
	updatedAt: string;
	deletedAt: string | null;
	fieldTimestamps: Record<string, string>;
	deviceId: string | null;
}

export interface SyncMeta {
	tasks: Task[];
	lists: List[];
	settings: Array<{ key: string; value: string; updatedAt: string }>;
}

export interface SyncResult {
	pushed: number;
	pulled: number;
	conflicts: number;
	errors: string[];
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export function createTask(overrides: Partial<Task> & { id: string; title: string }): Task {
	const now = new Date().toISOString();
	return {
		markdownBody: null,
		isCompleted: false,
		completedAt: null,
		dateTarget: null,
		listId: null,
		sortOrder: 0,
		priority: 'should',
		focused: false,
		colorLabel: 'none',
		parked: false,
		parkedAt: null,
		rolloverCount: 0,
		recurrenceRule: null,
		recurrenceNext: null,
		steps: [],
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		fieldTimestamps: {},
		deviceId: null,
		...overrides
	};
}

export function createList(overrides: Partial<List> & { id: string; name: string }): List {
	const now = new Date().toISOString();
	return {
		sortOrder: 0,
		color: null,
		isParkingLot: false,
		isDefault: false,
		createdAt: now,
		updatedAt: now,
		deletedAt: null,
		fieldTimestamps: {},
		deviceId: null,
		...overrides
	};
}
