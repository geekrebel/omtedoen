<script lang="ts">
	import { marked } from "marked";
	import { saveSetting } from "$lib/stores/app.svelte.js";
	import { onMount } from "svelte";

	let content = $state("");
	let mode: "write" | "preview" = $state("write");
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let textarea: HTMLTextAreaElement;

	// Load saved content on mount
	onMount(async () => {
		const { createStore } = await import("$lib/storage/index.js");
		const store = await createStore();
		const saved = await store.getSetting("scratchpad");
		if (saved) content = saved;
	});

	function autoSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveSetting("scratchpad", content);
		}, 500);
	}

	function handleInput() {
		autoSave();
	}

	function handleKeydown(e: KeyboardEvent) {
		// Tab inserts a tab character instead of moving focus
		if (e.key === "Tab") {
			e.preventDefault();
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;
			content = content.substring(0, start) + "\t" + content.substring(end);
			// Restore cursor position after Svelte updates the DOM
			setTimeout(() => {
				textarea.selectionStart = textarea.selectionEnd = start + 1;
			}, 0);
		}
	}

	let rendered = $derived(marked.parse(content || "*Nothing here yet. Start typing!*") as string);
</script>

<div class="scratchpad-view">
	<div class="scratchpad-header">
		<h1>Scratchpad</h1>
		<div class="mode-toggle">
			<button
				class="mode-btn"
				class:active={mode === "write"}
				onclick={() => mode = "write"}
			>Write</button>
			<button
				class="mode-btn"
				class:active={mode === "preview"}
				onclick={() => mode = "preview"}
			>Preview</button>
		</div>
	</div>

	{#if mode === "write"}
		<textarea
			bind:this={textarea}
			bind:value={content}
			oninput={handleInput}
			onkeydown={handleKeydown}
			class="scratchpad-editor"
			placeholder="Type your notes here... Markdown supported (## headings, **bold**, *italic*, - lists)"
			spellcheck="true"
		></textarea>
	{:else}
		<div class="scratchpad-preview markdown-body">
			{@html rendered}
		</div>
	{/if}
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
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-shrink: 0;
	}

	.scratchpad-header h1 {
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-primary);
		margin: 0;
	}

	.mode-toggle {
		display: flex;
		gap: 2px;
		background: var(--surface-secondary);
		border-radius: 8px;
		padding: 3px;
	}

	.mode-btn {
		padding: 6px 14px;
		border: none;
		background: none;
		border-radius: 6px;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--text-muted);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.mode-btn.active {
		background: var(--surface-primary);
		color: var(--text-primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}

	.scratchpad-editor {
		flex: 1;
		resize: none;
		border: 1px solid var(--border-light);
		border-radius: 10px;
		padding: var(--space-md);
		font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
		font-size: 0.85rem;
		line-height: 1.7;
		color: var(--text-primary);
		background: var(--surface-primary);
		outline: none;
		tab-size: 4;
		transition: border-color var(--transition-fast);
	}

	.scratchpad-editor::placeholder {
		color: var(--text-muted);
		opacity: 0.6;
	}

	.scratchpad-editor:focus {
		border-color: var(--accent-primary);
	}

	.scratchpad-preview {
		flex: 1;
		overflow-y: auto;
		border: 1px solid var(--border-light);
		border-radius: 10px;
		padding: var(--space-md) var(--space-lg);
		background: var(--surface-primary);
		color: var(--text-primary);
		line-height: 1.7;
	}

	/* Markdown rendered styles */
	.markdown-body :global(h1) {
		font-size: 1.6rem;
		font-weight: 700;
		margin: 0 0 0.6em;
		padding-bottom: 0.3em;
		border-bottom: 1px solid var(--border-light);
	}

	.markdown-body :global(h2) {
		font-size: 1.3rem;
		font-weight: 600;
		margin: 1.2em 0 0.4em;
	}

	.markdown-body :global(h3) {
		font-size: 1.1rem;
		font-weight: 600;
		margin: 1em 0 0.3em;
	}

	.markdown-body :global(p) {
		margin: 0 0 0.8em;
	}

	.markdown-body :global(ul),
	.markdown-body :global(ol) {
		margin: 0 0 0.8em;
		padding-left: 1.5em;
	}

	.markdown-body :global(li) {
		margin: 0.2em 0;
	}

	.markdown-body :global(code) {
		background: var(--surface-secondary);
		padding: 0.15em 0.4em;
		border-radius: 4px;
		font-size: 0.85em;
		font-family: "SF Mono", "Fira Code", monospace;
	}

	.markdown-body :global(pre) {
		background: var(--surface-secondary);
		padding: var(--space-md);
		border-radius: 8px;
		overflow-x: auto;
		margin: 0 0 0.8em;
	}

	.markdown-body :global(pre code) {
		background: none;
		padding: 0;
	}

	.markdown-body :global(blockquote) {
		border-left: 3px solid var(--accent-primary);
		margin: 0 0 0.8em;
		padding: 0.4em 0 0.4em 1em;
		color: var(--text-secondary);
	}

	.markdown-body :global(hr) {
		border: none;
		border-top: 1px solid var(--border-light);
		margin: 1.2em 0;
	}

	.markdown-body :global(a) {
		color: var(--accent-primary);
		text-decoration: none;
	}

	.markdown-body :global(strong) {
		font-weight: 600;
	}

	.markdown-body :global(table) {
		border-collapse: collapse;
		margin: 0 0 0.8em;
		width: 100%;
	}

	.markdown-body :global(th),
	.markdown-body :global(td) {
		border: 1px solid var(--border-light);
		padding: 0.4em 0.8em;
		text-align: left;
	}

	.markdown-body :global(th) {
		background: var(--surface-secondary);
		font-weight: 600;
	}
</style>
