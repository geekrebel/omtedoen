<script lang="ts">
	import {
		setCurrentView,
		toggleLowEnergyMode,
		doFreshStart,
		isLowEnergyMode,
	} from "$lib/stores/app.svelte.js";

	interface Props {
		open: boolean;
		onclose: () => void;
	}

	let { open, onclose }: Props = $props();

	let query = $state("");
	let selectedIndex = $state(0);
	let inputEl: HTMLInputElement | undefined = $state();

	interface Command {
		label: string;
		description: string;
		action: () => void;
	}

	const commands: Command[] = [
		{
			label: "Focus View",
			description: "Show only today",
			action: () => {
				setCurrentView("focus");
				onclose();
			},
		},
		{
			label: "Week View",
			description: "See the full week",
			action: () => {
				setCurrentView("week");
				onclose();
			},
		},
		{
			label: "Someday Lists",
			description: "Browse lists",
			action: () => {
				setCurrentView("someday");
				onclose();
			},
		},
		{
			label: "Toggle Low Energy",
			description: "Show only must-do tasks",
			action: () => {
				toggleLowEnergyMode();
				onclose();
			},
		},
		{
			label: "Fresh Start",
			description: "Archive everything and begin anew",
			action: async () => {
				const count = await doFreshStart();
				onclose();
			},
		},
		{
			label: "Settings",
			description: "App settings",
			action: () => {
				setCurrentView("settings");
				onclose();
			},
		},
	];

	let filtered = $derived(
		query.trim()
			? commands.filter(
					(c) =>
						c.label.toLowerCase().includes(query.toLowerCase()) ||
						c.description
							.toLowerCase()
							.includes(query.toLowerCase()),
				)
			: commands,
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			onclose();
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === "Enter" && filtered.length > 0) {
			filtered[selectedIndex].action();
		}
	}

	$effect(() => {
		if (open) {
			query = "";
			selectedIndex = 0;
			requestAnimationFrame(() => inputEl?.focus());
		}
	});
</script>

{#if open}
	<div
		class="overlay"
		onclick={onclose}
		onkeydown={handleKeydown}
		role="presentation"
	>
		<div
			class="palette"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-label="Command palette"
		>
			<input
				bind:this={inputEl}
				bind:value={query}
				placeholder="Type a command..."
				onkeydown={handleKeydown}
				type="text"
			/>
			<div class="results">
				{#each filtered as cmd, i}
					<button
						class="result-item"
						class:selected={i === selectedIndex}
						onclick={cmd.action}
						onmouseenter={() => (selectedIndex = i)}
					>
						<span class="result-label">{cmd.label}</span>
						<span class="result-desc">{cmd.description}</span>
					</button>
				{/each}
				{#if filtered.length === 0}
					<p class="no-results">No commands found</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		display: flex;
		align-items: flex-start;
		justify-content: center;
		padding-top: 15vh;
		z-index: 1000;
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

	.palette {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		box-shadow:
			0 24px 48px -12px rgba(0, 0, 0, 0.15),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		width: 100%;
		max-width: 520px;
		overflow: hidden;
		animation: slideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-20px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	input {
		width: 100%;
		padding: 20px 24px;
		font-size: 18px;
		font-weight: 500;
		color: var(--text);
		border-bottom: 1px solid var(--border);
		background: transparent;
	}

	input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}

	.results {
		max-height: 320px;
		overflow-y: auto;
		padding: 12px;
	}

	.result-item {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		width: 100%;
		padding: 12px 16px;
		border-radius: 10px;
		text-align: left;
		transition: all 0.1s ease;
		background: transparent;
	}

	.result-item.selected {
		background: rgba(94, 114, 255, 0.15);
		border-left: 3px solid var(--accent);
		padding-left: 13px; /* Compensate for border */
	}

	@media (min-width: 480px) {
		.result-item {
			flex-direction: row;
			align-items: center;
			gap: 16px;
		}
	}

	.result-label {
		font-weight: 600;
		font-size: 15px;
		color: var(--text);
	}

	.result-item.selected .result-label {
		color: var(--accent);
	}

	.result-desc {
		font-size: 13px;
		color: var(--text-muted);
	}

	.no-results {
		padding: 32px 16px;
		text-align: center;
		color: var(--text-secondary);
		font-size: 15px;
	}
</style>
