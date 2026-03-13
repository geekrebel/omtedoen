<script lang="ts">
	import type { Task, ColorLabel } from "$lib/core/types.js";
	import { renderMarkdown } from "$lib/core/markdown.js";
	import {
		toggleTask,
		updateTask,
		deleteTask,
		moveTask,
		getDefaultSomedayId,
		getToday,
		getTodayTasks,
		setTaskColorLabel,
	} from "$lib/stores/app.svelte.js";
	import { addDays } from "$lib/utils/dates.js";
	import { sortOrderBetween } from "$lib/core/task-engine.js";

	interface Props {
		task: Task;
		onTaskHoverChange?: (isHovered: boolean) => void;
	}

	let { task, onTaskHoverChange }: Props = $props();

	let editing = $state(false);
	let editValue = $state("");
	let editEl: HTMLInputElement | undefined = $state();
	let showSteps = $state(false);
	let justCompleted = $state(false);
	let isHovered = $state(false);
	let animateToSomeday = $state(false);
	let showMenu = $state(false);
	let menuEl: HTMLDivElement | undefined = $state();

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
		setTaskColorLabel(task.id, label);
	}

	function handleMenuClick(e: KeyboardEvent | Event) {
		e.stopPropagation();
		showMenu = !showMenu;
	}

	function closeMenu() {
		showMenu = false;
	}

	function handleWindowClick(e: MouseEvent) {
		if (showMenu && menuEl && !menuEl.contains(e.target as Node)) {
			closeMenu();
		}
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
		} else if (e.key === "t" || e.key === "T") {
			e.preventDefault();
			moveToTomorrow();
		} else if (e.key === "s" || e.key === "S") {
			e.preventDefault();
			moveToSomeday();
		} else if (e.key === "b" || e.key === "B") {
			e.preventDefault();
			moveToToday();
		} else if (e.key === "Delete" || e.key === "Backspace") {
			e.preventDefault();
			handleDelete();
		}
	}

	function moveToTomorrow() {
		if (!task.dateTarget) return;
		const tomorrow = addDays(task.dateTarget, 1);
		moveTask(task.id, tomorrow, null, task.sortOrder);
	}

	function moveToSomeday() {
		animateToSomeday = true;
		setTimeout(() => {
			moveTask(task.id, null, getDefaultSomedayId(), task.sortOrder);
			animateToSomeday = false;
		}, 500);
	}

	function moveToToday() {
		if (task.listId) {
			const todayTasks = getTodayTasks();
			const topSortOrder = todayTasks.length > 0
				? sortOrderBetween(null, Math.min(...todayTasks.map((t) => t.sortOrder)))
				: 1;
			moveTask(task.id, getToday(), null, topSortOrder);
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

<svelte:window onkeydown={handleWindowKeydown} onclick={handleWindowClick} />

<div
	class="task-item"
	class:completed={task.isCompleted}
	class:celebrate={justCompleted}
	class:parked={task.parked}
	class:animate-to-someday={animateToSomeday}
	role="listitem"
	tabindex="0"
	onmouseenter={() => {
		isHovered = true;
		onTaskHoverChange?.(true);
	}}
	onmouseleave={() => {
		isHovered = false;
		onTaskHoverChange?.(false);
	}}
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

	{#if task.listId}
		<span
			data-no-dnd="true"
			class="bucket-icon"
			title="In Someday list"
		>
			<svg viewBox="0 0 16 16" fill="none" class="bucket-svg">
				<path d="M3 5h10l-1 9H4L3 5z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>
				<path d="M2 4h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
				<path d="M6 4V3a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
			</svg>
		</span>
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

	<div class="menu-container" bind:this={menuEl}>
		<button
			data-no-dnd="true"
			class="menu-btn"
			onclick={handleMenuClick}
			aria-label="More options"
			title="More options"
		>
			&vellip;
		</button>

		{#if showMenu}
			<div class="task-menu">
				{#if task.dateTarget}
					<button
						class="menu-item"
						onclick={() => {
							const tomorrow = task.dateTarget ? addDays(task.dateTarget, 1) : getToday();
							moveTask(task.id, tomorrow, null, task.sortOrder);
							closeMenu();
						}}
					>
						Move to Tomorrow
					</button>
				{/if}
				<button
					class="menu-item"
					onclick={() => {
						moveTask(task.id, getToday(), null, task.sortOrder);
						closeMenu();
					}}
				>
					Move to Today
				</button>
				<button
					class="menu-item"
					onclick={() => {
						moveToSomeday();
						closeMenu();
					}}
				>
					Move to Someday
				</button>
				<button
					class="menu-item delete-item"
					onclick={() => {
						handleDelete();
						closeMenu();
					}}
				>
					Delete
				</button>
			</div>
		{/if}
	</div>

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

	/* Bucket icon for Someday items */
	.bucket-icon {
		flex-shrink: 0;
		width: 16px;
		height: 16px;
		color: var(--text-muted);
		opacity: 0.7;
		transition: all var(--transition-fast);
	}

	.bucket-icon:hover {
		opacity: 1;
		color: var(--accent);
	}

	.bucket-svg {
		width: 16px;
		height: 16px;
	}

	/* Animation when moving to Someday */
	.task-item.animate-to-someday {
		animation: swishToSomeday 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes swishToSomeday {
		0% {
			opacity: 1;
			transform: translateY(0) translateX(0) scale(1);
		}
		70% {
			opacity: 0.5;
			transform: translateY(20px) translateX(-30px) scale(0.95);
		}
		100% {
			opacity: 0;
			transform: translateY(40px) translateX(-50px) scale(0.8);
		}
	}

	/* Menu button and dropdown */
	.menu-container {
		flex-shrink: 0;
		position: relative;
	}

	.menu-btn {
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
		background: transparent;
		cursor: pointer;
	}

	.task-item:hover .menu-btn {
		opacity: 1;
		transform: translateX(0);
	}

	.menu-btn:hover {
		color: var(--accent);
		background: var(--bg-hover);
	}

	.task-menu {
		position: absolute;
		right: 0;
		top: 100%;
		margin-top: 4px;
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
		z-index: 100;
		min-width: 160px;
		overflow: hidden;
		animation: menuIn 0.15s ease-out;
	}

	@keyframes menuIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.menu-item {
		display: block;
		width: 100%;
		padding: 10px 12px;
		text-align: left;
		font-size: 13px;
		font-weight: 500;
		color: var(--text);
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border-light);
		cursor: pointer;
		transition: all var(--transition-fast);
	}

	.menu-item:last-child {
		border-bottom: none;
	}

	.menu-item:hover {
		background: var(--bg-hover);
	}

	.menu-item.delete-item {
		color: var(--priority-must);
	}

	.menu-item.delete-item:hover {
		background: rgba(239, 68, 68, 0.1);
	}
</style>
