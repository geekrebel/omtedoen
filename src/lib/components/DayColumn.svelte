<script lang="ts">
	import TaskItem from "./TaskItem.svelte";
	import {
		setTaskStatus,
		getMaybeTasks,
		getTodayColumnTasks,
		getDoneTasks,
		isFocusMode,
		sortTasksByColor,
		getToday,
	} from "$lib/stores/app.svelte.js";
	import { sortOrderBetween } from "$lib/core/task-engine.js";
	import { dndzone } from "svelte-dnd-action";

	type Status = "maybe" | "today" | "done";

	interface Props {
		status: Status;
		compact?: boolean;
		onTaskHoverChange?: (isHovered: boolean) => void;
	}

	let { status, compact = false, onTaskHoverChange }: Props = $props();

	let allTasks = $derived(
		status === "maybe"
			? getMaybeTasks()
			: status === "today"
				? getTodayColumnTasks()
				: getDoneTasks(),
	);

	let focusModeActive = $derived(isFocusMode());
	let tasks = $derived(
		status === "today" && focusModeActive
			? allTasks.filter((t) => t.focused)
			: allTasks,
	);

	const label = { maybe: "Maybe", today: "Today", done: "Done" }[status];

	let dndItems = $state<any[]>([]);

	$effect(() => {
		dndItems = tasks.map((t) => ({ ...t, id: t.id }));
	});

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
			const original = allTasks.find((t) => t.id === item.id);
			if (!original || original.sortOrder !== newOrder) {
				setTaskStatus(item.id, status, newOrder);
			}
		});
	}
</script>

<div class="day-column" class:today={status === "today"} class:compact>
	<div class="day-header">
		<h3 class="day-label">{label}</h3>
		{#if tasks.length > 0}
			<span class="task-count">{tasks.length}</span>
		{/if}
		{#if status === "today"}
			<button
				class="sort-by-color-btn"
				onclick={() => sortTasksByColor(getToday())}
				aria-label="Sort by color priority"
				title="Sort by color"
			>
				<svg width="14" height="14" viewBox="0 0 14 14">
					<line x1="2" y1="3" x2="9" y2="3" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/>
					<line x1="2" y1="7" x2="9" y2="7" stroke="#f59e0b" stroke-width="2" stroke-linecap="round"/>
					<line x1="2" y1="11" x2="9" y2="11" stroke="#06b6d4" stroke-width="2" stroke-linecap="round"/>
					<polyline points="11,5 12.5,8 11,8 11,12" fill="none" stroke="var(--text-muted)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
			</button>
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
			<TaskItem {task} {onTaskHoverChange} />
		{/each}
	</div>
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
		flex: 1;
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

	.sort-by-color-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		padding: 4px;
		border-radius: 4px;
		cursor: pointer;
		opacity: 0.5;
		transition: opacity var(--transition-fast), background var(--transition-fast);
	}

	.sort-by-color-btn:hover {
		opacity: 1;
		background: rgba(0, 0, 0, 0.05);
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
