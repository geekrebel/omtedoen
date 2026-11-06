import type { TodoStore } from '$lib/storage/store.js';
import type { StoreType } from '$lib/storage/index.js';
import type { Task, List, ColorLabel } from '$lib/core/types.js';
import { createTask, createList } from '$lib/core/types.js';
import { newId } from '$lib/core/ids.js';
import { todayISO, addDays } from '$lib/utils/dates.js';
import {
	rolloverTasks,
	parkStaleTasks,
	completeTask as completeTaskEngine,
	uncompleteTask as uncompleteTaskEngine,
	freshStart as freshStartEngine,
	isBoardCard,
	restoreTask as restoreTaskEngine,
	recurrenceChildId,
	nextSortOrder,
	sortOrderBetween
} from '$lib/core/task-engine.js';
import { extractRecurrence, nextOccurrence, firstOccurrence } from '$lib/core/recurrence.js';
import { extractDateTarget } from '$lib/core/date-parser.js';

// Reactive state
let store: TodoStore | null = $state(null);
let storeType: StoreType = $state('memory');
let allTasks: Task[] = $state([]);
let allLists: List[] = $state([]);
let parkingLotId: string = $state('');
let defaultSomedayId: string = $state('');
export type View = 'focus' | 'month' | 'someday' | 'scratchpad' | 'settings' | 'trash';
let currentView: View = $state('focus');
let trashTasks: Task[] = $state([]);
let focusMode: boolean = $state(false);

let monthOffset: number = $state(0); // 0 = current month, -1 = last month, etc.

// Reactive "today" that updates when the calendar date changes
let today: string = $state(todayISO());

export function checkDateChange() {
	const now = todayISO();
	if (now !== today) {
		today = now;
		// Re-run rollover for the new day
		runDailyMaintenance();
	}
}

// Backup: module-level interval (may not reliably trigger reactivity in all environments)
if (typeof window !== 'undefined') {
	setInterval(checkDateChange, 10_000);
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

export function getMaybeTasks(): Task[] {
	const todayDate = today;
	return allTasks
		.filter(
			(t) =>
				!t.isCompleted &&
				!t.parked &&
				!t.deletedAt &&
				t.dateTarget !== null &&
				t.dateTarget > todayDate
		)
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTodayColumnTasks(): Task[] {
	const todayDate = today;
	return allTasks
		.filter(
			(t) =>
				!t.isCompleted &&
				!t.parked &&
				!t.deletedAt &&
				t.dateTarget === todayDate
		)
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getDoneTasks(): Task[] {
	const todayDate = today;
	return allTasks
		.filter(
			(t) =>
				t.isCompleted &&
				!t.deletedAt &&
				t.dateTarget !== null &&
				t.dateTarget >= todayDate
		)
		.sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function setTaskStatus(
	taskId: string,
	status: 'maybe' | 'today' | 'done',
	sortOrder: number
): Promise<void> {
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;
	const todayDate = today;

	let newDate: string | null;
	let shouldBeCompleted: boolean;
	if (status === 'maybe') {
		newDate =
			task.dateTarget && task.dateTarget > todayDate
				? task.dateTarget
				: addDays(todayDate, 1);
		shouldBeCompleted = false;
	} else if (status === 'today') {
		newDate = todayDate;
		shouldBeCompleted = false;
	} else {
		newDate = todayDate;
		shouldBeCompleted = true;
	}

	await moveTask(taskId, newDate, boardListOf(task), sortOrder);
	const updated = allTasks.find((t) => t.id === taskId);
	if (updated && updated.isCompleted !== shouldBeCompleted) {
		await toggleTask(taskId);
	}
}

export function getTasksForList(listId: string): Task[] {
	return allTasks
		.filter((t) => t.listId === listId && !t.deletedAt)
		.sort((a, b) => {
			if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
			return a.listSortOrder - b.listSortOrder;
		});
}

function nextListSortOrder(listId: string): number {
	const inList = allTasks.filter((t) => t.listId === listId && !t.deletedAt);
	if (inList.length === 0) return 1;
	return Math.max(...inList.map((t) => t.listSortOrder)) + 1;
}

/** The board list a task belongs to, or null (the Parking Lot is not a board list). */
export function boardListOf(task: Task): string | null {
	return isBoardCard(task, parkingLotId) ? task.listId : null;
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

export function getDefaultSomedayId(): string {
	return defaultSomedayId;
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

export function getCurrentView(): View {
	return currentView;
}

export function setCurrentView(view: typeof currentView) {
	currentView = view;
}

export function isFocusMode(): boolean {
	return focusMode;
}

export function toggleFocusMode() {
	setFocusMode(!focusMode);
}

let savedWindowSize: { width: number; height: number } | null = null;

/**
 * Turn Focus mode on/off everywhere it can be toggled from (button, ⌘⇧F,
 * palette, Settings): saves the setting and narrows / restores the window.
 */
export async function setFocusMode(on: boolean): Promise<void> {
	if (on === focusMode) return;
	focusMode = on;
	if (store) await store.setSetting('focusMode', String(on));
	if (!isTauri()) return;
	try {
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		if (getCurrentWindow().label !== 'main') return;
		const { LogicalSize, PhysicalSize } = await import('@tauri-apps/api/dpi');
		const win = getCurrentWindow();
		if (on) {
			const size = await win.innerSize();
			savedWindowSize = { width: size.width, height: size.height };
			const logicalHeight = size.height / (window.devicePixelRatio || 1);
			await win.setMinSize(new LogicalSize(380, 500));
			await win.setSize(new LogicalSize(480, logicalHeight));
		} else {
			await win.setMinSize(new LogicalSize(700, 500));
			if (savedWindowSize) {
				await win.setSize(new PhysicalSize(savedWindowSize.width, savedWindowSize.height));
				savedWindowSize = null;
			} else {
				// Focus mode was on at launch, so there is no size to go back to
				const size = await win.innerSize();
				const scale = window.devicePixelRatio || 1;
				if (size.width / scale < 900) {
					await win.setSize(new LogicalSize(1100, Math.max(600, size.height / scale)));
				}
			}
		}
	} catch {
		// Not fatal: the window just keeps its size
	}
}


export function getMonthOffset(): number {
	return monthOffset;
}

export function setMonthOffset(n: number) {
	monthOffset = n;
}

// Cross-window sync — the panel window and main window each hold their own
// $state copy of the shared SQLite data, so mutations broadcast a Tauri event
// and the other window reloads.
const MUTATING_STORE_METHODS = [
	'upsertTask',
	'upsertTasks',
	'upsertList',
	'softDeleteTask',
	'softDeleteList',
	'setSetting'
];
let emitTimer: ReturnType<typeof setTimeout> | null = null;

function isTauri(): boolean {
	return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function notifyChanged(): void {
	if (!isTauri()) return;
	if (emitTimer) clearTimeout(emitTimer);
	emitTimer = setTimeout(async () => {
		try {
			const { emit } = await import('@tauri-apps/api/event');
			const { getCurrentWindow } = await import('@tauri-apps/api/window');
			await emit('tasks-changed', { source: getCurrentWindow().label });
		} catch {
			// Not fatal — the other window just won't refresh until its next reload
		}
	}, 150);
}

function withChangeNotify(s: TodoStore): TodoStore {
	return new Proxy(s, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver);
			if (typeof value === 'function' && MUTATING_STORE_METHODS.includes(String(prop))) {
				return async (...args: unknown[]) => {
					const result = await (value as (...a: unknown[]) => Promise<unknown>).apply(
						target,
						args
					);
					notifyChanged();
					return result;
				};
			}
			return typeof value === 'function' ? value.bind(target) : value;
		}
	});
}

let syncStarted = false;
export async function startCrossWindowSync(): Promise<void> {
	if (syncStarted || !isTauri()) return;
	syncStarted = true;
	try {
		const { listen } = await import('@tauri-apps/api/event');
		const { getCurrentWindow } = await import('@tauri-apps/api/window');
		const myLabel = getCurrentWindow().label;
		await listen<{ source: string }>('tasks-changed', async (e) => {
			if (e.payload?.source === myLabel || !store) return;
			allTasks = await store.getAllTasks();
			allLists = await store.getAllLists();
			focusMode = (await store.getSetting('focusMode')) === 'true';
			await refreshTrash();
		});
	} catch {
		syncStarted = false;
	}
}

const PARKING_LOT_ID = 'list-parking-lot';
const DEFAULT_SOMEDAY_ID = 'list-someday';

/**
 * Unfinished tasks that no view shows (no date and no list, or a list that no
 * longer exists) go to the default Someday list.
 */
async function repairOrphans(): Promise<void> {
	if (!store) return;
	const liveLists = new Set(allLists.filter((l) => !l.deletedAt).map((l) => l.id));
	const orphans = allTasks.filter(
		(t) =>
			!t.deletedAt &&
			!t.isCompleted &&
			!t.parked &&
			((t.dateTarget === null && t.listId === null) ||
				(t.listId !== null && !liveLists.has(t.listId)))
	);
	if (orphans.length === 0) return;
	const now = new Date().toISOString();
	let order = nextListSortOrder(defaultSomedayId);
	const fixed = orphans.map((t) => ({
		...t,
		listId: defaultSomedayId,
		listSortOrder: order++,
		updatedAt: now,
		fieldTimestamps: { ...t.fieldTimestamps, listId: now, listSortOrder: now }
	}));
	await store.upsertTasks(fixed);
	const byId = new Map(fixed.map((t) => [t.id, t]));
	allTasks = allTasks.map((t) => byId.get(t.id) ?? t);
}

// Initialization
export async function initStore(s: TodoStore, type: StoreType): Promise<void> {
	store = withChangeNotify(s);
	storeType = type;

	// Load data
	allLists = await store.getAllLists();
	allTasks = await store.getAllTasks();

	// Ensure parking lot list exists
	let parkingLot = allLists.find((l) => l.isParkingLot);
	if (!parkingLot) {
		// Fixed id: the main window and the panel both run this at launch, and
		// with random ids each could create its own Parking Lot
		parkingLot = createList({
			id: PARKING_LOT_ID,
			name: 'Parking Lot',
			isParkingLot: true,
			sortOrder: 999999
		});
		await store.upsertList(parkingLot);
		allLists = [...allLists, parkingLot];
	}
	parkingLotId = parkingLot.id;

	// Ensure default someday list exists
	let defaultSomeday = allLists.find((l) => l.isDefault && !l.isParkingLot);
	if (!defaultSomeday) {
		defaultSomeday = createList({
			id: DEFAULT_SOMEDAY_ID,
			name: 'Someday',
			isDefault: true,
			sortOrder: 0
		});
		await store.upsertList(defaultSomeday);
		allLists = [...allLists, defaultSomeday];
	}
	defaultSomedayId = defaultSomeday.id;

	await repairOrphans();

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

	await refreshTrash();


}

// Actions

export async function addTask(
	title: string,
	dateTarget: string | null,
	listId: string | null = null,
	options?: { skipDateParsing?: boolean }
): Promise<Task> {
	if (!store) throw new Error('Store not initialized');

	// Ensure today is up-to-date before adding task
	checkDateChange();

	// NLP stages: only run when explicitly enabled (e.g. Quick Capture)
	let cleanTitle = title;
	let effectiveDate = dateTarget;
	let rule: ReturnType<typeof extractRecurrence>['rule'] = null;
	let ruleText: string | null = null;

	if (!options?.skipDateParsing) {
		// Stage 1: Extract recurrence ("every monday", "daily", etc.)
		const recResult = extractRecurrence(title);
		cleanTitle = recResult.title;
		rule = recResult.rule;
		ruleText = recResult.ruleText;

		// Stage 2: Extract one-off date ("tomorrow", "next friday", "March 15", etc.)
		const { title: afterDate, parsedDate } = extractDateTarget(cleanTitle);
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

	// A task dated in the past would sit unseen until the next day's rollover
	if (effectiveDate && effectiveDate < today) {
		effectiveDate = today;
	}

	// Recurring tasks start on the first day that fits the rule: "daily" starts
	// today, "every monday" starts today if it is Monday, else next Monday
	if (rule && effectiveDate) {
		effectiveDate = firstOccurrence(rule, effectiveDate);
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
		listSortOrder: listId ? nextListSortOrder(listId) : 0,
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
		let updated = uncompleteTaskEngine(task);
		// Un-completing a recurring task takes back the instance it spawned,
		// as long as nobody has touched it since
		const child = task.recurrenceRule
			? allTasks.find((t) => t.id === recurrenceChildId(task.id))
			: undefined;
		if (child && !child.isCompleted && child.updatedAt === child.createdAt) {
			await store.softDeleteTask(child.id);
			allTasks = allTasks.filter((t) => t.id !== child.id);
			if (child.listId && updated.listId === null) {
				// It was a board card: give the board spot back
				const now = new Date().toISOString();
				updated = {
					...updated,
					listId: child.listId,
					listSortOrder: child.listSortOrder,
					fieldTimestamps: { ...updated.fieldTimestamps, listId: now, listSortOrder: now }
				};
			}
			await refreshTrash();
		}
		await store.upsertTask(updated);
		allTasks = allTasks.map((t) => (t.id === id ? updated : t));
	} else {
		const { completed, nextInstance } = completeTaskEngine(
			task,
			recurrenceChildId(task.id),
			parkingLotId,
			today
		);
		await store.upsertTask(completed);
		allTasks = allTasks.map((t) => (t.id === id ? completed : t));

		// The instance may already exist (completed before, then un-completed and
		// the instance kept): never add a second copy
		if (nextInstance && !allTasks.some((t) => t.id === nextInstance.id)) {
			await store.upsertTask(nextInstance);
			allTasks = [...allTasks, nextInstance];
			await refreshTrash();
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
	await refreshTrash();
}

export async function undo(): Promise<boolean> {
	if (!store || undoStack.length === 0) return false;
	const entry = undoStack[undoStack.length - 1];
	undoStack = undoStack.slice(0, -1);
	if (entry.type === 'delete') {
		// Already restored from the Trash? Then there is nothing to undo.
		if (allTasks.some((t) => t.id === entry.task.id)) return true;
		// Same safety rules as restoring from the Trash (deleted list, past date)
		const restored = restoreTaskEngine(entry.task, {
			today,
			liveListIds: new Set(allLists.filter((l) => !l.deletedAt).map((l) => l.id)),
			defaultListId: defaultSomedayId
		});
		await store.upsertTask(restored);
		allTasks = [...allTasks, restored];
		await refreshTrash();
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

/** Reorder a task within its day column. Unlike moveTask, keeps its rollover count. */
export async function setTaskSortOrder(taskId: string, sortOrder: number): Promise<void> {
	const task = allTasks.find((t) => t.id === taskId);
	if (!task || task.sortOrder === sortOrder) return;
	const now = new Date().toISOString();
	await updateTask({
		...task,
		sortOrder,
		fieldTimestamps: { ...task.fieldTimestamps, sortOrder: now }
	});
}

/**
 * Put a task on a day (Today, Tomorrow…). Board cards keep their board list,
 * so the day view and the board show the same card.
 */
export async function scheduleTask(taskId: string, date: string, sortOrder: number): Promise<void> {
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;
	await moveTask(taskId, date, boardListOf(task), sortOrder);
}

/**
 * Take a task off the day views. A board card just loses its date and stays on
 * its list; anything else goes to the default Someday list.
 */
export async function unscheduleTask(taskId: string): Promise<void> {
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;
	const listId = boardListOf(task) ?? defaultSomedayId;
	const listSortOrder = task.listId === listId ? task.listSortOrder : nextListSortOrder(listId);
	await moveTask(taskId, null, listId, task.sortOrder);
	await setListPosition(taskId, listId, listSortOrder);
}

/** Move a card to a board list / position. Keeps its date and completion. */
export async function moveTaskToList(taskId: string, listId: string, listSortOrder: number): Promise<void> {
	await setListPosition(taskId, listId, listSortOrder);
}

async function setListPosition(taskId: string, listId: string, listSortOrder: number): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;
	if (task.listId === listId && task.listSortOrder === listSortOrder) return;
	const now = new Date().toISOString();
	const updated: Task = {
		...task,
		listId,
		listSortOrder,
		parked: false,
		parkedAt: null,
		updatedAt: now,
		fieldTimestamps: {
			...task.fieldTimestamps,
			listId: now,
			listSortOrder: now,
			parked: now,
			parkedAt: now
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
		sortOrder: nextSortOrder(getSomedayLists() as any)
	});
	await store.upsertList(list);
	allLists = [...allLists, list];
	return list;
}

async function patchList(id: string, patch: Partial<List>): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const list = allLists.find((l) => l.id === id);
	if (!list) return;
	const now = new Date().toISOString();
	const ts = Object.fromEntries(Object.keys(patch).map((k) => [k, now]));
	const updated: List = {
		...list,
		...patch,
		updatedAt: now,
		fieldTimestamps: { ...list.fieldTimestamps, ...ts }
	};
	await store.upsertList(updated);
	allLists = allLists.map((l) => (l.id === id ? updated : l));
}

export async function renameList(id: string, name: string): Promise<void> {
	const trimmed = name.trim();
	if (!trimmed) return;
	await patchList(id, { name: trimmed });
}

export async function reorderList(id: string, sortOrder: number): Promise<void> {
	await patchList(id, { sortOrder });
}

/**
 * Delete a board list. Its cards are NOT deleted: they move to the default
 * Someday list (keeping any Today/date scheduling). The default list and the
 * Parking Lot cannot be deleted.
 */
export async function deleteList(id: string): Promise<number> {
	if (!store) throw new Error('Store not initialized');
	const list = allLists.find((l) => l.id === id);
	if (!list || list.isDefault || list.isParkingLot) return 0;
	const cards = allTasks
		.filter((t) => t.listId === id && !t.deletedAt)
		.sort((a, b) => a.listSortOrder - b.listSortOrder);
	let order = nextListSortOrder(defaultSomedayId);
	for (const card of cards) {
		await setListPosition(card.id, defaultSomedayId, order++);
	}
	await store.softDeleteList(id);
	allLists = allLists.filter((l) => l.id !== id);
	return cards.length;
}

// Trash

export function getTrashTasks(): Task[] {
	return trashTasks;
}

export async function refreshTrash(): Promise<void> {
	if (!store) return;
	trashTasks = await store.getDeletedTasks();
}

/** Put a deleted task back where it was (or somewhere visible if that place is gone). */
export async function restoreFromTrash(id: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	const task = trashTasks.find((t) => t.id === id);
	if (!task) return;
	const restored = restoreTaskEngine(task, {
		today,
		liveListIds: new Set(allLists.filter((l) => !l.deletedAt).map((l) => l.id)),
		defaultListId: defaultSomedayId
	});
	await store.upsertTask(restored);
	allTasks = [...allTasks.filter((t) => t.id !== id), restored];
	trashTasks = trashTasks.filter((t) => t.id !== id);
}

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
	const { archived, unscheduled } = freshStartEngine(allTasks, parkingLotId);
	await store.upsertTasks([...archived, ...unscheduled]);
	const archivedIds = new Set(archived.map((t) => t.id));
	allTasks = allTasks
		.filter((t) => !archivedIds.has(t.id))
		.map((t) => unscheduled.find((u) => u.id === t.id) || t);
	await refreshTrash();
	return archived.length;
}

// Color sort helpers
function colorPriority(color: ColorLabel): number {
	return { red: 1, amber: 2, teal: 3, none: 99 }[color] ?? 99;
}

export function setTaskColorLabel(taskId: string, colorLabel: ColorLabel): void {
	if (!store) throw new Error('Store not initialized');
	const task = allTasks.find((t) => t.id === taskId);
	if (!task) return;
	const next: ColorLabel = task.colorLabel === colorLabel ? 'none' : colorLabel;
	const now = new Date().toISOString();
	updateTask({
		...task,
		colorLabel: next,
		fieldTimestamps: { ...task.fieldTimestamps, colorLabel: now }
	});
}

export function sortTasksByColor(date: string): void {
	if (!store) throw new Error('Store not initialized');
	const tasks = allTasks
		.filter((t) => t.dateTarget === date && !t.deletedAt && !t.parked && !t.isCompleted)
		.sort((a, b) => {
			const cp = colorPriority(a.colorLabel) - colorPriority(b.colorLabel);
			if (cp !== 0) return cp;
			return a.sortOrder - b.sortOrder;
		});
	let prevOrder: number | null = null;
	for (const task of tasks) {
		const newOrder = sortOrderBetween(prevOrder, null);
		prevOrder = newOrder;
		if (task.sortOrder !== newOrder) {
			updateTask({ ...task, sortOrder: newOrder });
		}
	}
}

export function sortListTasksByColor(listId: string): void {
	if (!store) throw new Error('Store not initialized');
	const tasks = allTasks
		.filter((t) => t.listId === listId && !t.deletedAt && !t.isCompleted)
		.sort((a, b) => {
			const cp = colorPriority(a.colorLabel) - colorPriority(b.colorLabel);
			if (cp !== 0) return cp;
			return a.listSortOrder - b.listSortOrder;
		});
	let prevOrder: number | null = null;
	for (const task of tasks) {
		const newOrder = sortOrderBetween(prevOrder, null);
		prevOrder = newOrder;
		if (task.listSortOrder !== newOrder) {
			updateTask({ ...task, listSortOrder: newOrder });
		}
	}
}

// Settings
export async function saveSetting(key: string, value: string): Promise<void> {
	if (!store) throw new Error('Store not initialized');
	await store.setSetting(key, value);
}
