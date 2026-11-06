<script lang="ts">
	import type { List, Task } from "$lib/core/types.js";
	import TaskItem from "./TaskItem.svelte";
	import TaskInput from "./TaskInput.svelte";
	import {
		addTask,
		getTasksForList,
		deleteList,
		renameList,
		moveTaskToList,
		sortListTasksByColor,
		getAllLists,
		getDefaultSomedayId,
	} from "$lib/stores/app.svelte.js";
	import { dndzone, dragHandle } from "svelte-dnd-action";

	interface Props {
		list: List;
	}

	let { list }: Props = $props();

	let tasks = $derived(getTasksForList(list.id));
	let openCount = $derived(tasks.filter((t) => !t.isCompleted).length);
	let collapsed = $state(false);
	let confirmingDelete = $state(false);

	let defaultListName = $derived(
		getAllLists().find((l) => l.id === getDefaultSomedayId())?.name ?? "Someday",
	);

	// Rename
	let renaming = $state(false);
	let renameValue = $state("");
	let renameEl: HTMLInputElement | undefined = $state();

	function startRename() {
		renameValue = list.name;
		renaming = true;
		requestAnimationFrame(() => {
			renameEl?.focus();
			renameEl?.select();
		});
	}

	function finishRename() {
		if (!renaming) return;
		renaming = false;
		if (renameValue.trim() && renameValue.trim() !== list.name) {
			renameList(list.id, renameValue);
		}
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") finishRename();
		if (e.key === "Escape") renaming = false;
	}

	// Cards drag within and between board lists
	let dndItems = $state<Task[]>([]);

	$effect(() => {
		dndItems = tasks.map((t) => ({ ...t }));
	});

	function handleDndConsider(e: CustomEvent<{ items: Task[] }>) {
		dndItems = e.detail.items;
	}

	function handleDndFinalize(e: CustomEvent<{ items: Task[] }>) {
		dndItems = e.detail.items;
		// Renumber this list 1..n; only cards that moved (or arrived) get written
		e.detail.items.forEach((item, idx) => {
			const original = tasks.find((t) => t.id === item.id);
			if (!original || original.listSortOrder !== idx + 1) {
				moveTaskToList(item.id, list.id, idx + 1);
			}
		});
	}

	function handleAdd(title: string) {
		addTask(title, null, list.id, { skipDateParsing: true });
	}

	function confirmDelete() {
		deleteList(list.id);
		confirmingDelete = false;
	}
</script>

<div class="someday-list">
	<div class="list-header">
		<!-- Not a <button>: svelte-dnd-action won't start a drag from form controls -->
		<span class="drag-handle" title="Drag to reorder list" aria-label="Drag to reorder list" use:dragHandle>
			<svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
				<circle cx="3" cy="3" r="1.3"/><circle cx="7" cy="3" r="1.3"/>
				<circle cx="3" cy="7" r="1.3"/><circle cx="7" cy="7" r="1.3"/>
				<circle cx="3" cy="11" r="1.3"/><circle cx="7" cy="11" r="1.3"/>
			</svg>
		</span>
		<button class="collapse-btn" onclick={() => (collapsed = !collapsed)} aria-label={collapsed ? "Expand list" : "Collapse list"}>
			<span class="arrow" class:collapsed>{collapsed ? "▸" : "▾"}</span>
		</button>
		{#if renaming}
			<input
				class="rename-input"
				bind:this={renameEl}
				bind:value={renameValue}
				onblur={finishRename}
				onkeydown={handleRenameKeydown}
				aria-label="List name"
			/>
		{:else}
			<button class="list-name" title="Click to rename" onclick={startRename}>{list.name}</button>
		{/if}
		<span class="list-count">{openCount}</span>
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
		{#if !list.isDefault && !confirmingDelete}
			<button
				class="delete-list-btn"
				onclick={() => (confirmingDelete = true)}
				aria-label="Delete list">&times;</button
			>
		{/if}
	</div>

	{#if confirmingDelete}
		<div class="confirm-delete">
			<span class="confirm-text">
				Delete “{list.name}”?
				{#if tasks.length > 0}
					Its {tasks.length} card{tasks.length === 1 ? "" : "s"} will move to {defaultListName}.
				{/if}
			</span>
			<span class="confirm-actions">
				<button class="confirm-yes" onclick={confirmDelete}>Delete list</button>
				<button class="confirm-no" onclick={() => (confirmingDelete = false)}>Cancel</button>
			</span>
		</div>
	{/if}

	{#if !collapsed}
		<TaskInput placeholder="Add to {list.name}..." onsubmit={handleAdd} />
		<div
			class="list-tasks"
			use:dndzone={{
				items: dndItems,
				type: "board-card",
				flipDurationMs: 150,
				dropTargetStyle: { outline: "2px dashed var(--border)", "border-radius": "10px" },
			}}
			onconsider={handleDndConsider}
			onfinalize={handleDndFinalize}
		>
			{#each dndItems as task (task.id)}
				<TaskItem {task} variant="board" />
			{/each}
		</div>
	{/if}
</div>

<style>
	.someday-list {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-height: 100%;
		min-height: 0;
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
	}

	.drag-handle {
		color: var(--text-muted);
		opacity: 0.4;
		cursor: grab;
		padding: 4px 2px;
		display: flex;
		align-items: center;
		border-radius: 4px;
		transition: opacity var(--transition-fast);
	}

	.drag-handle:hover {
		opacity: 1;
		background: var(--bg-hover);
	}

	.drag-handle:active {
		cursor: grabbing;
	}

	.rename-input {
		flex: 1;
		min-width: 0;
		font-size: 16px;
		font-weight: 700;
		padding: 2px 6px;
		border-radius: 6px;
	}

	.list-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-bottom: 12px;
		border-bottom: 1px solid var(--border-light);
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
		min-width: 0;
		text-align: left;
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		padding: 2px 6px;
		border-radius: 6px;
		cursor: text;
	}

	.list-name:hover {
		background: var(--bg-hover);
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
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 10px;
		background: rgba(255, 71, 110, 0.06);
		animation: fadeIn 0.15s ease-out;
	}

	.confirm-actions {
		display: flex;
		gap: 6px;
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
		min-height: 40px; /* keeps an empty list droppable */
		overflow-y: auto;
		padding: 2px;
	}
</style>
