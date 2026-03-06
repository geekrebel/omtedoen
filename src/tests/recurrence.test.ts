import { describe, it, expect } from 'vitest';
import { parseRecurrence, extractRecurrence, nextOccurrence } from '$lib/core/recurrence.js';

describe('parseRecurrence', () => {
	it('parses "every day"', () => {
		expect(parseRecurrence('every day')).toEqual({ type: 'daily' });
	});

	it('parses "daily"', () => {
		expect(parseRecurrence('daily')).toEqual({ type: 'daily' });
	});

	it('parses "every other day"', () => {
		expect(parseRecurrence('every other day')).toEqual({ type: 'every_other_day' });
	});

	it('parses "every weekday"', () => {
		expect(parseRecurrence('every weekday')).toEqual({ type: 'weekdays' });
	});

	it('parses "every monday"', () => {
		expect(parseRecurrence('every monday')).toEqual({ type: 'weekly', dayOfWeek: 1 });
	});

	it('parses "every friday"', () => {
		expect(parseRecurrence('every friday')).toEqual({ type: 'weekly', dayOfWeek: 5 });
	});

	it('parses "every week"', () => {
		expect(parseRecurrence('every week')).toEqual({ type: 'weekly' });
	});

	it('parses "weekly"', () => {
		expect(parseRecurrence('weekly')).toEqual({ type: 'weekly' });
	});

	it('parses "biweekly"', () => {
		expect(parseRecurrence('biweekly')).toEqual({ type: 'biweekly' });
	});

	it('parses "every month"', () => {
		expect(parseRecurrence('every month')).toEqual({ type: 'monthly' });
	});

	it('parses "every year"', () => {
		expect(parseRecurrence('every year')).toEqual({ type: 'yearly' });
	});

	it('returns null for non-recurring text', () => {
		expect(parseRecurrence('buy groceries')).toBeNull();
	});
});

describe('extractRecurrence', () => {
	it('extracts recurrence and cleans title', () => {
		const result = extractRecurrence('Take vitamins every day');
		expect(result.title).toBe('Take vitamins');
		expect(result.rule).toEqual({ type: 'daily' });
		expect(result.ruleText).toBe('every day');
	});

	it('returns original title when no recurrence', () => {
		const result = extractRecurrence('Just a normal task');
		expect(result.title).toBe('Just a normal task');
		expect(result.rule).toBeNull();
		expect(result.ruleText).toBeNull();
	});
});

describe('nextOccurrence', () => {
	it('daily: returns next day', () => {
		expect(nextOccurrence({ type: 'daily' }, '2026-03-05')).toBe('2026-03-06');
	});

	it('every other day: returns day after next', () => {
		expect(nextOccurrence({ type: 'every_other_day' }, '2026-03-05')).toBe('2026-03-07');
	});

	it('weekdays: skips weekends (Friday -> Monday)', () => {
		// 2026-03-06 is a Friday
		expect(nextOccurrence({ type: 'weekdays' }, '2026-03-06')).toBe('2026-03-09');
	});

	it('weekly with specific day: finds next occurrence', () => {
		// 2026-03-05 is a Thursday, next Monday is 2026-03-09
		expect(nextOccurrence({ type: 'weekly', dayOfWeek: 1 }, '2026-03-05')).toBe('2026-03-09');
	});

	it('monthly: returns same day next month', () => {
		expect(nextOccurrence({ type: 'monthly' }, '2026-03-05')).toBe('2026-04-05');
	});

	it('yearly: returns same day next year', () => {
		expect(nextOccurrence({ type: 'yearly' }, '2026-03-05')).toBe('2027-03-05');
	});
});
