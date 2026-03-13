<script lang="ts">
	import { addTask } from "$lib/stores/app.svelte.js";
	import { todayISO, dayLabel, addDays } from "$lib/utils/dates.js";
	import { extractRecurrence, nextOccurrence } from "$lib/core/recurrence.js";
	import { extractDateTarget } from "$lib/core/date-parser.js";

	interface Props {
		onTaskHoverChange?: (isHovered: boolean) => void;
		focusMode?: boolean;
		onToggleFocus?: () => void;
	}

	let { onTaskHoverChange, focusMode = false, onToggleFocus }: Props = $props();

	let value = $state("");
	let inputEl: HTMLInputElement | undefined = $state();
	let isFocused = $state(false);
	let taskHovered = $state(false);

	// Live preview of what will happen
	let preview = $derived(() => {
		if (!value.trim()) return null;
		const { title: afterRecurrence, rule, ruleText } = extractRecurrence(value.trim());
		const { title, parsedDate, dateText } = extractDateTarget(afterRecurrence);

		// Nothing interesting to preview
		if (!rule && !parsedDate) return null;

		let targetDate: string;
		if (rule) {
			const next = nextOccurrence(rule, parsedDate || todayISO());
			targetDate = next ? dayLabel(next) : dayLabel(parsedDate || todayISO());
		} else {
			targetDate = dayLabel(parsedDate!);
		}

		return {
			title,
			ruleText: ruleText || null,
			dateText: dateText || null,
			targetDate,
		};
	});

	let previewInfo = $derived(preview());

	async function handleSubmit() {
		if (value.trim()) {
			const task = await addTask(value.trim(), todayISO());
			value = "";
			// Keep focus in the input for rapid entry
			requestAnimationFrame(() => inputEl?.focus());
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			handleSubmit();
		}
		if (e.key === "Escape") {
			value = "";
			inputEl?.blur();
		}
	}

	function handleTaskHoverChange(isHovered: boolean) {
		taskHovered = isHovered;
		if (onTaskHoverChange) {
			onTaskHoverChange(isHovered);
		}

		// Blur input when task is hovered, preserve value
		if (isHovered && isFocused) {
			inputEl?.blur();
		}
	}

	// Expose for parent to call
	export function notifyTaskHovered(isHovered: boolean) {
		handleTaskHoverChange(isHovered);
	}

	// Re-focus if task hover ends and input had focus before
	$effect(() => {
		if (!taskHovered && isFocused && document.activeElement !== inputEl) {
			requestAnimationFrame(() => inputEl?.focus());
		}
	});

	function handleFocusToggle() {
		onToggleFocus?.();
	}
</script>

<div class="quick-add-bar">
	<input
		bind:this={inputEl}
		bind:value
		onkeydown={handleKeydown}
		onfocus={() => (isFocused = true)}
		onblur={() => (isFocused = false)}
		placeholder="Add a task... (or press Q for full editor)"
		type="text"
		autocomplete="off"
		class="quick-add-input"
	/>

	{#if onToggleFocus}
		<button
			class="focus-mode-btn"
			class:active={focusMode}
			onclick={handleFocusToggle}
			title="Toggle Focus Mode (⌘⇧F)"
		>
			{#if focusMode}✕ Exit Focus{:else}⚡ Focus{/if}
		</button>
	{/if}

	{#if isFocused && previewInfo}
		<div class="quick-add-preview">
			"{previewInfo.title}" &rarr; {previewInfo.targetDate}{#if previewInfo.ruleText}, repeats {previewInfo.ruleText}{/if}
		</div>
	{/if}
</div>

<style>
	.quick-add-bar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 24px;
		background: var(--bg-surface);
		border-bottom: 1px solid var(--border-light);
		position: relative;
		z-index: 5;
	}

	.quick-add-input {
		flex: 1;
		min-width: 0;
		font-size: 15px;
		font-weight: 400;
		color: var(--text);
		padding: 12px 16px;
		border: 1px solid var(--border-light);
		border-radius: 12px;
		background: var(--bg);
		transition:
			border-color var(--transition-normal),
			box-shadow var(--transition-normal);
	}

	.quick-add-input:focus {
		outline: none;
		border-color: var(--heading-green);
		box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.1);
	}

	.quick-add-input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}

	.quick-add-preview {
		margin-top: 8px;
		font-size: 12px;
		font-weight: 600;
		color: var(--heading-green);
		background: rgba(45, 106, 79, 0.08);
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(45, 106, 79, 0.15);
	}

	/* Focus Mode Button */
	.focus-mode-btn {
		flex-shrink: 0;
		padding: 6px 14px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 600;
		border: 1.5px solid var(--border);
		color: var(--text-secondary);
		transition: all var(--transition-fast);
		white-space: nowrap;
		background: transparent;
		cursor: pointer;
	}

	.focus-mode-btn:hover {
		border-color: var(--heading-green);
		color: var(--heading-green);
	}

	.focus-mode-btn.active {
		background: rgba(45, 106, 79, 0.12);
		border-color: var(--heading-green);
		color: var(--heading-green);
		box-shadow: 0 0 12px rgba(45, 106, 79, 0.2);
	}
</style>
