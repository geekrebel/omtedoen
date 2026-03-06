<script lang="ts">
	import type { List } from "$lib/core/types.js";
	import TaskItem from "./TaskItem.svelte";
	import TaskInput from "./TaskInput.svelte";
	import {
		addTask,
		getTasksForList,
		deleteList,
	} from "$lib/stores/app.svelte.js";

	interface Props {
		list: List;
	}

	let { list }: Props = $props();

	let tasks = $derived(getTasksForList(list.id));
	let collapsed = $state(false);

	function handleAdd(title: string) {
		addTask(title, null, list.id);
	}

	function handleDelete() {
		if (confirm(`Delete "${list.name}" and all its tasks?`)) {
			deleteList(list.id);
		}
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
			class="delete-list-btn"
			onclick={handleDelete}
			aria-label="Delete list">&times;</button
		>
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
		animation: popIn 0.4s var(--transition-bounce);
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

	.list-tasks {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
</style>
