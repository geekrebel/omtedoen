<script lang="ts">
	import DayColumn from "./DayColumn.svelte";
	import PersistentQuickAdd from "./PersistentQuickAdd.svelte";
	import { isFocusMode, checkDateChange } from "$lib/stores/app.svelte.js";
	import { addDays, todayISO } from "$lib/utils/dates.js";

	interface Props {
		onToggleFocus?: () => void;
	}

	let { onToggleFocus }: Props = $props();

	let focusMode = $derived(isFocusMode());

	// Own the "today" date at the component level so it's guaranteed to
	// update — module-level $state + setInterval can silently go stale
	// when the OS suspends/resumes the Tauri webview process.
	let todayStr = $state(todayISO());

	let quickAddComponent: any = $state(null);

	$effect(() => {
		const refresh = () => {
			const now = todayISO();
			if (now !== todayStr) {
				todayStr = now;
				// Also sync the store's reactive today + run rollover
				checkDateChange();
			}
		};

		const interval = setInterval(refresh, 10_000);

		const onVisible = () => {
			if (document.visibilityState === "visible") refresh();
		};
		document.addEventListener("visibilitychange", onVisible);
		window.addEventListener("focus", refresh);

		// Check immediately in case we mounted after a date change
		refresh();

		return () => {
			clearInterval(interval);
			document.removeEventListener("visibilitychange", onVisible);
			window.removeEventListener("focus", refresh);
		};
	});

	let yesterdayStr = $derived(addDays(todayStr, -1));
	let tomorrowStr = $derived(addDays(todayStr, 1));

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
		<div class="focus-col focus-col-yesterday">
			<DayColumn date={yesterdayStr} onTaskHoverChange={handleTaskHoverChange} />
		</div>
		<div class="focus-col focus-col-today">
			<DayColumn date={todayStr} onTaskHoverChange={handleTaskHoverChange} />
		</div>
		<div class="focus-col focus-col-tomorrow">
			<DayColumn date={tomorrowStr} onTaskHoverChange={handleTaskHoverChange} />
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
