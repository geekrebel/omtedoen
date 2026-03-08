<script lang="ts">
	import type { Task } from "$lib/core/types.js";
	import TaskItem from "./TaskItem.svelte";
	import TaskInput from "./TaskInput.svelte";
	import {
		addTask,
		moveTask,
		getTasksForDate,
		isFocusMode,
	} from "$lib/stores/app.svelte.js";
	import { dayLabel, isToday, isPast } from "$lib/utils/dates.js";
	import { sortOrderBetween } from "$lib/core/task-engine.js";
	import { dndzone } from "svelte-dnd-action";

	interface Props {
		date: string;
		compact?: boolean;
	}

	let { date, compact = false }: Props = $props();

	let allTasks = $derived(getTasksForDate(date));
	let focusModeActive = $derived(isFocusMode());
	// In focus mode, only show tasks with lightning bolt on + completed tasks
	let tasks = $derived(
		focusModeActive
			? allTasks.filter((t) => t.focused || t.isCompleted)
			: allTasks,
	);
	let label = $derived(dayLabel(date));
	let today = $derived(isToday(date));
	let past = $derived(isPast(date));

	// svelte-dnd-action requires items to be mutable state that is updated synchronously
	// in onconsider and onfinalize.
	let dndItems = $state<any[]>([]);

	$effect(() => {
		dndItems = tasks.map((t) => ({ ...t, id: t.id }));
	});

	function handleAdd(title: string) {
		addTask(title, date);
	}

	function handleDndConsider(e: CustomEvent<{ items: any[] }>) {
		dndItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: any[] }>) {
		dndItems = e.detail.items;
		const items = e.detail.items;
		items.forEach((item: any, idx: number) => {
			const before = idx > 0 ? items[idx - 1].sortOrder : null;
			const after =
				idx < items.length - 1 ? items[idx + 1].sortOrder : null;
			const newOrder = sortOrderBetween(before, after);
			if (item.dateTarget !== date || item.sortOrder !== newOrder) {
				// Prevent loop calls if already matching
				item.sortOrder = newOrder;
				item.dateTarget = date;
				moveTask(item.id, date, null, newOrder);
			}
		});
	}
</script>

<div class="day-column" class:today class:past class:compact>
	<div class="day-header">
		<h3 class="day-label">{label}</h3>
		{#if tasks.length > 0}
			<span class="task-count"
				>{tasks.filter((t) => !t.isCompleted).length}</span
			>
		{/if}
	</div>

	<div
		class="task-list"
		use:dndzone={{
			items: dndItems,
			dropTargetStyle: { outline: "2px dashed var(--border)" },
		}}
		onconsider={handleDndConsider}
		onfinalize={handleDndFinalize}
	>
		{#each dndItems as task (task.id)}
			<TaskItem {task} />
		{/each}
	</div>

	<TaskInput
		placeholder={today ? "What's on today?" : "Add a task..."}
		onsubmit={handleAdd}
	/>
</div>

<style>
	.day-column {
		display: flex;
		flex-direction: column;
		min-width: 0;
		max-width: var(--max-column-width);
		flex: 1;
		padding: 16px 16px 20px;
		border-right: 1px solid var(--border-light);
		transition: background var(--transition-normal);
	}

	.day-column:last-child {
		border-right: none;
	}

	.day-column.today {
		background: var(--bg-surface);
		box-shadow: inset 0 0 0 1px rgba(45, 106, 79, 0.1);
	}

	.day-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 8px 16px;
		border-bottom: 1px solid var(--border-light);
		margin-bottom: 12px;
	}

	.day-label {
		font-size: 14px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--text-secondary);
	}

	.today .day-label {
		color: var(--heading-green);
		text-shadow: 0 0 12px rgba(45, 106, 79, 0.25);
	}

	.task-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.05);
		border: 1px solid var(--border-light);
		padding: 2px 8px;
		border-radius: 12px;
	}

	.task-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex: 1;
		min-height: 40px;
		margin-bottom: 8px;
	}

	.compact {
		padding: 12px;
	}

	.compact .day-header {
		padding: 2px 4px 12px;
	}
</style>
