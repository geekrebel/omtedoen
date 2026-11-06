import { describe, it, expect } from 'vitest';
import { rolloverTasks, parkStaleTasks, completeTask, freshStart, nextSortOrder, sortOrderBetween, isBoardCard, restoreTask } from '$lib/core/task-engine.js';
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

	it('keeps stale board cards on their list and only takes them off the day', () => {
		const tasks = [
			createTask({ id: '1', title: 'Board card', listId: 'board-a', dateTarget: '2026-03-05', rolloverCount: 3, listSortOrder: 4 }),
		];
		const result = parkStaleTasks(tasks, 'parking-lot-id');
		expect(result).toHaveLength(1);
		expect(result[0].listId).toBe('board-a');
		expect(result[0].listSortOrder).toBe(4);
		expect(result[0].parked).toBe(false);
		expect(result[0].dateTarget).toBeNull();
		expect(result[0].rolloverCount).toBe(0);
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
		const { archived, unscheduled } = freshStart(tasks);
		expect(archived).toHaveLength(2);
		expect(archived.every(t => t.deletedAt !== null)).toBe(true);
		expect(unscheduled).toHaveLength(0);
	});

	it('never deletes board cards; scheduled ones just lose their date', () => {
		const tasks = [
			createTask({ id: '1', title: 'Board, on Today', listId: 'board-a', dateTarget: '2026-03-05' }),
			createTask({ id: '2', title: 'Board, undated', listId: 'board-a' }),
			createTask({ id: '3', title: 'Parked', listId: 'parking-lot-id', parked: true }),
			createTask({ id: '4', title: 'Plain day task', dateTarget: '2026-03-05' }),
		];
		const { archived, unscheduled } = freshStart(tasks, 'parking-lot-id');
		expect(archived.map(t => t.id).sort()).toEqual(['3', '4']);
		expect(unscheduled.map(t => t.id)).toEqual(['1']);
		expect(unscheduled[0].dateTarget).toBeNull();
		expect(unscheduled[0].listId).toBe('board-a');
		expect(unscheduled[0].deletedAt).toBeNull();
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

describe('isBoardCard', () => {
	it('treats any list except the Parking Lot as the board', () => {
		expect(isBoardCard(createTask({ id: '1', title: 'a', listId: 'board-a' }), 'pl')).toBe(true);
		expect(isBoardCard(createTask({ id: '2', title: 'b', listId: 'pl' }), 'pl')).toBe(false);
		expect(isBoardCard(createTask({ id: '3', title: 'c', dateTarget: '2026-03-05' }), 'pl')).toBe(false);
	});
});

describe('rolloverTasks with board cards', () => {
	it('rolls a board card scheduled in the past onto today and keeps its list', () => {
		const tasks = [createTask({ id: '1', title: 'Board', listId: 'board-a', dateTarget: '2026-03-01' })];
		const [rolled] = rolloverTasks(tasks, '2026-03-05');
		expect(rolled.dateTarget).toBe('2026-03-05');
		expect(rolled.listId).toBe('board-a');
	});
});

describe('restoreTask', () => {
	const opts = { today: '2026-03-10', liveListIds: new Set(['board-a', 'pl']), defaultListId: 'someday' };

	it('clears deletedAt and keeps the card where it was', () => {
		const t = createTask({ id: '1', title: 'a', listId: 'board-a', listSortOrder: 3, deletedAt: '2026-03-09T10:00:00Z' });
		const r = restoreTask(t, opts);
		expect(r.deletedAt).toBeNull();
		expect(r.listId).toBe('board-a');
		expect(r.listSortOrder).toBe(3);
	});

	it('moves a card whose list was deleted to the default list', () => {
		const t = createTask({ id: '1', title: 'a', listId: 'gone', deletedAt: 'x' });
		expect(restoreTask(t, opts).listId).toBe('someday');
	});

	it('brings an unfinished past-dated task to today, but leaves done ones alone', () => {
		const open = createTask({ id: '1', title: 'a', dateTarget: '2026-03-01', deletedAt: 'x' });
		const done = createTask({ id: '2', title: 'b', dateTarget: '2026-03-01', isCompleted: true, completedAt: 'x', deletedAt: 'x' });
		expect(restoreTask(open, opts).dateTarget).toBe('2026-03-10');
		expect(restoreTask(done, opts).dateTarget).toBe('2026-03-01');
	});
});
