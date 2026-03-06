import { describe, it, expect } from 'vitest';
import { extractDateTarget } from '$lib/core/date-parser.js';
import { extractRecurrence } from '$lib/core/recurrence.js';

// Saturday, March 7, 2026
const REF = new Date(2026, 2, 7);

describe('extractDateTarget', () => {
	it('parses "tomorrow"', () => {
		const result = extractDateTarget('buy milk tomorrow', REF);
		expect(result.title).toBe('buy milk');
		expect(result.parsedDate).toBe('2026-03-08');
		expect(result.dateText).toBe('tomorrow');
	});

	it('parses "next friday"', () => {
		const result = extractDateTarget('meeting next friday', REF);
		expect(result.title).toBe('meeting');
		expect(result.parsedDate).toBe('2026-03-13');
	});

	it('parses "March 15"', () => {
		const result = extractDateTarget('dentist March 15', REF);
		expect(result.title).toBe('dentist');
		expect(result.parsedDate).toBe('2026-03-15');
	});

	it('parses "in 3 days"', () => {
		const result = extractDateTarget('finish report in 3 days', REF);
		expect(result.title).toBe('finish report');
		expect(result.parsedDate).toBe('2026-03-10');
	});

	it('parses "today"', () => {
		const result = extractDateTarget('call mom today', REF);
		expect(result.title).toBe('call mom');
		expect(result.parsedDate).toBe('2026-03-07');
	});

	it('returns null for plain text with no dates', () => {
		const result = extractDateTarget('buy groceries', REF);
		expect(result.title).toBe('buy groceries');
		expect(result.parsedDate).toBeNull();
		expect(result.dateText).toBeNull();
	});

	it('handles date at the start of the string', () => {
		const result = extractDateTarget('tomorrow buy milk', REF);
		expect(result.title).toBe('buy milk');
		expect(result.parsedDate).toBe('2026-03-08');
	});

	it('does not produce empty title when input is only a date', () => {
		const result = extractDateTarget('tomorrow', REF);
		expect(result.title.length).toBeGreaterThan(0);
		expect(result.parsedDate).toBe('2026-03-08');
	});

	it('uses forwardDate to prefer future dates', () => {
		// "friday" on a Saturday (March 7, 2026) should mean next Friday (March 13)
		const result = extractDateTarget('meeting friday', REF);
		expect(result.parsedDate).toBe('2026-03-13');
	});
});

describe('two-stage parsing pipeline', () => {
	it('handles recurrence + date together', () => {
		const input = 'buy milk tomorrow every monday';

		const { title: afterRecurrence, rule, ruleText } = extractRecurrence(input);
		expect(afterRecurrence).toBe('buy milk tomorrow');
		expect(ruleText).toBe('every monday');

		const { title: final, parsedDate } = extractDateTarget(afterRecurrence, REF);
		expect(final).toBe('buy milk');
		expect(parsedDate).toBe('2026-03-08');
		expect(rule?.type).toBe('weekly');
	});

	it('handles date-only input', () => {
		const input = 'dentist appointment next friday';

		const { title: afterRecurrence, rule } = extractRecurrence(input);
		expect(rule).toBeNull();

		const { title: final, parsedDate } = extractDateTarget(afterRecurrence, REF);
		expect(final).toBe('dentist appointment');
		expect(parsedDate).toBe('2026-03-13');
	});

	it('handles recurrence-only input (no date)', () => {
		const input = 'take vitamins daily';

		const { title: afterRecurrence, ruleText } = extractRecurrence(input);
		expect(ruleText).toBe('daily');
		expect(afterRecurrence).toBe('take vitamins');

		const { title: final, parsedDate } = extractDateTarget(afterRecurrence, REF);
		expect(final).toBe('take vitamins');
		expect(parsedDate).toBeNull();
	});

	it('handles plain text (no date, no recurrence)', () => {
		const input = 'buy groceries';

		const { rule } = extractRecurrence(input);
		expect(rule).toBeNull();

		const { title: final, parsedDate } = extractDateTarget(input, REF);
		expect(final).toBe('buy groceries');
		expect(parsedDate).toBeNull();
	});
});
