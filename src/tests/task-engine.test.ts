import { describe, it, expect } from 'vitest';
import { rolloverTasks, parkStaleTasks, completeTask, freshStart, nextSortOrder, sortOrderBetween } from '$lib/core/task-engine.js';
import { createTask } from '$lib/core/types.js';

describe('rolloverTasks', () => {
	it('moves past incomplete tasks to today', () => {
		const tasks = [
			createTask({ id: '1', title: 'Old task', dateTarget: '2026-03-01' }),
			createTask({ id: '2', title: 'Future task', dateTarget: '2026-03-10' }),
			createTask({ id: '3', title: 'Completed', dateTarget: '2026-03-01', isCompleted: true, completedAt: '2026-03-01' }),
		];

		const result = rolloverTasks(tasks, '2026-03-05');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
		expect(result[0].dateTarget).toBe('2026-03-05');
		expect(result[0].rolloverCount).toBe(1);
	});

	it('does not roll over parked tasks', () => {
		const tasks = [
			createTask({ id: '1', title: 'Parked', dateTarget: '2026-03-01', parked: true }),
		];
		const result = rolloverTasks(tasks, '2026-03-05');
		expect(result).toHaveLength(0);
	});

	it('increments rollover count', () => {
		const tasks = [
			createTask({ id: '1', title: 'Twice rolled', dateTarget: '2026-03-04', rolloverCount: 2 }),
		];
		const result = rolloverTasks(tasks, '2026-03-05');
		expect(result[0].rolloverCount).toBe(3);
	});
});

describe('parkStaleTasks', () => {
	it('parks tasks with rolloverCount >= 3', () => {
		const tasks = [
			createTask({ id: '1', title: 'Stale', rolloverCount: 3 }),
			createTask({ id: '2', title: 'Not stale', rolloverCount: 2 }),
		];
		const result = parkStaleTasks(tasks, 'parking-lot-id');
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe('1');
		expect(result[0].parked).toBe(true);
		expect(result[0].listId).toBe('parking-lot-id');
		expect(result[0].dateTarget).toBeNull();
	});

	it('does not re-park already parked tasks', () => {
		const tasks = [
			createTask({ id: '1', title: 'Already parked', rolloverCount: 5, parked: true }),
		];
		const result = parkStaleTasks(tasks, 'parking-lot-id');
		expect(result).toHaveLength(0);
	});
});

describe('completeTask', () => {
	it('marks task as completed', () => {
		const task = createTask({ id: '1', title: 'Do thing' });
		const { completed, nextInstance } = completeTask(task, 'new-id');
		expect(completed.isCompleted).toBe(true);
		expect(completed.completedAt).toBeTruthy();
		expect(nextInstance).toBeNull();
	});

	it('creates next instance for recurring tasks', () => {
		const task = createTask({
			id: '1',
			title: 'Daily task',
			dateTarget: '2026-03-05',
			recurrenceRule: 'every day'
		});
		const { completed, nextInstance } = completeTask(task, 'new-id');
		expect(completed.isCompleted).toBe(true);
		expect(nextInstance).not.toBeNull();
		expect(nextInstance!.id).toBe('new-id');
		expect(nextInstance!.dateTarget).toBe('2026-03-06');
		expect(nextInstance!.isCompleted).toBe(false);
	});
});

describe('freshStart', () => {
	it('soft-deletes all incomplete tasks', () => {
		const tasks = [
			createTask({ id: '1', title: 'Incomplete' }),
			createTask({ id: '2', title: 'Complete', isCompleted: true, completedAt: 'now' }),
			createTask({ id: '3', title: 'Also incomplete' }),
		];
		const result = freshStart(tasks);
		expect(result).toHaveLength(2);
		expect(result.every(t => t.deletedAt !== null)).toBe(true);
	});
});

describe('sortOrderBetween', () => {
	it('returns midpoint between two values', () => {
		expect(sortOrderBetween(1, 3)).toBe(2);
		expect(sortOrderBetween(1, 2)).toBe(1.5);
	});

	it('handles null before', () => {
		expect(sortOrderBetween(null, 5)).toBe(4);
	});

	it('handles null after', () => {
		expect(sortOrderBetween(5, null)).toBe(6);
	});

	it('handles both null', () => {
		expect(sortOrderBetween(null, null)).toBe(1);
	});
});

describe('nextSortOrder', () => {
	it('returns max + 1', () => {
		const tasks = [
			createTask({ id: '1', title: 'a', sortOrder: 3 }),
			createTask({ id: '2', title: 'b', sortOrder: 1 }),
		];
		expect(nextSortOrder(tasks)).toBe(4);
	});

	it('returns 1 for empty list', () => {
		expect(nextSortOrder([])).toBe(1);
	});
});
