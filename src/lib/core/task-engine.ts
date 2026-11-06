import type { Task } from './types.js';
import { isBefore, todayISO, addDays } from '../utils/dates.js';
import { parseRecurrence, nextOccurrence } from './recurrence.js';

/**
 * Roll forward all incomplete tasks from past days to today.
 * Increments rolloverCount for each rolled task.
 * Returns only the tasks that were modified.
 */
export function rolloverTasks(tasks: Task[], today: string): Task[] {
	const now = new Date().toISOString();
	const modified: Task[] = [];

	for (const task of tasks) {
		if (
			task.dateTarget &&
			isBefore(task.dateTarget, today) &&
			!task.isCompleted &&
			!task.parked &&
			!task.deletedAt
		) {
			const updated: Task = {
				...task,
				dateTarget: today,
				rolloverCount: task.rolloverCount + 1,
				updatedAt: now,
				fieldTimestamps: {
					...task.fieldTimestamps,
					dateTarget: now,
					rolloverCount: now
				}
			};
			modified.push(updated);
		}
	}

	return modified;
}

/** A task that lives on a Someday board list (as opposed to the Parking Lot or no list). */
export function isBoardCard(task: Task, parkingLotListId: string | null): boolean {
	return task.listId !== null && task.listId !== parkingLotListId;
}

/**
 * Move tasks that have rolled over 3+ times to the parking lot.
 * Board cards are never moved off their list: they just drop off the day view
 * (date cleared, rollover reset) and stay where they are on the board.
 * Returns only the tasks that were changed.
 */
export function parkStaleTasks(tasks: Task[], parkingLotListId: string): Task[] {
	const now = new Date().toISOString();
	const parked: Task[] = [];

	for (const task of tasks) {
		if (
			task.rolloverCount >= 3 &&
			!task.parked &&
			!task.isCompleted &&
			!task.deletedAt
		) {
			if (isBoardCard(task, parkingLotListId)) {
				parked.push({
					...task,
					dateTarget: null,
					rolloverCount: 0,
					updatedAt: now,
					fieldTimestamps: {
						...task.fieldTimestamps,
						dateTarget: now,
						rolloverCount: now
					}
				});
				continue;
			}
			const updated: Task = {
				...task,
				parked: true,
				parkedAt: now,
				listId: parkingLotListId,
				dateTarget: null,
				updatedAt: now,
				fieldTimestamps: {
					...task.fieldTimestamps,
					parked: now,
					parkedAt: now,
					listId: now,
					dateTarget: now
				}
			};
			parked.push(updated);
		}
	}

	return parked;
}

/**
 * When a recurring task is completed, create the next instance.
 * Returns the new task instance or null if no recurrence rule.
 */
export function createNextRecurrence(completedTask: Task, newId: string): Task | null {
	if (!completedTask.recurrenceRule) return null;

	const parsed = parseRecurrence(completedTask.recurrenceRule);
	if (!parsed) return null;

	const baseDate = completedTask.dateTarget || todayISO();
	const nextDate = nextOccurrence(parsed, baseDate);
	if (!nextDate) return null;

	const now = new Date().toISOString();
	return {
		...completedTask,
		id: newId,
		isCompleted: false,
		completedAt: null,
		dateTarget: nextDate,
		rolloverCount: 0,
		parked: false,
		parkedAt: null,
		steps: completedTask.steps.map((s) => ({ ...s, done: false })),
		createdAt: now,
		updatedAt: now,
		fieldTimestamps: {}
	};
}

/**
 * The id of the instance a recurring task spawns when it is completed.
 * It is derived from the parent's id, so completing, un-completing and
 * completing again re-uses the same instance instead of making a second one.
 */
export function recurrenceChildId(parentId: string): string {
	// Four seeded FNV-1a passes → 128 bits of hex. Not cryptographic, just stable.
	let out = 'r';
	for (const seed of [0x811c9dc5, 0x01000193, 0x9e3779b9, 0x85ebca6b]) {
		let h = seed >>> 0;
		for (let i = 0; i < parentId.length; i++) {
			h ^= parentId.charCodeAt(i);
			h = Math.imul(h, 0x01000193) >>> 0;
		}
		out += h.toString(16).padStart(8, '0');
	}
	return out;
}

/**
 * Complete a task. Returns the updated task and optionally a new recurring instance.
 *
 * A recurring board card hands its place on the board to the next instance:
 * the completed copy leaves the list (and keeps a date, so it shows under Done),
 * otherwise a daily card would pile up one finished copy per day.
 */
export function completeTask(
	task: Task,
	newRecurrenceId: string = recurrenceChildId(task.id),
	parkingLotListId: string | null = null,
	today: string = todayISO()
): { completed: Task; nextInstance: Task | null } {
	const now = new Date().toISOString();
	let completed: Task = {
		...task,
		isCompleted: true,
		completedAt: now,
		updatedAt: now,
		fieldTimestamps: {
			...task.fieldTimestamps,
			isCompleted: now,
			completedAt: now
		}
	};

	const nextInstance = createNextRecurrence(completed, newRecurrenceId);
	if (nextInstance && isBoardCard(task, parkingLotListId)) {
		completed = {
			...completed,
			listId: null,
			dateTarget: completed.dateTarget ?? today,
			fieldTimestamps: { ...completed.fieldTimestamps, listId: now, dateTarget: now }
		};
	}
	return { completed, nextInstance };
}

/**
 * Uncomplete a task.
 */
export function uncompleteTask(task: Task): Task {
	const now = new Date().toISOString();
	return {
		...task,
		isCompleted: false,
		completedAt: null,
		updatedAt: now,
		fieldTimestamps: {
			...task.fieldTimestamps,
			isCompleted: now,
			completedAt: now
		}
	};
}

/**
 * "Fresh start" — soft-delete all incomplete tasks, except board cards:
 * those are only taken off the day view (date cleared) and stay on their list.
 */
export function freshStart(
	tasks: Task[],
	parkingLotListId: string | null = null
): { archived: Task[]; unscheduled: Task[] } {
	const now = new Date().toISOString();
	const archived: Task[] = [];
	const unscheduled: Task[] = [];
	for (const t of tasks) {
		if (t.isCompleted || t.deletedAt) continue;
		if (isBoardCard(t, parkingLotListId)) {
			if (t.dateTarget !== null) {
				unscheduled.push({
					...t,
					dateTarget: null,
					rolloverCount: 0,
					updatedAt: now,
					fieldTimestamps: { ...t.fieldTimestamps, dateTarget: now, rolloverCount: now }
				});
			}
			continue;
		}
		archived.push({
			...t,
			deletedAt: now,
			updatedAt: now,
			fieldTimestamps: {
				...t.fieldTimestamps,
				deletedAt: now
			}
		});
	}
	return { archived, unscheduled };
}

/**
 * Bring a task back from the Trash so it is visible again:
 * - its list was deleted (or never existed) → the default Someday list
 * - it is unfinished and dated in the past → today (it would otherwise be invisible
 *   until the next rollover)
 */
export function restoreTask(
	task: Task,
	opts: { today: string; liveListIds: Set<string>; defaultListId: string }
): Task {
	const now = new Date().toISOString();
	const ts: Record<string, string> = { deletedAt: now };
	let { listId, dateTarget, parked, parkedAt } = task;
	if (listId !== null && !opts.liveListIds.has(listId)) {
		listId = opts.defaultListId;
		parked = false;
		parkedAt = null;
		ts.listId = now;
		ts.parked = now;
		ts.parkedAt = now;
	}
	if (!task.isCompleted && dateTarget !== null && isBefore(dateTarget, opts.today)) {
		dateTarget = opts.today;
		ts.dateTarget = now;
	}
	return {
		...task,
		listId,
		dateTarget,
		parked,
		parkedAt,
		deletedAt: null,
		updatedAt: now,
		fieldTimestamps: { ...task.fieldTimestamps, ...ts }
	};
}

/**
 * Calculate the next sort order for appending to a list.
 * Uses max + 1 strategy for simplicity; fractional indexing is used for inserts.
 */
export function nextSortOrder(tasks: Task[]): number {
	if (tasks.length === 0) return 1;
	return Math.max(...tasks.map((t) => t.sortOrder)) + 1;
}

/**
 * Calculate a sort order between two adjacent items for drag-drop insertion.
 */
export function sortOrderBetween(before: number | null, after: number | null): number {
	if (before === null && after === null) return 1;
	if (before === null) return after! - 1;
	if (after === null) return before + 1;
	return (before + after) / 2;
}
