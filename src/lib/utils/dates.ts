/** Get today's date as YYYY-MM-DD in local timezone */
export function todayISO(): string {
	return formatDate(new Date());
}

/** Format a Date to YYYY-MM-DD in local timezone */
export function formatDate(d: Date): string {
	const year = d.getFullYear();
	const month = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/** Parse a YYYY-MM-DD string to a Date at midnight local time */
export function parseDate(iso: string): Date {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d);
}

/** Add N days to a date string, return YYYY-MM-DD */
export function addDays(iso: string, n: number): string {
	const d = parseDate(iso);
	d.setDate(d.getDate() + n);
	return formatDate(d);
}

/** Get the start of the week (Monday) for a given date */
export function weekStart(iso: string): string {
	const d = parseDate(iso);
	const day = d.getDay();
	// JS Sunday = 0, we want Monday = start
	const diff = day === 0 ? -6 : 1 - day;
	d.setDate(d.getDate() + diff);
	return formatDate(d);
}

/** Get an array of 7 date strings for the week containing the given date */
export function weekDates(iso: string): string[] {
	const start = weekStart(iso);
	return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Get the first day of the month for a given date */
export function monthStart(iso: string): string {
	const d = parseDate(iso);
	return formatDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

/** Get the last day of the month for a given date */
export function monthEnd(iso: string): string {
	const d = parseDate(iso);
	return formatDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Get all dates for a calendar month grid (padded to full weeks, Mon-start) */
export function monthDates(iso: string): string[] {
	const first = monthStart(iso);
	const last = monthEnd(iso);
	// Start from the Monday of the week containing the 1st
	const gridStart = weekStart(first);
	// End on the Sunday of the week containing the last day
	const lastDate = parseDate(last);
	const lastDay = lastDate.getDay();
	const gridEndOffset = lastDay === 0 ? 0 : 7 - lastDay;
	const gridEnd = addDays(last, gridEndOffset);
	// Build the array
	const dates: string[] = [];
	let current = gridStart;
	while (current <= gridEnd) {
		dates.push(current);
		current = addDays(current, 1);
	}
	return dates;
}

/** Get a human-readable month label like "March 2026" */
export function monthLabel(iso: string): string {
	const d = parseDate(iso);
	const monthNames = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];
	return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

/** Add N months to a date string, clamping to last day of target month */
export function addMonths(iso: string, n: number): string {
	const d = parseDate(iso);
	d.setMonth(d.getMonth() + n);
	return formatDate(d);
}

/** Check if date A is before date B (both YYYY-MM-DD) */
export function isBefore(a: string, b: string): boolean {
	return a < b;
}

/** Check if date A is the same as date B (both YYYY-MM-DD) */
export function isSameDay(a: string, b: string): boolean {
	return a === b;
}

/** Get a human-readable day label */
export function dayLabel(iso: string, today?: string): string {
	if (!today) today = todayISO();
	if (iso === today) return 'Today';
	if (iso === addDays(today, 1)) return 'Tomorrow';
	if (iso === addDays(today, -1)) return 'Yesterday';

	const d = parseDate(iso);
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const monthNames = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];
	return `${dayNames[d.getDay()]}, ${monthNames[d.getMonth()]} ${d.getDate()}`;
}

/** Get day of week name */
export function dayOfWeek(iso: string): string {
	const d = parseDate(iso);
	const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	return names[d.getDay()];
}

/** Check if a date is in the past (before today) */
export function isPast(iso: string): boolean {
	return iso < todayISO();
}

/** Check if a date is today */
export function isToday(iso: string): boolean {
	return iso === todayISO();
}
