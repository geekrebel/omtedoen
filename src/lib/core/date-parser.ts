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
 * Extract a one-off date target from a task title using chrono-node.
 *
 * Should be called AFTER extractRecurrence() has stripped recurrence patterns.
 * Handles "tomorrow", "next friday", "March 15", "in 3 days", etc.
 */
export function extractDateTarget(
	input: string,
	referenceDate?: Date
): DateParseResult {
	const ref = referenceDate ?? new Date();
	const results = chrono.parse(input, ref, { forwardDate: true });

	if (results.length === 0) {
		return { title: input, parsedDate: null, dateText: null };
	}

	// Take the first (most prominent) date match
	const match = results[0];
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
