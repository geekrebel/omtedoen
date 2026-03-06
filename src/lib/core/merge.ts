import type { Task, List } from './types.js';

const TASK_MERGE_FIELDS = [
	'title', 'markdownBody', 'isCompleted', 'completedAt',
	'dateTarget', 'listId', 'sortOrder', 'priority',
	'parked', 'parkedAt', 'rolloverCount',
	'recurrenceRule', 'recurrenceNext', 'steps', 'deletedAt'
] as const;

const LIST_MERGE_FIELDS = [
	'name', 'sortOrder', 'color', 'isParkingLot', 'deletedAt'
] as const;

/**
 * Field-level last-write-wins merge for tasks.
 * Compares per-field timestamps and keeps the newer value for each field.
 * When timestamps are equal, prefers local (deterministic tie-break).
 */
export function mergeTask(local: Task, remote: Task): Task {
	const merged = { ...local };
	const localTs = local.fieldTimestamps;
	const remoteTs = remote.fieldTimestamps;
	const mergedTs = { ...localTs };

	for (const field of TASK_MERGE_FIELDS) {
		const localTime = localTs[field] || '0';
		const remoteTime = remoteTs[field] || '0';

		if (remoteTime > localTime) {
			(merged as any)[field] = (remote as any)[field];
			mergedTs[field] = remoteTime;
		}
	}

	merged.fieldTimestamps = mergedTs;
	merged.updatedAt = new Date().toISOString();
	return merged;
}

/**
 * Field-level last-write-wins merge for lists.
 */
export function mergeList(local: List, remote: List): List {
	const merged = { ...local };
	const localTs = local.fieldTimestamps;
	const remoteTs = remote.fieldTimestamps;
	const mergedTs = { ...localTs };

	for (const field of LIST_MERGE_FIELDS) {
		const localTime = localTs[field] || '0';
		const remoteTime = remoteTs[field] || '0';

		if (remoteTime > localTime) {
			(merged as any)[field] = (remote as any)[field];
			mergedTs[field] = remoteTime;
		}
	}

	merged.fieldTimestamps = mergedTs;
	merged.updatedAt = new Date().toISOString();
	return merged;
}
