<script lang="ts">
	import type { Task, ColorLabel } from "$lib/core/types.js";
	import { renderMarkdown } from "$lib/core/markdown.js";
	import {
		toggleTask,
		updateTask,
		deleteTask,
	} from "$lib/stores/app.svelte.js";

	interface Props {
		task: Task;
	}

	let { task }: Props = $props();

	let editing = $state(false);
	let editValue = $state("");
	let editEl: HTMLInputElement | undefined = $state();
	let showSteps = $state(false);
	let justCompleted = $state(false);
	let isHovered = $state(false);

	const colorLabelValues: Record<ColorLabel, string> = {
		none: "transparent",
		red: "#ef4444",
		amber: "#f59e0b",
		teal: "#06b6d4",
	};

	function startEdit() {
		editValue = task.title;
		editing = true;
		requestAnimationFrame(() => editEl?.focus());
	}

	function finishEdit() {
		editing = false;
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== task.title) {
			const now = new Date().toISOString();
			updateTask({
				...task,
				title: trimmed,
				fieldTimestamps: { ...task.fieldTimestamps, title: now },
			});
		}
	}

	function handleEditKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") finishEdit();
		if (e.key === "Escape") {
			editing = false;
		}
	}

	async function handleToggle() {
		if (!task.isCompleted) {
			justCompleted = true;
			setTimeout(() => (justCompleted = false), 600);
		}
		await toggleTask(task.id);
	}

	function handleDelete() {
		deleteTask(task.id);
	}

	function toggleFocused() {
		const now = new Date().toISOString();
		updateTask({
			...task,
			focused: !task.focused,
			fieldTimestamps: { ...task.fieldTimestamps, focused: now },
		});
	}

	function setColorLabel(label: ColorLabel) {
		const next = task.colorLabel === label ? "none" : label;
		const now = new Date().toISOString();
		updateTask({
			...task,
			colorLabel: next,
			fieldTimestamps: { ...task.fieldTimestamps, colorLabel: now },
		});
	}

	function handleWindowKeydown(e: KeyboardEvent) {
		if (!isHovered || editing) return;
		const target = e.target as HTMLElement;
		if (
			target &&
			(target.tagName === "INPUT" || target.tagName === "TEXTAREA")
		)
			return;

		if (e.key === "1") {
			e.preventDefault();
			setColorLabel("red");
		} else if (e.key === "2") {
			e.preventDefault();
			setColorLabel("amber");
		} else if (e.key === "3") {
			e.preventDefault();
			setColorLabel("teal");
		} else if (e.key === "5") {
			e.preventDefault();
			toggleFocused();
		} else if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			handleDelete();
		}
	}

	function toggleStep(stepIdx: number) {
		const steps = task.steps.map((s, i) =>
			i === stepIdx ? { ...s, done: !s.done } : s,
		);
		const now = new Date().toISOString();
		updateTask({
			...task,
			steps,
			fieldTimestamps: { ...task.fieldTimestamps, steps: now },
		});
	}

	let stepsComplete = $derived(task.steps.filter((s) => s.done).length);
	let stepsTotal = $derived(task.steps.length);
	let renderedTitle = $derived(renderMarkdown(task.title));
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div
	class="task-item"
	class:completed={task.isCompleted}
	class:celebrate={justCompleted}
	class:parked={task.parked}
	role="listitem"
	tabindex="0"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<button
		data-no-dnd="true"
		class="checkbox"
		onclick={handleToggle}
		aria-label={task.isCompleted ? "Uncomplete task" : "Complete task"}
	>
		{#if task.isCompleted}
			<svg viewBox="0 0 24 24" fill="none" class="check-icon">
				<path
					d="M5 13l4 4L19 7"
					stroke="#fff"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/>
			</svg>
		{/if}
	</button>

	<button
		data-no-dnd="true"
		class="bolt-btn"
		class:active={task.focused}
		onclick={toggleFocused}
		aria-label={task.focused ? "Remove from focus" : "Add to focus"}
		title={task.focused ? "Remove from focus" : "Add to focus"}
	>
		<svg viewBox="0 0 16 16" fill="none" class="bolt-icon">
			<path
				d="M8.5 1L3 9.5h4.5L6.5 15l6-8.5H8L8.5 1z"
				fill="currentColor"
			/>
		</svg>
	</button>

	{#if task.colorLabel !== "none"}
		<span
			class="color-label"
			style="background: {colorLabelValues[task.colorLabel]}"
		></span>
	{/if}

	{#if editing}
		<input
			data-no-dnd="true"
			bind:this={editEl}
			bind:value={editValue}
			onblur={finishEdit}
			onkeydown={handleEditKeydown}
			class="edit-input"
			type="text"
		/>
	{:else}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<span
			data-no-dnd="true"
			class="task-title"
			class:line-through={task.isCompleted}
			onclick={startEdit}
		>
			{@html renderedTitle}
		</span>
	{/if}

	{#if task.recurrenceRule}
		<span
			data-no-dnd="true"
			class="recurrence-badge"
			title={task.recurrenceRule}>&#x21bb;</span
		>
	{/if}

	{#if stepsTotal > 0}
		<button
			data-no-dnd="true"
			class="steps-badge"
			onclick={() => (showSteps = !showSteps)}
		>
			{stepsComplete}/{stepsTotal}
		</button>
	{/if}

	<button
		data-no-dnd="true"
		class="delete-btn"
		onclick={handleDelete}
		aria-label="Delete task"
	>
		&times;
	</button>
</div>

{#if showSteps && stepsTotal > 0}
	<div class="steps-list">
		{#each task.steps as step, i}
			<div class="step-item" class:step-done={step.done}>
				<button class="step-check" onclick={() => toggleStep(i)}>
					{step.done ? "\u2611" : "\u2610"}
				</button>
				<span class:line-through={step.done}>{step.text}</span>
			</div>
		{/each}
	</div>
{/if}

<style>
	.task-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 12px;
		background: var(--bg-surface);
		border: 1px solid var(--border-light);
		transition: all var(--transition-normal);
		cursor: default;
		min-height: 48px;
		position: relative;
		overflow: hidden;
	}

	.task-item::before {
		content: "";
		position: absolute;
		inset: 0;
		background: linear-gradient(
			135deg,
			rgba(0, 0, 0, 0.05) 0%,
			transparent 100%
		);
		opacity: 0;
		transition: opacity var(--transition-normal);
		pointer-events: none;
	}

	.task-item:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
		border-color: var(--border);
	}

	.task-item:hover::before {
		opacity: 1;
	}

	.task-item.completed {
		opacity: 0.6;
		background: transparent;
		box-shadow: none;
	}

	.task-item.completed:hover {
		transform: none;
	}

	.task-item.parked {
		opacity: 0.7;
		border-left: 3px solid var(--parking);
	}

	.checkbox {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		padding: 0;
		border-radius: 50%;
		border: 2px solid var(--text-muted);
		background: transparent;
		transition: all var(--transition-fast);
	}

	.checkbox:hover {
		border-color: var(--accent);
		background: var(--accent-soft);
	}

	.checkbox svg {
		width: 14px;
		height: 14px;
	}

	.completed .checkbox {
		border-color: var(--success);
		background: var(--success);
	}

	/* Color label — gentle rounded square, Trello-style */
	.color-label {
		flex-shrink: 0;
		width: 8px;
		height: 20px;
		border-radius: 4px;
		opacity: 0.75;
	}

	.task-title {
		flex: 1;
		font-size: 15px;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text);
		transition: color var(--transition-fast);
	}

	.line-through {
		text-decoration: line-through;
		color: var(--text-secondary);
	}

	.edit-input {
		flex: 1;
		font-size: 15px;
		font-weight: 500;
		background: transparent;
		border: none;
		border-bottom: 2px solid var(--accent);
		border-radius: 0;
		padding: 0;
		color: var(--text);
	}

	.edit-input:focus {
		outline: none;
	}

	.recurrence-badge {
		font-size: 14px;
		color: var(--accent);
		flex-shrink: 0;
		opacity: 0.8;
	}

	.steps-badge {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-hover);
		padding: 2px 8px;
		border-radius: 12px;
		border: 1px solid var(--border);
		flex-shrink: 0;
	}

	/* Lightning bolt button */
	.bolt-btn {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: transparent;
		color: var(--border);
		transition: all var(--transition-fast);
		padding: 0;
		opacity: 0.45;
	}

	.bolt-btn:hover {
		opacity: 1;
		color: #d4a017;
		background: rgba(234, 179, 8, 0.08);
	}

	.bolt-btn.active {
		opacity: 1;
		color: #eab308;
		filter: drop-shadow(0 0 2px rgba(234, 179, 8, 0.3));
	}

	.bolt-btn.active:hover {
		color: #ca8a04;
	}

	.bolt-icon {
		width: 16px;
		height: 16px;
	}

	.delete-btn {
		font-size: 18px;
		color: var(--text-muted);
		opacity: 0;
		transform: translateX(10px);
		transition: all var(--transition-fast);
		flex-shrink: 0;
		padding: 4px;
		width: 28px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 6px;
	}

	.task-item:hover .delete-btn {
		opacity: 1;
		transform: translateX(0);
	}

	.delete-btn:hover {
		color: var(--priority-must);
		background: rgba(255, 71, 110, 0.1);
	}

	.steps-list {
		padding: 8px 12px 12px 48px;
		background: var(--bg-surface);
		border-radius: 0 0 12px 12px;
		border: 1px solid var(--border-light);
		border-top: none;
		margin-top: -6px;
		margin-bottom: 8px;
		position: relative;
		z-index: 0;
	}

	.step-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 4px 0;
		font-size: 14px;
		color: var(--text-secondary);
		transition: color var(--transition-fast);
	}

	.step-check {
		font-size: 16px;
		padding: 0;
		color: var(--accent);
		opacity: 0.8;
	}

	.step-check:hover {
		opacity: 1;
	}

	.step-done {
		opacity: 0.5;
	}
</style>
