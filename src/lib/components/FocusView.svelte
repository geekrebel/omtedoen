<script lang="ts">
	import DayColumn from "./DayColumn.svelte";
	import { isFocusMode, getToday } from "$lib/stores/app.svelte.js";
	import { addDays } from "$lib/utils/dates.js";

	interface Props {
		onToggleFocus?: () => void;
	}

	let { onToggleFocus }: Props = $props();

	let focusMode = $derived(isFocusMode());

	// Calculate the 3 days
	let todayStr = $derived(getToday());
	let yesterdayStr = $derived(addDays(todayStr, -1));
	let tomorrowStr = $derived(addDays(todayStr, 1));

	let displayDays = $derived([yesterdayStr, todayStr, tomorrowStr]);
</script>

<div class="focus-view">
	<div class="focus-columns glass-panel">
		<div class="focus-col focus-col-yesterday">
			<DayColumn date={yesterdayStr} />
		</div>
		<div class="focus-col focus-col-today">
			<DayColumn date={todayStr} {onToggleFocus} />
		</div>
		<div class="focus-col focus-col-tomorrow">
			<DayColumn date={tomorrowStr} />
		</div>
	</div>
</div>

<style>
	.focus-view {
		display: flex;
		flex-direction: column;
		min-height: 0;
		padding: 32px 24px 48px;
		max-width: 1200px;
		margin: 0 auto;
	}

	.focus-columns {
		display: flex;
		flex: 1;
		border-radius: 24px;
		overflow: visible;
		background: var(--bg-surface);
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
