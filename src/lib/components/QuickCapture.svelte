<script lang="ts">
	import { addTask } from "$lib/stores/app.svelte.js";
	import { todayISO, dayLabel } from "$lib/utils/dates.js";
	import { extractRecurrence, nextOccurrence } from "$lib/core/recurrence.js";
	import { extractDateTarget } from "$lib/core/date-parser.js";

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let value = $state("");
	let inputEl: HTMLInputElement | undefined = $state();
	let feedback = $state<string | null>(null);

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
			const dateStr = task.dateTarget ? dayLabel(task.dateTarget) : "today";
			const recur = task.recurrenceRule ? ` (${task.recurrenceRule})` : "";
			feedback = `Added "${task.title}" to ${dateStr}${recur}`;
			value = "";
			setTimeout(() => {
				feedback = null;
				onclose();
			}, 1500);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") handleSubmit();
		if (e.key === "Escape") {
			value = "";
			feedback = null;
			onclose();
		}
	}

	$effect(() => {
		if (open) {
			value = "";
			feedback = null;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});
</script>

{#if open}
	<div class="overlay" onclick={onclose} role="presentation">
		<div
			class="capture-box"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="Quick capture"
		>
			<div class="capture-label">Quick Capture</div>

			{#if feedback}
				<div class="capture-feedback">{feedback}</div>
			{:else}
				<input
					bind:this={inputEl}
					bind:value
					onkeydown={handleKeydown}
					placeholder="e.g. Buy milk tomorrow, meeting next friday"
					type="text"
					autocomplete="off"
				/>
				{#if previewInfo}
					<div class="capture-preview">
						"{previewInfo.title}" &rarr; {previewInfo.targetDate}{#if previewInfo.ruleText}, repeats {previewInfo.ruleText}{/if}
					</div>
				{:else}
					<div class="capture-hint">
						Enter to add &middot; "tomorrow", "next friday", "every monday", etc. &middot; Esc to dismiss
					</div>
				{/if}
			{/if}
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.3);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 2000;
		animation: fadeIn 0.15s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.capture-box {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow:
			0 24px 48px -12px rgba(0, 0, 0, 0.15),
			0 0 0 1px rgba(45, 106, 79, 0.2);
		width: 100%;
		max-width: 480px;
		padding: 24px 32px;
		animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.capture-label {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--heading-green);
		margin-bottom: 16px;
	}

	input {
		width: 100%;
		font-size: 20px;
		font-weight: 500;
		color: var(--text);
		padding: 12px 0;
		border-bottom: 2px solid var(--border-light);
		background: transparent;
		transition: border-color var(--transition-normal);
	}

	input:focus {
		border-bottom-color: var(--heading-green);
		box-shadow: 0 1px 0 0 var(--heading-green);
	}

	input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}

	.capture-hint {
		margin-top: 12px;
		font-size: 13px;
		color: var(--text-muted);
	}

	.capture-preview {
		margin-top: 12px;
		font-size: 13px;
		font-weight: 600;
		color: var(--heading-green);
		background: rgba(45, 106, 79, 0.08);
		padding: 8px 12px;
		border-radius: 8px;
		border: 1px solid rgba(45, 106, 79, 0.15);
	}

	.capture-feedback {
		font-size: 16px;
		font-weight: 600;
		color: var(--success);
		background: var(--success-soft);
		padding: 16px;
		border-radius: 12px;
		text-align: center;
	}
</style>
