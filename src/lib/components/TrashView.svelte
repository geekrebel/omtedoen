<script lang="ts">
	import type { Task } from "$lib/core/types.js";
	import {
		getTrashTasks,
		refreshTrash,
		restoreFromTrash,
		getAllLists,
		getToday,
	} from "$lib/stores/app.svelte.js";
	import { addDays } from "$lib/utils/dates.js";
	import { onMount } from "svelte";

	const SHOW_MAX = 200;

	let trash = $derived(getTrashTasks());
	let shown = $derived(trash.slice(0, SHOW_MAX));
	let restoring = $state<Set<string>>(new Set());

	onMount(() => {
		refreshTrash();
	});

	function where(task: Task): string {
		const lists = getAllLists();
		if (task.listId) {
			const list = lists.find((l) => l.id === task.listId);
			if (!list) return "a deleted list";
			if (list.isParkingLot) return "Parking Lot";
			return list.name;
		}
		if (task.dateTarget) {
			const today = getToday();
			if (task.dateTarget === today) return "Today";
			if (task.dateTarget === addDays(today, 1)) return "Tomorrow";
			const d = new Date(task.dateTarget + "T00:00:00");
			return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
		}
		return "Someday";
	}

	function ago(iso: string | null): string {
		if (!iso) return "";
		const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
		if (mins < 1) return "just now";
		if (mins < 60) return `${mins} min ago`;
		const hours = Math.round(mins / 60);
		if (hours < 24) return `${hours} h ago`;
		const days = Math.round(hours / 24);
		if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
		return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
	}

	async function restore(id: string) {
		restoring = new Set([...restoring, id]);
		try {
			await restoreFromTrash(id);
		} finally {
			restoring = new Set([...restoring].filter((x) => x !== id));
		}
	}
</script>

<div class="trash-view">
	<div class="trash-header">
		<h1>Trash</h1>
		<p class="trash-subtitle">
			Deleted cards land here. Restore puts a card back where it was.
		</p>
	</div>

	{#if trash.length === 0}
		<div class="empty">Nothing in the Trash.</div>
	{:else}
		<ul class="trash-list">
			{#each shown as task (task.id)}
				<li class="trash-row">
					<span class="status" class:done={task.isCompleted} aria-hidden="true">
						{#if task.isCompleted}✓{/if}
					</span>
					<div class="text">
						<span class="title" class:done={task.isCompleted}>{task.title}</span>
						<span class="meta">
							From {where(task)} · deleted {ago(task.deletedAt)}
						</span>
					</div>
					<button
						class="restore-btn"
						onclick={() => restore(task.id)}
						disabled={restoring.has(task.id)}
					>
						Restore
					</button>
				</li>
			{/each}
		</ul>
		{#if trash.length > SHOW_MAX}
			<p class="more">Showing the {SHOW_MAX} most recent of {trash.length} deleted cards.</p>
		{/if}
	{/if}
</div>

<style>
	.trash-view {
		padding: 48px 24px;
		max-width: 760px;
		margin: 0 auto;
		width: 100%;
	}

	.trash-header {
		margin-bottom: 24px;
	}

	h1 {
		font-size: 36px;
		font-weight: 800;
		letter-spacing: -0.03em;
		color: var(--text);
	}

	.trash-subtitle {
		font-size: 15px;
		color: var(--text-secondary);
		margin-top: 8px;
	}

	.empty {
		padding: 48px 16px;
		text-align: center;
		color: var(--text-muted);
		border: 2px dashed var(--border);
		border-radius: 16px;
	}

	.trash-list {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 0;
		margin: 0;
	}

	.trash-row {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px 10px 14px;
		border-radius: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-light);
	}

	.status {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		border: 2px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 11px;
		color: #fff;
	}

	.status.done {
		background: #34c38f;
		border-color: transparent;
	}

	.text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.title {
		font-size: 15px;
		font-weight: 500;
		color: var(--text);
		overflow-wrap: anywhere;
	}

	.title.done {
		text-decoration: line-through;
		color: var(--text-secondary);
	}

	.meta {
		font-size: 12px;
		color: var(--text-muted);
	}

	.restore-btn {
		flex-shrink: 0;
		padding: 6px 14px;
		border-radius: 8px;
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		background: var(--accent-soft);
		transition: all var(--transition-fast);
	}

	.restore-btn:hover:not(:disabled) {
		background: var(--accent);
		color: #fff;
	}

	.restore-btn:disabled {
		opacity: 0.5;
		cursor: wait;
	}

	.more {
		margin-top: 12px;
		font-size: 13px;
		color: var(--text-muted);
		text-align: center;
	}
</style>
