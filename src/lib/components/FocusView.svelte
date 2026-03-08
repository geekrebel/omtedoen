<script lang="ts">
	import DayColumn from "./DayColumn.svelte";
	import { isFocusMode } from "$lib/stores/app.svelte.js";
	import { todayISO, addDays } from "$lib/utils/dates.js";

	let focusMode = $derived(isFocusMode());

	// Calculate the 3 days
	let todayStr = $derived(todayISO());
	let yesterdayStr = $derived(addDays(todayStr, -1));
	let tomorrowStr = $derived(addDays(todayStr, 1));

	let displayDays = $derived([yesterdayStr, todayStr, tomorrowStr]);
</script>

<div class="focus-view">
	<div class="focus-columns glass-panel">
		{#each displayDays as date (date)}
			<DayColumn {date} />
		{/each}
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
</style>
