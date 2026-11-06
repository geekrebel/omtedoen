<script lang="ts">
	import type { List } from "$lib/core/types.js";
	import SomedayList from "./SomedayList.svelte";
	import { getSomedayLists, addList, reorderList } from "$lib/stores/app.svelte.js";
	import { dragHandleZone } from "svelte-dnd-action";

	let lists = $derived(getSomedayLists());
	let newListName = $state("");

	// Local copy for drag-and-drop of whole lists (dragged by their handle only)
	let dndLists = $state<List[]>([]);

	$effect(() => {
		dndLists = lists.map((l) => ({ ...l }));
	});

	function handleAddList() {
		if (newListName.trim()) {
			addList(newListName.trim());
			newListName = "";
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") handleAddList();
	}

	function handleListConsider(e: CustomEvent<{ items: List[] }>) {
		dndLists = e.detail.items;
	}

	function handleListFinalize(e: CustomEvent<{ items: List[] }>) {
		dndLists = e.detail.items;
		// Renumber 1..n in the new order (only lists whose number changed are written)
		e.detail.items.forEach((item, idx) => {
			const original = lists.find((l) => l.id === item.id);
			if (original && original.sortOrder !== idx + 1) {
				reorderList(item.id, idx + 1);
			}
		});
	}
</script>

<div class="someday-view">
	<div class="someday-header">
		<h1>Someday</h1>
		<p class="someday-subtitle">
			Your board. Hover a card and press <kbd>B</kbd> to add it to Today &mdash; it
			stays on its list too.
		</p>
	</div>

	<div class="board">
		<div
			class="board-lists"
			use:dragHandleZone={{
				items: dndLists,
				type: "board-list",
				flipDurationMs: 150,
				dropTargetStyle: {},
			}}
			onconsider={handleListConsider}
			onfinalize={handleListFinalize}
		>
			{#each dndLists as list (list.id)}
				<div class="board-column">
					<SomedayList {list} />
				</div>
			{/each}
		</div>

		<div class="add-list-card">
			<input
				bind:value={newListName}
				onkeydown={handleKeydown}
				placeholder="New list name..."
				type="text"
			/>
			<button onclick={handleAddList} disabled={!newListName.trim()}
				>+ Add List</button
			>
		</div>
	</div>
</div>

<style>
	.someday-view {
		padding: 48px 24px 24px;
		display: flex;
		flex-direction: column;
		min-height: 0;
		height: 100%;
	}

	.someday-header {
		margin-bottom: 24px;
		max-width: 960px;
	}

	h1 {
		font-size: 36px;
		font-weight: 800;
		letter-spacing: -0.03em;
		background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: 0 2px 10px rgba(165, 180, 252, 0.2);
	}

	.someday-subtitle {
		font-size: 15px;
		color: var(--text-secondary);
		margin-top: 8px;
	}

	kbd {
		font-family: inherit;
		font-size: 12px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
		background: var(--bg-hover);
	}

	.board {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		overflow-x: auto;
		overflow-y: hidden;
		flex: 1;
		min-height: 0;
		padding-bottom: 16px;
	}

	.board-lists {
		display: flex;
		align-items: flex-start;
		gap: 16px;
		height: 100%;
	}

	.board-column {
		flex: 0 0 320px;
		width: 320px;
		max-height: 100%;
		display: flex;
		flex-direction: column;
	}

	.add-list-card {
		flex: 0 0 280px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px;
		background: rgba(255, 255, 255, 0.03);
		border: 2px dashed var(--border);
		border-radius: 16px;
		min-height: 72px;
		transition: all var(--transition-normal);
	}

	.add-list-card:focus-within {
		border-color: var(--accent);
		background: rgba(255, 255, 255, 0.05);
		box-shadow: var(--shadow-glow);
	}

	.add-list-card input {
		flex: 1;
		min-width: 0;
		padding: 8px 12px;
		font-size: 15px;
		font-weight: 500;
	}

	.add-list-card input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}

	.add-list-card button {
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--accent);
		background: var(--accent-soft);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.add-list-card button:hover:not(:disabled) {
		background: var(--accent);
		color: #fff;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(94, 114, 255, 0.3);
	}

	.add-list-card button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		background: transparent;
	}
</style>
