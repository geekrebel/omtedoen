<script lang="ts">
	import DayColumn from "./DayColumn.svelte";
	import PersistentQuickAdd from "./PersistentQuickAdd.svelte";
	import { isFocusMode, checkDateChange } from "$lib/stores/app.svelte.js";

	interface Props {
		onToggleFocus?: () => void;
	}

	let { onToggleFocus }: Props = $props();

	let focusMode = $derived(isFocusMode());
	let quickAddComponent: any = $state(null);

	$effect(() => {
		const interval = setInterval(checkDateChange, 10_000);
		const onVisible = () => {
			if (document.visibilityState === "visible") checkDateChange();
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", checkDateChange);
		checkDateChange();
		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", checkDateChange);
		};
	});

	function handleTaskHoverChange(isHovered: boolean) {
		if (quickAddComponent) {
			quickAddComponent.notifyTaskHovered(isHovered);
		}
	}
</script>

<div class="focus-view">
	<PersistentQuickAdd
		bind:this={quickAddComponent}
		{focusMode}
		onToggleFocus={onToggleFocus}
	/>
	<div class="focus-columns glass-panel">
		<div class="focus-col focus-col-maybe">
			<DayColumn status="maybe" onTaskHoverChange={handleTaskHoverChange} />
		</div>
		<div class="focus-col focus-col-today">
			<DayColumn status="today" onTaskHoverChange={handleTaskHoverChange} />
		</div>
		<div class="focus-col focus-col-done">
			<DayColumn status="done" onTaskHoverChange={handleTaskHoverChange} />
		</div>
	</div>
</div>

<style>
	.focus-view {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 0;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.focus-columns {
		display: flex;
		flex: 1;
		overflow: visible;
		background: var(--bg-surface);
		padding: 32px 24px 48px;
	}

	.focus-col {
		flex: 1;
		min-width: 0;
		transition:
			flex 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
			opacity 0.3s ease;
	}
</style>
