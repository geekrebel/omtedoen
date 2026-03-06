import { describe, it, expect } from 'vitest';
import { mergeTask } from '$lib/core/merge.js';
import { createTask } from '$lib/core/types.js';

describe('mergeTask', () => {
	it('keeps local values when local is newer', () => {
		const local = createTask({
			id: '1',
			title: 'Local title',
			priority: 'must',
			fieldTimestamps: { title: '2026-03-05T15:00:00', priority: '2026-03-05T15:00:00' }
		});

		const remote = createTask({
			id: '1',
			title: 'Remote title',
			priority: 'want',
			fieldTimestamps: { title: '2026-03-05T14:00:00', priority: '2026-03-05T14:00:00' }
		});

		const merged = mergeTask(local, remote);
		expect(merged.title).toBe('Local title');
		expect(merged.priority).toBe('must');
	});

	it('takes remote values when remote is newer', () => {
		const local = createTask({
			id: '1',
			title: 'Local title',
			priority: 'should',
			fieldTimestamps: { title: '2026-03-05T14:00:00', priority: '2026-03-05T14:00:00' }
		});

		const remote = createTask({
			id: '1',
			title: 'Remote title',
			priority: 'must',
			fieldTimestamps: { title: '2026-03-05T15:00:00', priority: '2026-03-05T15:00:00' }
		});

		const merged = mergeTask(local, remote);
		expect(merged.title).toBe('Remote title');
		expect(merged.priority).toBe('must');
	});

	it('handles per-field merge (mixed newer/older)', () => {
		const local = createTask({
			id: '1',
			title: 'Local title',
			priority: 'want',
			fieldTimestamps: { title: '2026-03-05T16:00:00', priority: '2026-03-05T14:00:00' }
		});

		const remote = createTask({
			id: '1',
			title: 'Remote title',
			priority: 'must',
			fieldTimestamps: { title: '2026-03-05T14:00:00', priority: '2026-03-05T16:00:00' }
		});

		const merged = mergeTask(local, remote);
		expect(merged.title).toBe('Local title'); // local is newer
		expect(merged.priority).toBe('must'); // remote is newer
	});

	it('prefers local on equal timestamps', () => {
		const ts = '2026-03-05T15:00:00';
		const local = createTask({
			id: '1',
			title: 'Local',
			fieldTimestamps: { title: ts }
		});

		const remote = createTask({
			id: '1',
			title: 'Remote',
			fieldTimestamps: { title: ts }
		});

		const merged = mergeTask(local, remote);
		expect(merged.title).toBe('Local');
	});
});
