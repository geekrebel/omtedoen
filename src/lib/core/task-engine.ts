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

/**
 * Move tasks that have rolled over 3+ times to the parking lot.
 * Returns only the tasks that were parked.
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
 * Complete a task. Returns the updated task and optionally a new recurring instance.
 */
export function completeTask(
	task: Task,
	newRecurrenceId: string
): { completed: Task; nextInstance: Task | null } {
	const now = new Date().toISOString();
	const completed: Task = {
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
 * "Fresh start" — soft-delete all incomplete tasks.
 * Returns the tasks that were archived.
 */
export function freshStart(tasks: Task[]): Task[] {
	const now = new Date().toISOString();
	return tasks
		.filter((t) => !t.isCompleted && !t.deletedAt)
		.map((t) => ({
			...t,
			deletedAt: now,
			updatedAt: now,
			fieldTimestamps: {
				...t.fieldTimestamps,
				deletedAt: now
			}
		}));
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
