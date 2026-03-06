<script lang="ts">
	interface Props {
		placeholder?: string;
		onsubmit: (title: string) => void;
	}

	let { placeholder = "Add a task...", onsubmit }: Props = $props();
	let value = $state("");
	let inputEl: HTMLInputElement | undefined = $state();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && value.trim()) {
			onsubmit(value.trim());
			value = "";
		}
		if (e.key === "Escape") {
			value = "";
			inputEl?.blur();
		}
	}

	export function focus() {
		inputEl?.focus();
	}
</script>

<div class="task-input-container">
	<div class="input-icon">+</div>
	<input
		bind:this={inputEl}
		bind:value
		{placeholder}
		onkeydown={handleKeydown}
		type="text"
		autocomplete="off"
		spellcheck="false"
	/>
</div>

<style>
	.task-input-container {
		display: flex;
		align-items: center;
		background: rgba(0, 0, 0, 0.03);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 4px 16px;
		transition: all var(--transition-normal);
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
	}

	.task-input-container:focus-within {
		background: rgba(0, 0, 0, 0.02);
		border-color: var(--border-light);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
		transform: translateY(-1px);
	}

	.input-icon {
		font-size: 20px;
		font-weight: 300;
		color: var(--accent);
		margin-right: 12px;
		opacity: 0.7;
	}

	input {
		flex: 1;
		width: 100%;
		padding: 12px 0;
		font-size: 16px;
		font-weight: 500;
		color: var(--text);
		background: transparent;
	}

	input:focus {
		outline: none;
	}

	input::placeholder {
		color: var(--text-placeholder);
		font-weight: 400;
	}
</style>
