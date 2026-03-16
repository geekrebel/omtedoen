<script lang="ts">
	import { saveSetting } from "$lib/stores/app.svelte.js";
	import { newId } from "$lib/core/ids.js";
	import { onMount, tick } from "svelte";

	type OutlineNode = {
		id: string;
		text: string;
		indent: number;
		collapsed: boolean;
	};

	let nodes: OutlineNode[] = $state([{ id: newId(), text: "", indent: 0, collapsed: false }]);
	let focusId: string | null = $state(null);
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let nodeElements: Record<string, HTMLElement> = {};

	onMount(async () => {
		const { createStore } = await import("$lib/storage/index.js");
		const store = await createStore();
		const saved = await store.getSetting("scratchpad");
		if (saved) {
			try {
				const parsed = JSON.parse(saved);
				if (Array.isArray(parsed) && parsed.length > 0) {
					nodes = parsed;
				}
			} catch {
				// Old markdown content or invalid JSON — start fresh
			}
		}
	});

	function autoSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveSetting("scratchpad", JSON.stringify(nodes));
		}, 500);
	}

	function hasChildren(index: number): boolean {
		return index < nodes.length - 1 && nodes[index + 1].indent > nodes[index].indent;
	}

	function getVisibleNodes(): Array<OutlineNode & { _index: number }> {
		const result: Array<OutlineNode & { _index: number }> = [];
		let skipBelow = -1;
		for (let i = 0; i < nodes.length; i++) {
			if (skipBelow >= 0 && nodes[i].indent > skipBelow) continue;
			skipBelow = -1;
			result.push({ ...nodes[i], _index: i });
			if (nodes[i].collapsed && hasChildren(i)) {
				skipBelow = nodes[i].indent;
			}
		}
		return result;
	}

	let visibleNodes = $derived(getVisibleNodes());

	function focusNode(id: string, end = true) {
		focusId = id;
		tick().then(() => {
			const el = nodeElements[id];
			if (!el) return;
			el.focus();
			if (end && el.textContent) {
				const range = document.createRange();
				const sel = window.getSelection();
				range.selectNodeContents(el);
				range.collapse(false);
				sel?.removeAllRanges();
				sel?.addRange(range);
			}
		});
	}

	function handleKeydown(e: KeyboardEvent, id: string) {
		const index = nodes.findIndex((n) => n.id === id);
		if (index === -1) return;

		if (e.key === "Enter") {
			e.preventDefault();
			const newNode: OutlineNode = { id: newId(), text: "", indent: nodes[index].indent, collapsed: false };
			nodes = [...nodes.slice(0, index + 1), newNode, ...nodes.slice(index + 1)];
			autoSave();
			focusNode(newNode.id);
			return;
		}

		if (e.key === "Tab") {
			e.preventDefault();
			if (e.shiftKey) {
				// Outdent
				if (nodes[index].indent > 0) {
					nodes[index] = { ...nodes[index], indent: nodes[index].indent - 1 };
					nodes = [...nodes];
					autoSave();
				}
			} else {
				// Indent — only if there's a node above and we won't exceed its indent + 1
				if (index > 0 && nodes[index].indent <= nodes[index - 1].indent) {
					nodes[index] = { ...nodes[index], indent: nodes[index].indent + 1 };
					nodes = [...nodes];
					autoSave();
				}
			}
			return;
		}

		if (e.key === "Backspace") {
			const el = nodeElements[id];
			const text = el?.textContent ?? "";
			if (text === "" && nodes.length > 1) {
				e.preventDefault();
				// Find previous visible node to focus
				const visIdx = visibleNodes.findIndex((n) => n.id === id);
				const prevVisible = visIdx > 0 ? visibleNodes[visIdx - 1] : null;
				nodes = nodes.filter((n) => n.id !== id);
				autoSave();
				if (prevVisible) focusNode(prevVisible.id);
				return;
			}
		}

		if (e.key === "ArrowUp") {
			const visIdx = visibleNodes.findIndex((n) => n.id === id);
			if (visIdx > 0) {
				e.preventDefault();
				focusNode(visibleNodes[visIdx - 1].id);
			}
			return;
		}

		if (e.key === "ArrowDown") {
			const visIdx = visibleNodes.findIndex((n) => n.id === id);
			if (visIdx < visibleNodes.length - 1) {
				e.preventDefault();
				focusNode(visibleNodes[visIdx + 1].id);
			}
			return;
		}
	}

	function handleInput(e: Event, id: string) {
		const el = e.target as HTMLElement;
		const index = nodes.findIndex((n) => n.id === id);
		if (index === -1) return;
		nodes[index] = { ...nodes[index], text: el.textContent ?? "" };
		autoSave();
	}

	function toggleCollapse(id: string) {
		const index = nodes.findIndex((n) => n.id === id);
		if (index === -1 || !hasChildren(index)) return;
		nodes[index] = { ...nodes[index], collapsed: !nodes[index].collapsed };
		nodes = [...nodes];
		autoSave();
	}
</script>

<div class="scratchpad-view">
	<div class="scratchpad-header">
		<h1>Scratchpad</h1>
	</div>

	<div class="outline-list">
		{#each visibleNodes as node (node.id)}
			<div class="outline-row" style="padding-left: {node.indent * 24}px">
				<button
					class="outline-bullet"
					class:has-children={hasChildren(node._index)}
					class:collapsed={node.collapsed}
					onclick={() => toggleCollapse(node.id)}
					tabindex={-1}
				>
					{#if hasChildren(node._index)}
						<svg width="10" height="10" viewBox="0 0 10 10" class="caret">
							<path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					{:else}
						<span class="dot"></span>
					{/if}
				</button>
				<span
					class="outline-text"
					contenteditable="true"
					role="textbox"
					bind:this={nodeElements[node.id]}
					onkeydown={(e) => handleKeydown(e, node.id)}
					oninput={(e) => handleInput(e, node.id)}
					data-placeholder="Type something..."
				>{node.text}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	.scratchpad-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		padding: var(--space-lg);
		gap: var(--space-md);
	}

	.scratchpad-header {
		flex-shrink: 0;
	}

	.scratchpad-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.outline-list {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-sm) 0;
	}

	.outline-row {
		display: flex;
		align-items: flex-start;
		padding: 2px 0;
		border-radius: 4px;
		transition: background var(--transition-fast);
	}

	.outline-row:hover {
		background: rgba(0, 0, 0, 0.02);
	}

	.outline-bullet {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 24px;
		flex-shrink: 0;
		border: none;
		background: none;
		padding: 0;
		cursor: pointer;
		color: var(--text-muted);
		transition: color var(--transition-fast);
	}

	.outline-bullet:hover {
		color: var(--text-primary);
	}

	.outline-bullet .dot {
		display: block;
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--text-muted);
		opacity: 0.5;
	}

	.outline-bullet .caret {
		transition: transform 0.15s ease;
	}

	.outline-bullet.has-children .caret {
		transform: rotate(90deg);
	}

	.outline-bullet.collapsed .caret {
		transform: rotate(0deg);
	}

	.outline-text {
		flex: 1;
		min-height: 24px;
		line-height: 24px;
		outline: none;
		color: var(--text-primary);
		font-size: 0.9rem;
		padding: 0 4px;
		word-break: break-word;
	}

	.outline-text:empty::before {
		content: attr(data-placeholder);
		color: var(--text-muted);
		opacity: 0.4;
		pointer-events: none;
	}

	.outline-text:focus {
		background: rgba(0, 0, 0, 0.02);
		border-radius: 3px;
	}
</style>
