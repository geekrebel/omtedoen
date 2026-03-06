<script lang="ts">
	import { addTask } from "$lib/stores/app.svelte.js";
	import { todayISO } from "$lib/utils/dates.js";

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let value = $state("");
	let inputEl: HTMLInputElement | undefined = $state();

	function handleSubmit() {
		if (value.trim()) {
			addTask(value.trim(), todayISO());
			value = "";
			onclose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter") handleSubmit();
		if (e.key === "Escape") {
			value = "";
			onclose();
		}
	}

	$effect(() => {
		if (open) {
			value = "";
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
			<input
				bind:this={inputEl}
				bind:value
				onkeydown={handleKeydown}
				placeholder="What's on your mind?"
				type="text"
				autocomplete="off"
			/>
			<div class="capture-hint">
				Enter to add to today &middot; Esc to dismiss
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
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
		background: rgba(25, 28, 41, 0.95);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow:
			0 24px 48px -12px rgba(0, 0, 0, 0.5),
			0 0 0 1px rgba(94, 114, 255, 0.2);
		width: 100%;
		max-width: 480px;
		padding: 24px 32px;
		animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.capture-label {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent);
		margin-bottom: 16px;
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.capture-label::before {
		content: "⚡";
		font-size: 16px;
		filter: drop-shadow(0 0 8px var(--accent-glow));
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
		border-bottom-color: var(--accent);
		box-shadow: 0 1px 0 0 var(--accent);
	}

	input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}

	.capture-hint {
		margin-top: 16px;
		font-size: 13px;
		color: var(--text-muted);
		display: flex;
		justify-content: space-between;
	}
</style>
