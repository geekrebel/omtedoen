<script lang="ts">
	import type { List } from "$lib/core/types.js";
	import TaskItem from "./TaskItem.svelte";
	import TaskInput from "./TaskInput.svelte";
	import {
		addTask,
		getTasksForList,
		deleteList,
		sortListTasksByColor,
	} from "$lib/stores/app.svelte.js";

	interface Props {
		list: List;
	}

	let { list }: Props = $props();

	let tasks = $derived(getTasksForList(list.id));
	let collapsed = $state(false);
	let confirmingDelete = $state(false);

	function handleAdd(title: string) {
		addTask(title, null, list.id, { skipDateParsing: true });
	}

	function handleDelete() {
		confirmingDelete = true;
	}

	function confirmDelete() {
		deleteList(list.id);
		confirmingDelete = false;
	}

	function cancelDelete() {
		confirmingDelete = false;
	}
</script>

<div class="someday-list">
	<div class="list-header">
		<button class="collapse-btn" onclick={() => (collapsed = !collapsed)}>
			<span class="arrow" class:collapsed>{collapsed ? "▸" : "▾"}</span>
		</button>
		<h3 class="list-name">{list.name}</h3>
		<span class="list-count"
			>{tasks.filter((t) => !t.isCompleted).length}</span
		>
		<button
			class="sort-by-color-btn"
			onclick={() => sortListTasksByColor(list.id)}
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
		{#if !list.isDefault}
			{#if confirmingDelete}
				<span class="confirm-delete">
					<span class="confirm-text">Delete?</span>
					<button class="confirm-yes" onclick={confirmDelete}>Yes</button>
					<button class="confirm-no" onclick={cancelDelete}>No</button>
				</span>
			{:else}
				<button
					class="delete-list-btn"
					onclick={handleDelete}
					aria-label="Delete list">&times;</button
				>
			{/if}
		{/if}
	</div>

	{#if !collapsed}
		<div class="list-tasks">
			<TaskInput
				placeholder="Add to {list.name}..."
				onsubmit={handleAdd}
			/>
			{#each tasks as task (task.id)}
				<TaskItem {task} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.someday-list {
		background: var(--bg-surface);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border-radius: 16px;
		padding: 16px;
		box-shadow: var(--shadow-md);
		border: 1px solid var(--border);
		transition: all var(--transition-normal);
	}

	.someday-list:hover {
		border-color: rgba(94, 114, 255, 0.3);
		transform: translateY(-2px);
		box-shadow:
			var(--shadow-md),
			0 8px 16px -4px rgba(0, 0, 0, 0.2);
	}

	.list-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-light);
		margin-bottom: 8px;
	}

	.collapse-btn {
		padding: 4px;
		color: var(--text-muted);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
	}

	.collapse-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.arrow {
		transition: transform var(--transition-bounce);
		display: inline-block;
	}

	.arrow.collapsed {
		transform: rotate(-90deg);
	}

	.list-name {
		flex: 1;
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.list-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
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

	.delete-list-btn {
		color: var(--text-muted);
		opacity: 0;
		font-size: 18px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
		transition: all var(--transition-fast);
		transform: translateX(10px);
	}

	.list-header:hover .delete-list-btn {
		opacity: 1;
		transform: translateX(0);
	}

	.delete-list-btn:hover {
		color: var(--priority-must);
		background: rgba(255, 71, 110, 0.1);
	}

	.confirm-delete {
		display: flex;
		align-items: center;
		gap: 6px;
		animation: fadeIn 0.15s ease-out;
	}

	.confirm-text {
		font-size: 13px;
		font-weight: 600;
		color: var(--priority-must);
	}

	.confirm-yes,
	.confirm-no {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 6px;
		transition: all var(--transition-fast);
	}

	.confirm-yes {
		color: #fff;
		background: var(--priority-must);
	}

	.confirm-yes:hover {
		filter: brightness(1.1);
	}

	.confirm-no {
		color: var(--text-secondary);
		background: var(--bg-hover);
		border: 1px solid var(--border);
	}

	.confirm-no:hover {
		background: var(--border);
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.list-tasks {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
