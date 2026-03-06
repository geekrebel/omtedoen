<script lang="ts">
	import TaskItem from "./TaskItem.svelte";
	import { getParkedTasks, unparkTask } from "$lib/stores/app.svelte.js";

	let tasks = $derived(getParkedTasks());
	let collapsed = $state(false);
</script>

<div class="parking-lot">
	<div class="parking-header">
		<button class="collapse-btn" onclick={() => (collapsed = !collapsed)}>
			<span>{collapsed ? "▸" : "▾"}</span>
		</button>
		<h3>Parking Lot</h3>
		<span class="parking-count">{tasks.length}</span>
		<span class="parking-hint">Tasks that kept rolling over</span>
	</div>

	{#if !collapsed && tasks.length > 0}
		<div class="parking-tasks">
			{#each tasks as task (task.id)}
				<div class="parked-task-row">
					<TaskItem {task} />
					<button
						class="unpark-btn"
						onclick={() => unparkTask(task.id)}
						title="Move back to today"
					>
						&#x21A9;
					</button>
				</div>
			{/each}
		</div>
	{:else if !collapsed}
		<p class="parking-empty">
			Nothing parked. Tasks that roll over 3+ days end up here
			automatically.
		</p>
	{/if}
</div>

<style>
	.parking-lot {
		background: rgba(168, 85, 247, 0.08);
		border: 1px dashed rgba(168, 85, 247, 0.3);
		border-radius: 16px;
		padding: 16px;
		margin-top: 24px;
		transition: all var(--transition-normal);
	}

	.parking-lot:hover {
		background: rgba(168, 85, 247, 0.12);
		border-style: solid;
	}

	.parking-header {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.collapse-btn {
		padding: 4px;
		color: var(--parking);
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background var(--transition-fast);
	}

	.collapse-btn:hover {
		background: rgba(168, 85, 247, 0.15);
	}

	.collapse-btn span {
		display: inline-block;
		transition: transform var(--transition-bounce);
	}

	.collapse-btn span.collapsed {
		transform: rotate(-90deg);
	}

	h3 {
		font-size: 15px;
		font-weight: 700;
		color: var(--parking);
		letter-spacing: 0.02em;
	}

	.parking-count {
		font-size: 12px;
		font-weight: 600;
		color: var(--accent);
		background: var(--parking);
		padding: 2px 8px;
		border-radius: 12px;
		box-shadow: 0 2px 8px rgba(168, 85, 247, 0.4);
	}

	.parking-hint {
		flex: 1;
		text-align: right;
		font-size: 12px;
		color: var(--text-muted);
		font-style: italic;
	}

	.parking-tasks {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.parked-task-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.parked-task-row :global(.task-item) {
		flex: 1;
		background: var(--bg-surface);
	}

	.unpark-btn {
		padding: 8px;
		color: var(--parking);
		font-size: 18px;
		opacity: 0;
		transform: translateX(-10px);
		transition: all var(--transition-fast);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.parked-task-row:hover .unpark-btn {
		opacity: 1;
		transform: translateX(0);
	}

	.unpark-btn:hover {
		background: rgba(168, 85, 247, 0.15);
		color: #d8b4fe;
	}

	.parking-empty {
		font-size: 14px;
		color: var(--text-muted);
		padding: 16px 8px 8px;
	}
</style>
