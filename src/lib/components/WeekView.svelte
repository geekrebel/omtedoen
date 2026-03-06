<script lang="ts">
	import DayColumn from './DayColumn.svelte';
	import { getWeekOffset, setWeekOffset } from '$lib/stores/app.svelte.js';
	import { todayISO, weekDates, addDays } from '$lib/utils/dates.js';

	let offset = $derived(getWeekOffset());

	let dates = $derived(() => {
		const today = todayISO();
		const refDate = addDays(today, offset * 7);
		return weekDates(refDate);
	});

	let weekDays = $derived(dates());

	function prevWeek() {
		setWeekOffset(offset - 1);
	}

	function nextWeek() {
		setWeekOffset(offset + 1);
	}

	function goToday() {
		setWeekOffset(0);
	}
</script>

<div class="week-view">
	<div class="week-nav">
		<button onclick={prevWeek} class="nav-btn" aria-label="Previous week">&larr;</button>
		<button onclick={goToday} class="nav-btn today-btn" class:active={offset === 0}>
			This Week
		</button>
		<button onclick={nextWeek} class="nav-btn" aria-label="Next week">&rarr;</button>
	</div>

	<div class="week-columns">
		{#each weekDays as date (date)}
			<DayColumn {date} />
		{/each}
	</div>
</div>

<style>
	.week-view {
		display: flex;
		flex-direction: column;
		height: 100%;
		animation: popIn 0.4s var(--transition-bounce);
	}

	.week-nav {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border-light);
		background: rgba(15, 17, 26, 0.4);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
	}

	.nav-btn {
		padding: 6px 16px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--text-secondary);
		transition: all var(--transition-fast);
		background: transparent;
	}

	.nav-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
		transform: translateY(-1px);
	}

	.today-btn.active {
		background: var(--accent-soft);
		color: var(--accent);
		box-shadow: inset 0 0 0 1px rgba(94, 114, 255, 0.2);
	}

	.week-columns {
		display: flex;
		flex: 1;
		overflow-x: auto;
		padding: 20px;
		gap: 16px;
	}
</style>
