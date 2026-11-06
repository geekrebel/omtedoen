import { describe, it, expect } from 'vitest';
import { extractDateTarget } from '$lib/core/date-parser.js';
import { firstOccurrence, nextOccurrence } from '$lib/core/recurrence.js';
import { completeTask, recurrenceChildId } from '$lib/core/task-engine.js';
import { renderMarkdown, stripMarkdown } from '$lib/core/markdown.js';
import { createTask } from '$lib/core/types.js';

// Friday, 6 November 2026
const REF = new Date(2026, 10, 6, 9, 0);

describe('extractDateTarget — things that are not dates', () => {
	it('ignores past dates and keeps the words in the title', () => {
		const r = extractDateTarget("email John about yesterday's meeting", REF, 'en-AU');
		expect(r.parsedDate).toBeNull();
		expect(r.title).toBe("email John about yesterday's meeting");
		expect(extractDateTarget('call mum about last week', REF, 'en-AU').parsedDate).toBeNull();
		expect(extractDateTarget('fix bug from 2 days ago', REF, 'en-AU').parsedDate).toBeNull();
	});

	it('ignores bare weekday and month words', () => {
		expect(extractDateTarget('sun cream', REF, 'en-AU')).toMatchObject({ parsedDate: null, title: 'sun cream' });
		expect(extractDateTarget('sat test prep', REF, 'en-AU').parsedDate).toBeNull();
		expect(extractDateTarget('march on', REF, 'en-AU').parsedDate).toBeNull();
	});

	it('still takes weekdays with a word in front', () => {
		expect(extractDateTarget('meeting on sat', REF, 'en-AU')).toMatchObject({
			parsedDate: '2026-11-07',
			title: 'meeting'
		});
	});

	it('ignores a time with no day', () => {
		expect(extractDateTarget('call bob at noon', REF, 'en-AU').parsedDate).toBeNull();
	});

	it('reads 10/11 day-first outside the US, month-first in the US', () => {
		expect(extractDateTarget('pay rent 10/11', REF, 'en-AU').parsedDate).toBe('2026-11-10');
		expect(extractDateTarget('pay rent 10/11', REF, 'en-US').parsedDate).toBe('2027-10-11');
	});

	it('still accepts today', () => {
		expect(extractDateTarget('review today', REF, 'en-AU').parsedDate).toBe('2026-11-06');
	});
});

describe('firstOccurrence', () => {
	it('daily starts on the day itself', () => {
		expect(firstOccurrence({ type: 'daily' }, '2026-11-06')).toBe('2026-11-06');
	});
	it('every friday on a Friday starts that day; every monday waits for Monday', () => {
		expect(firstOccurrence({ type: 'weekly', dayOfWeek: 5 }, '2026-11-06')).toBe('2026-11-06');
		expect(firstOccurrence({ type: 'weekly', dayOfWeek: 1 }, '2026-11-06')).toBe('2026-11-09');
	});
	it('weekdays added on a Saturday starts Monday', () => {
		expect(firstOccurrence({ type: 'weekdays' }, '2026-11-07')).toBe('2026-11-09');
	});
});

describe('monthly recurrence', () => {
	it('does not overflow into the next month', () => {
		expect(nextOccurrence({ type: 'monthly' }, '2026-01-31')).toBe('2026-02-28');
		expect(nextOccurrence({ type: 'monthly' }, '2028-01-31')).toBe('2028-02-29');
		expect(nextOccurrence({ type: 'yearly' }, '2028-02-29')).toBe('2029-02-28');
	});
});

describe('recurring tasks', () => {
	it('the next instance id is stable, so completing twice cannot make two', () => {
		const t = createTask({ id: '01ABC', title: 'vitamins', dateTarget: '2026-11-06', recurrenceRule: 'daily' });
		const a = completeTask(t).nextInstance!;
		const b = completeTask(t).nextInstance!;
		expect(a.id).toBe(b.id);
		expect(a.id).toBe(recurrenceChildId('01ABC'));
		expect(recurrenceChildId('01ABD')).not.toBe(a.id);
	});

	it('a recurring board card hands its list spot to the next instance', () => {
		const t = createTask({ id: 'c1', title: 'water plants', listId: 'L1', listSortOrder: 4, recurrenceRule: 'daily' });
		const { completed, nextInstance } = completeTask(t, 'n1', 'PARK', '2026-11-06');
		expect(completed.listId).toBeNull();
		expect(completed.dateTarget).toBe('2026-11-06');
		expect(nextInstance).toMatchObject({ listId: 'L1', listSortOrder: 4, dateTarget: '2026-11-07' });
	});

	it('a non-recurring board card stays on its list when completed', () => {
		const t = createTask({ id: 'c2', title: 'ship it', listId: 'L1' });
		expect(completeTask(t, 'x', 'PARK').completed.listId).toBe('L1');
	});
});

describe('markdown links', () => {
	it('renders web and mail links', () => {
		expect(renderMarkdown('[site](https://a.com)')).toContain('href="https://a.com"');
		expect(renderMarkdown('[mail](mailto:a@b.com)')).toContain('href="mailto:a@b.com"');
	});
	it('refuses javascript: and other schemes', () => {
		expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a');
		expect(renderMarkdown('[x](file:///etc/passwd)')).not.toContain('<a');
	});
	it('stripMarkdown gives plain text', () => {
		expect(stripMarkdown('**buy** [shelves](https://ikea.com) `now`')).toBe('buy shelves now');
	});
});
