<script lang="ts">
	import DayColumn from "./DayColumn.svelte";
	import { getTodayTasks, isLowEnergyMode } from "$lib/stores/app.svelte.js";
	import { todayISO, dayLabel, addDays } from "$lib/utils/dates.js";

	let lowEnergy = $derived(isLowEnergyMode());

	// Calculate the 3 days
	let todayStr = $derived(todayISO());
	let yesterdayStr = $derived(addDays(todayStr, -1));
	let tomorrowStr = $derived(addDays(todayStr, 1));

	let displayDays = $derived([yesterdayStr, todayStr, tomorrowStr]);

	// Continue to gather stats ONLY for today for the summary chips
	let todayTasks = $derived(getTodayTasks());

	let mustCount = $derived(
		todayTasks.filter((t: any) => t.priority === "must" && !t.isCompleted)
			.length,
	);
	let shouldCount = $derived(
		todayTasks.filter((t: any) => t.priority === "should" && !t.isCompleted)
			.length,
	);
	let wantCount = $derived(
		todayTasks.filter((t: any) => t.priority === "want" && !t.isCompleted)
			.length,
	);
	let completedCount = $derived(
		todayTasks.filter((t: any) => t.isCompleted).length,
	);

	let dateLabel = $derived(dayLabel(todayStr));
</script>

<div class="focus-view">
	<div class="header-container">
		<div class="focus-header">
			<h1 class="focus-title">Focus</h1>
			<div class="focus-date-pill">{dateLabel}</div>
		</div>

		{#if todayTasks.length > 0}
			<div class="focus-summary glass-panel">
				{#if mustCount > 0}
					<span class="summary-chip must">{mustCount} must</span>
				{/if}
				{#if shouldCount > 0 && !lowEnergy}
					<span class="summary-chip should">{shouldCount} should</span
					>
				{/if}
				{#if wantCount > 0 && !lowEnergy}
					<span class="summary-chip want">{wantCount} want</span>
				{/if}
				{#if completedCount > 0}
					<span class="summary-chip done">{completedCount} done</span>
				{/if}
			</div>
		{/if}
	</div>

	{#if lowEnergy && shouldCount + wantCount > 0}
		<p class="low-energy-note">
			{shouldCount + wantCount} more tasks hidden today in low-energy mode
		</p>
	{/if}

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
		height: 100%;
		padding: 32px 24px;
		animation: popIn 0.4s var(--transition-bounce);
		max-width: 1200px;
		margin: 0 auto;
	}

	.header-container {
		display: flex;
		flex-direction: column;
		margin-bottom: 24px;
	}

	@media (min-width: 768px) {
		.header-container {
			flex-direction: row;
			align-items: center;
			justify-content: space-between;
			margin-bottom: 24px;
		}
	}

	.focus-header {
		display: flex;
		align-items: center;
		gap: 16px;
		margin-bottom: 16px; /* Space if wrapping */
	}

	@media (min-width: 768px) {
		.focus-header {
			margin-bottom: 0;
		}
	}

	.focus-title {
		font-size: 36px;
		font-weight: 800;
		letter-spacing: -0.03em;
		background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: 0 2px 10px rgba(165, 180, 252, 0.2);
	}

	.focus-date-pill {
		font-size: 13px;
		font-family: var(--font-mono);
		color: var(--accent);
		background: var(--accent-soft);
		padding: 6px 14px;
		border-radius: 20px;
		font-weight: 600;
		border: 1px solid rgba(94, 114, 255, 0.2);
	}

	.focus-summary {
		display: flex;
		gap: 10px;
		flex-wrap: wrap;
		padding: 14px 18px;
		border-radius: 16px;
	}

	.summary-chip {
		font-size: 13px;
		padding: 4px 12px;
		border-radius: 20px;
		font-weight: 600;
		font-family: var(--font-mono);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.summary-chip.must {
		background: rgba(255, 71, 110, 0.15);
		color: var(--priority-must);
		border: 1px solid rgba(255, 71, 110, 0.3);
	}

	.summary-chip.should {
		background: rgba(255, 170, 28, 0.15);
		color: var(--priority-should);
		border: 1px solid rgba(255, 170, 28, 0.3);
	}

	.summary-chip.want {
		background: rgba(34, 211, 238, 0.15);
		color: var(--priority-want);
		border: 1px solid rgba(34, 211, 238, 0.3);
	}

	.summary-chip.done {
		background: var(--success-soft);
		color: var(--success);
		border: 1px solid rgba(52, 211, 153, 0.3);
	}

	.low-energy-note {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 20px;
		font-style: italic;
		text-align: center;
	}

	.focus-columns {
		display: flex;
		flex: 1;
		border-radius: 24px;
		overflow-x: auto;
		background: var(--bg-surface);
	}
</style>
