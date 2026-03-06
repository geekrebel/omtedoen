<script lang="ts">
	import SomedayList from "./SomedayList.svelte";
	import { getSomedayLists, addList } from "$lib/stores/app.svelte.js";

	let lists = $derived(getSomedayLists());
	let newListName = $state("");

	function handleAddList() {
		if (newListName.trim()) {
			addList(newListName.trim());
			newListName = "";
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") handleAddList();
	}
</script>

<div class="someday-view">
	<div class="someday-header">
		<h1>Someday Lists</h1>
		<p class="someday-subtitle">
			Tasks without a deadline. Drag them to a day when you're ready.
		</p>
	</div>

	<div class="lists-grid">
		{#each lists as list (list.id)}
			<SomedayList {list} />
		{/each}

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
		padding: 48px 24px;
		max-width: 960px;
		margin: 0 auto;
	}

	.someday-header {
		margin-bottom: 32px;
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

	.lists-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 20px;
	}

	.add-list-card {
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
