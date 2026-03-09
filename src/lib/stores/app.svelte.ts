import type { TodoStore } from '$lib/storage/store.js';
import type { StoreType } from '$lib/storage/index.js';
import type { Task, List } from '$lib/core/types.js';
import { createTask, createList } from '$lib/core/types.js';
import { newId } from '$lib/core/ids.js';
import { todayISO } from '$lib/utils/dates.js';
import {
	rolloverTasks,
	parkStaleTasks,
	completeTask as completeTaskEngine,
	uncompleteTask as uncompleteTaskEngine,
	freshStart as freshStartEngine,
	nextSortOrder,
	sortOrderBetween
} from '$lib/core/task-engine.js';
import { extractRecurrence, nextOccurrence } from '$lib/core/recurrence.js';
import { extractDateTarget } from '$lib/core/date-parser.js';

// Reactive state
let store: TodoStore | null = $state(null);
let storeType: StoreType = $state('memory');
let allTasks: Task[] = $state([]);
let allLists: List[] = $state([]);
let parkingLotId: string = $state('');
let currentView: 'focus' | 'month' | 'someday' | 'settings' = $state('focus');
let focusMode: boolean = $state(false);
let monthOffset: number = $state(0); // 0 = current month, -1 = last month, etc.

// Reactive "today" that updates when the calendar date changes
let today: string = $state(todayISO());

function checkDateChange() {
	const now = todayISO();
	if (now !== today) {
		today = now;
		// Re-run rollover for the new day
		runDailyMaintenance();
	}
}

// Check every 30 seconds and on window focus/visibility
if (typeof window !== 'undefined') {
	setInterval(checkDateChange, 30_000);
	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState === 'visible') checkDateChange();
	});
	window.addEventListener('focus', checkDateChange);
}

async function runDailyMaintenance() {
	if (!store) return;
	const now = todayISO();
	const rolled = rolloverTasks(allTasks, now);
	if (rolled.length > 0) {
		await store.upsertTasks(rolled);
	}
	const parked = parkStaleTasks(
		rolled.length > 0 ? allTasks.map((t) => rolled.find((r) => r.id === t.id) || t) : allTasks,
		parkingLotId
	);
	if (parked.length > 0) {
		await store.upsertTasks(parked);
	}
	if (rolled.length > 0 || parked.length > 0) {
		allTasks = await store.getAllTasks();
	}
}

/** Get the current reactive today value */
export function getToday(): string {
	return today;
}

// Undo stack (stores snapshots of deleted tasks for undelete)
interface UndoEntry {
	type: 'delete';
	task: Task;
}
let undoStack: UndoEntry[] = $state([]);

// Derived state
export function getTodayTasks(): Task[] {
	const todayDate = today; // reactive dependency on today
	return allTasks
		.filter((t) => t.dateTarget === todayDate && !t.deletedAt && !t.parked)
		.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			return a.sortOrder - b.sortOrder;
		});
}

export function getTasksForDate(date: string): Task[] {
	return allTasks
		.filter((t) => t.dateTarget === date && !t.deletedAt && !t.parked)
		.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			return a.sortOrder - b.sortOrder;
		});
}

export function getTasksForList(listId: string): Task[] {
	return allTasks
		.filter((t) => t.listId === listId && !t.deletedAt)
		.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			return a.sortOrder - b.sortOrder;
		});
}

export function getParkedTasks(): Task[] {
	return allTasks.filter((t) => t.parked && !t.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSomedayLists(): List[] {
	return allLists.filter((l) => !l.isParkingLot && !l.deletedAt).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getParkingLotList(): List | undefined {
	return allLists.find((l) => l.isParkingLot && !l.deletedAt);
}

export function getAllTasks(): Task[] {
	return allTasks;
}

export function getAllLists(): List[] {
	return allLists;
}

export function getStoreType(): StoreType {
	return storeType;
}

export function getCurrentView(): 'focus' | 'month' | 'someday' | 'settings' {
	return currentView;
}

export function setCurrentView(view: typeof currentView) {
	currentView = view;
}

export function isFocusMode(): boolean {
	return focusMode;
}

export function toggleFocusMode() {
	focusMode = !focusMode;
}

export function getMonthOffset(): number {
	return monthOffset;
}

export function setMonthOffset(n: number) {
	monthOffset = n;
}

// Initialization
export async function initStore(s: TodoStore, type: StoreType): Promise<void> {
	store = s;
	storeType = type;

	// Load data
	allLists = await store.getAllLists();
	allTasks = await store.getAllTasks();

	// Ensure parking lot list exists
	let parkingLot = allLists.find((l) => l.isParkingLot);
	if (!parkingLot) {
		parkingLot = createList({
			id: newId(),
			name: 'Parking Lot',
			isParkingLot: true,
			sortOrder: 999999
		});
		await store.upsertList(parkingLot);
		allLists = [...allLists, parkingLot];
	}
	parkingLotId = parkingLot.id;

	// Run daily rollover
	const todayDate = todayISO();
	const rolled = rolloverTasks(allTasks, todayDate);
	if (rolled.length > 0) {
		await store.upsertTasks(rolled);
	}

	// Park stale tasks
	const parked = parkStaleTasks(
		rolled.length > 0 ? allTasks.map((t) => rolled.find((r) => r.id === t.id) || t) : allTasks,
		parkingLotId
	);
	if (parked.length > 0) {
		await store.upsertTasks(parked);
	}

	// Reload if we modified anything
	if (rolled.length > 0 || parked.length > 0) {
		allTasks = await store.getAllTasks();
	}

	// Load settings
	const fm = await store.getSetting('focusMode');
	focusMode = fm === 'true';
}

// Actions

export async function addTask(
	title: string,
	dateTarget: string | null,
	listId: string | null = null,
	options?: { skipDateParsing?: boolean }
): Promise<Task> {
	if (!store) throw new Error('Store not initialized');

	// Stage 1: Extract recurrence ("every monday", "daily", etc.)
	const { title: afterRecurrence, rule, ruleText } = extractRecurrence(title);

	// Stage 2: Extract one-off date ("tomorrow", "next friday", "March 15", etc.)
	let cleanTitle = afterRecurrence;
	let effectiveDate = dateTarget;
	if (!options?.skipDateParsing) {
		const { title: afterDate, parsedDate } = extractDateTarget(afterRecurrence);
		cleanTitle = afterDate;
		if (parsedDate) {
			effectiveDate = parsedDate;
		}
	}

	// Parse priority prefix
	let priority: Task['priority'] = 'should';
	let finalTitle = cleanTitle;
	if (finalTitle.startsWith('!must ')) {
		priority = 'must';
		finalTitle = finalTitle.slice(6);
	} else if (finalTitle.startsWith('!should ')) {
		priority = 'should';
		finalTitle = finalTitle.slice(8);
	} else if (finalTitle.startsWith('!want ')) {
		priority = 'want';
		finalTitle = finalTitle.slice(6);
	}

	// For recurring tasks with a specific day, place the task on the next
	// occurrence instead of today (e.g. "buy milk every monday" → next Monday)
	if (rule && effectiveDate) {
		const next = nextOccurrence(rule, effectiveDate);
		if (next) {
			effectiveDate = next;
		}
	}

	const tasksInContext = effectiveDate
		? getTasksForDate(effectiveDate)
		: listId
			? getTasksForList(listId)
			: [];

	const task = createTask({
		id: newId(),
		title: finalTitle,
		dateTarget: effectiveDate,
		listId,
		priority,
		focused: effectiveDate === todayISO(),
		sortOrder: nextSortOrder(tasksInContext),
		recurrenceRule: ruleText,
		recurrenceNext: rule ? nextOccurrence(rule, effectiveDate || todayISO()) : null
	});

	await store.upsertTask(task);
	allTasks = [...allTasks, task];
	return task;
}

export async function updateTask(task: Task): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	task.updatedAt = new Date().toISOString();
	await store.upsertTask(task);
	allTasks = allTasks.map((t) => (t.id === task.id ? task : t));
}

export async function toggleTask(id: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const task = allTasks.find((t) => t.id === id);
	if (!task) return;

	if (task.isCompleted) {
		const updated = uncompleteTaskEngine(task);
		await store.upsertTask(updated);
		allTasks = allTasks.map((t) => (t.id === id ? updated : t));
	} else {
		const { completed, nextInstance } = completeTaskEngine(task, newId());
		await store.upsertTask(completed);
		allTasks = allTasks.map((t) => (t.id === id ? completed : t));

		if (nextInstance) {
			await store.upsertTask(nextInstance);
			allTasks = [...allTasks, nextInstance];
		}
	}
}

export async function deleteTask(id: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const task = allTasks.find((t) => t.id === id);
	if (task) {
		undoStack = [...undoStack.slice(-19), { type: 'delete', task: { ...task } }];
	}
	await store.softDeleteTask(id);
	allTasks = allTasks.filter((t) => t.id !== id);
}

export async function undo(): Promise<boolean> {
	if (!store || undoStack.length === 0) return false;
	const entry = undoStack[undoStack.length - 1];
	undoStack = undoStack.slice(0, -1);
	if (entry.type === 'delete') {
		const restored = { ...entry.task, deletedAt: null, updatedAt: new Date().toISOString() };
		await store.upsertTask(restored);
		allTasks = [...allTasks, restored];
	}
	return true;
}

export async function moveTask(taskId: string, newDate: string | null, newListId: string | null, newSortOrder: number): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;

	const now = new Date().toISOString();
	const updated: Task = {
		...task,
		dateTarget: newDate,
		listId: newListId,
		sortOrder: newSortOrder,
		parked: false,
		parkedAt: null,
		rolloverCount: 0,
		updatedAt: now,
		fieldTimestamps: {
			...task.fieldTimestamps,
			dateTarget: now,
			listId: now,
			sortOrder: now,
			parked: now,
			parkedAt: now,
			rolloverCount: now
		}
	};

	await store.upsertTask(updated);
	allTasks = allTasks.map((t) => (t.id === taskId ? updated : t));
}

export async function unparkTask(taskId: string): Promise<void> {
	const todayDate = todayISO();
	const todayTasks = getTasksForDate(todayDate);
	await moveTask(taskId, todayDate, null, nextSortOrder(todayTasks));
}

// Lists

export async function addList(name: string): Promise<List> {
	if (!store) throw new Error('Store not initialized');
	const list = createList({
		id: newId(),
		name,
		sortOrder: nextSortOrder(allLists as any)
	});
	await store.upsertList(list);
	allLists = [...allLists, list];
	return list;
}

export async function deleteList(id: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	await store.softDeleteList(id);
	allLists = allLists.filter((l) => l.id !== id);
	// Also remove tasks in this list
	const tasksInList = allTasks.filter((t) => t.listId === id);
	for (const task of tasksInList) {
		await store.softDeleteTask(task.id);
	}
	allTasks = allTasks.filter((t) => t.listId !== id);
}

// Data export
export function exportData(): string {
	const data = {
		version: 1,
		exportedAt: new Date().toISOString(),
		tasks: allTasks.filter((t) => !t.deletedAt),
		lists: allLists.filter((l) => !l.deletedAt)
	};
	return JSON.stringify(data, null, 2);
}

// Fresh start
export async function doFreshStart(): Promise<number> {
	if (!store) throw new Error('Store not initialized');
	const archived = freshStartEngine(allTasks);
	await store.upsertTasks(archived);
	allTasks = allTasks.filter((t) => t.isCompleted || t.deletedAt);
	return archived.length;
}

// Settings
export async function saveSetting(key: string, value: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	await store.setSetting(key, value);
}
