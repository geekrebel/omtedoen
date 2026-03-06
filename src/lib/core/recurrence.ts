import { addDays, parseDate, formatDate } from '../utils/dates.js';

export interface RecurrenceRule {
	type: 'daily' | 'every_other_day' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
	dayOfWeek?: number; // 0=Sun..6=Sat, for weekly
}

const PATTERNS: Array<{ regex: RegExp; parse: (m: RegExpMatchArray) => RecurrenceRule | null }> = [
	{
		regex: /\bevery\s+day\b/i,
		parse: () => ({ type: 'daily' })
	},
	{
		regex: /\bdaily\b/i,
		parse: () => ({ type: 'daily' })
	},
	{
		regex: /\bevery\s+other\s+day\b/i,
		parse: () => ({ type: 'every_other_day' })
	},
	{
		regex: /\bevery\s+weekday\b/i,
		parse: () => ({ type: 'weekdays' })
	},
	{
		regex: /\bon\s+weekdays\b/i,
		parse: () => ({ type: 'weekdays' })
	},
	{
		regex: /\bevery\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
		parse: (m) => {
			const dayMap: Record<string, number> = {
				sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
				thursday: 4, friday: 5, saturday: 6
			};
			return { type: 'weekly', dayOfWeek: dayMap[m[1].toLowerCase()] };
		}
	},
	{
		regex: /\bevery\s+week\b/i,
		parse: () => ({ type: 'weekly' })
	},
	{
		regex: /\bweekly\b/i,
		parse: () => ({ type: 'weekly' })
	},
	{
		regex: /\bevery\s+(other|2)\s+weeks?\b/i,
		parse: () => ({ type: 'biweekly' })
	},
	{
		regex: /\bbiweekly\b/i,
		parse: () => ({ type: 'biweekly' })
	},
	{
		regex: /\bevery\s+month\b/i,
		parse: () => ({ type: 'monthly' })
	},
	{
		regex: /\bmonthly\b/i,
		parse: () => ({ type: 'monthly' })
	},
	{
		regex: /\bevery\s+year\b/i,
		parse: () => ({ type: 'yearly' })
	},
	{
		regex: /\byearly\b/i,
		parse: () => ({ type: 'yearly' })
	},
	{
		regex: /\bannually\b/i,
		parse: () => ({ type: 'yearly' })
	}
];

/**
 * Parse a natural language string for recurrence patterns.
 * Returns null if no recurrence pattern found.
 */
export function parseRecurrence(text: string): RecurrenceRule | null {
	for (const { regex, parse } of PATTERNS) {
		const match = text.match(regex);
		if (match) return parse(match);
	}
	return null;
}

/**
 * Extract the task title (with recurrence text removed) and the recurrence rule.
 */
export function extractRecurrence(input: string): { title: string; rule: RecurrenceRule | null; ruleText: string | null } {
	for (const { regex, parse } of PATTERNS) {
		const match = input.match(regex);
		if (match) {
			const rule = parse(match);
			const title = input.replace(regex, '').replace(/\s+/g, ' ').trim();
			return { title, rule, ruleText: match[0] };
		}
	}
	return { title: input, rule: null, ruleText: null };
}

/**
 * Get the next occurrence date after a given date.
 */
export function nextOccurrence(rule: RecurrenceRule, afterDate: string): string | null {
	const d = parseDate(afterDate);

	switch (rule.type) {
		case 'daily':
			return addDays(afterDate, 1);

		case 'every_other_day':
			return addDays(afterDate, 2);

		case 'weekdays': {
			const next = new Date(d);
			next.setDate(next.getDate() + 1);
			while (next.getDay() === 0 || next.getDay() === 6) {
				next.setDate(next.getDate() + 1);
			}
			return formatDate(next);
		}

		case 'weekly': {
			if (rule.dayOfWeek !== undefined) {
				const next = new Date(d);
				next.setDate(next.getDate() + 1);
				while (next.getDay() !== rule.dayOfWeek) {
					next.setDate(next.getDate() + 1);
				}
				return formatDate(next);
			}
			return addDays(afterDate, 7);
		}

		case 'biweekly':
			return addDays(afterDate, 14);

		case 'monthly': {
			const next = new Date(d);
			next.setMonth(next.getMonth() + 1);
			return formatDate(next);
		}

		case 'yearly': {
			const next = new Date(d);
			next.setFullYear(next.getFullYear() + 1);
			return formatDate(next);
		}

		default:
			return null;
	}
}
