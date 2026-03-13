export interface Tip {
	id: string;
	title: string;
	message: string;
	category?: string;
}

export const DEFAULT_TIPS: Tip[] = [
	{
		id: 'tip-1',
		title: 'Focus Mode',
		message: 'Press Cmd+Shift+F to toggle Focus Mode and see only your lightning-bolted tasks for today.',
		category: 'shortcuts'
	},
	{
		id: 'tip-3',
		title: 'Mark for Focus',
		message: 'Hover over a card and press "5" to toggle the lightning bolt and mark it as focused.',
		category: 'shortcuts'
	},
	{
		id: 'tip-4',
		title: 'Move to Tomorrow',
		message: 'Hover over a card and press "T" to move it to tomorrow.',
		category: 'shortcuts'
	},
	{
		id: 'tip-5',
		title: 'Send to Someday',
		message: 'Hover over a card and press "S" to send it to your Someday list with a bucket animation.',
		category: 'shortcuts'
	},
	{
		id: 'tip-6',
		title: 'Recurring Tasks',
		message: 'Type "every monday" or "daily" in your task to create recurring items automatically.',
		category: 'features'
	},
	{
		id: 'tip-7',
		title: 'Color Labels',
		message: 'Hover over a card and press 1, 2, or 3 to add color labels: red, amber, or teal.',
		category: 'shortcuts'
	},
	{
		id: 'tip-8',
		title: 'Smart Date Parsing',
		message: 'Try typing "tomorrow", "next friday", or "march 15" in your task title for smart scheduling.',
		category: 'features'
	},
	{
		id: 'tip-9',
		title: 'Quick Add',
		message: 'Press "Q" or Cmd+Shift+Space to open Quick Add and add a task from anywhere.',
		category: 'shortcuts'
	},
	{
		id: 'tip-10',
		title: 'Command Palette',
		message: 'Press Cmd+K to open the Command Palette for quick access to features.',
		category: 'shortcuts'
	},
	{
		id: 'tip-11',
		title: 'Undo Actions',
		message: 'Press Cmd+Z to undo your last action, like deleting a task.',
		category: 'shortcuts'
	},
	{
		id: 'tip-12',
		title: 'Task Steps',
		message: 'Click on a task to edit it and add sub-steps for decomposing larger tasks.',
		category: 'features'
	},
];

export function getRandomTip(tips: Tip[] = DEFAULT_TIPS): Tip {
	return tips[Math.floor(Math.random() * tips.length)];
}

export async function fetchRemoteTips(url: string): Promise<Tip[]> {
	try {
		const response = await fetch(url);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data = await response.json();
		return Array.isArray(data) ? data : data.tips || DEFAULT_TIPS;
	} catch (error) {
		console.warn('Failed to fetch remote tips:', error);
		return DEFAULT_TIPS;
	}
}
