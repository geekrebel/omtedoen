import * as chrono from 'chrono-node';
import { formatDate } from '../utils/dates.js';

export interface DateParseResult {
	/** The task title with the date expression removed */
	title: string;
	/** The parsed date as YYYY-MM-DD, or null if no date found */
	parsedDate: string | null;
	/** The original text that was interpreted as a date, or null */
	dateText: string | null;
}

/**
 * Words that are dates only when they stand with something else
 * ("on sat", "next sun", "3 march"). On their own they are far more often
 * ordinary words in a task: "sun cream", "sat test prep", "march on".
 */
const AMBIGUOUS_ALONE =
	/^(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|jan|feb|mar|march|apr|april|may|jun|june|jul|july|aug|sep|sept|oct|nov|dec)\.?$/i;

/** Day-first (10/11 = 10 November) everywhere except month-first locales. */
function parserFor(locale: string | undefined): chrono.Chrono {
	return locale && /-(US|PH|FM|MH|PW)\b/i.test(locale) ? chrono.en.casual : chrono.en.GB;
}

function defaultLocale(): string | undefined {
	if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
	try {
		return Intl.DateTimeFormat().resolvedOptions().locale;
	} catch {
		return undefined;
	}
}

/**
 * Extract a one-off date target from a task title using chrono-node.
 *
 * Should be called AFTER extractRecurrence() has stripped recurrence patterns.
 * Handles "tomorrow", "next friday", "March 15", "in 3 days", etc.
 *
 * Ignored on purpose (the text stays in the title):
 * - dates in the past ("about yesterday's meeting", "from last week")
 * - bare weekday/month words ("sun cream", "sat test prep")
 * - times with no day ("call bob at noon")
 */
export function extractDateTarget(
	input: string,
	referenceDate?: Date,
	locale: string | undefined = defaultLocale()
): DateParseResult {
	const ref = referenceDate ?? new Date();
	const today = formatDate(ref);
	const results = parserFor(locale).parse(input, ref, { forwardDate: true });

	const match = results.find((r) => {
		if (AMBIGUOUS_ALONE.test(r.text.trim())) return false;
		if (!r.start.isCertain('day') && !r.start.isCertain('weekday')) return false;
		return formatDate(r.start.date()) >= today;
	});

	if (!match) {
		return { title: input, parsedDate: null, dateText: null };
	}

	const parsedDate = formatDate(match.start.date());
	const dateText = match.text;

	// Remove the matched date text from the title
	const cleaned = (input.slice(0, match.index) + input.slice(match.index + match.text.length))
		.replace(/\s+/g, ' ')
		.trim();

	// If removing the date empties the title, keep the original
	const title = cleaned || input;

	return { title, parsedDate, dateText };
}
