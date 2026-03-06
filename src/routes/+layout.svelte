<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import { createStore } from "$lib/storage/index.js";
	import {
		initStore,
		getCurrentView,
		setCurrentView,
		isLowEnergyMode,
		getParkedTasks,
		getSomedayLists,
	} from "$lib/stores/app.svelte.js";
	import FocusView from "$lib/components/FocusView.svelte";
	import WeekView from "$lib/components/WeekView.svelte";
	import SomedayView from "$lib/components/SomedayView.svelte";
	import SettingsView from "$lib/components/SettingsView.svelte";
	import ParkingLot from "$lib/components/ParkingLot.svelte";
	import CommandPalette from "$lib/components/CommandPalette.svelte";
	import QuickCapture from "$lib/components/QuickCapture.svelte";

	let { children }: { children: Snippet } = $props();

	let ready = $state(false);
	let paletteOpen = $state(false);
	let captureOpen = $state(false);

	let view = $derived(getCurrentView());
	let lowEnergy = $derived(isLowEnergyMode());
	let parkedTasks = $derived(getParkedTasks());
	let somedayLists = $derived(getSomedayLists());

	onMount(async () => {
		const store = await createStore();
		await initStore(store);
		ready = true;
	});

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Cmd+K / Ctrl+K — command palette
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		}
		// Cmd+Shift+Space — quick capture
		if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === " ") {
			e.preventDefault();
			captureOpen = !captureOpen;
		}
		// Cmd+1-4 — view switching
		if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
			if (e.key === "1") {
				e.preventDefault();
				setCurrentView("focus");
			}
			if (e.key === "2") {
				e.preventDefault();
				setCurrentView("week");
			}
			if (e.key === "3") {
				e.preventDefault();
				setCurrentView("someday");
			}
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

{#if !ready}
	<div class="loading">
		<span>Loading...</span>
	</div>
{:else}
	<div class="app" class:low-energy={lowEnergy}>
		<nav class="sidebar">
			<div class="sidebar-brand">
				<h2 class="brand-name">OmTeDoen</h2>
			</div>

			<div class="sidebar-nav">
				<button
					class="nav-item"
					class:active={view === "focus"}
					onclick={() => setCurrentView("focus")}
				>
					<span class="nav-icon">&#x25C9;</span>
					<span>Today</span>
					<kbd class="nav-kbd">1</kbd>
				</button>

				{#if !lowEnergy}
					<button
						class="nav-item"
						class:active={view === "week"}
						onclick={() => setCurrentView("week")}
					>
						<span class="nav-icon">&#x2630;</span>
						<span>Week</span>
						<kbd class="nav-kbd">2</kbd>
					</button>
				{/if}

				<button
					class="nav-item"
					class:active={view === "someday"}
					onclick={() => setCurrentView("someday")}
				>
					<span class="nav-icon">&#x2606;</span>
					<span>Someday</span>
					<kbd class="nav-kbd">3</kbd>
				</button>
			</div>

			{#if somedayLists.length > 0}
				<div class="sidebar-section sidebar-someday">
					<span class="section-label">Lists</span>
					{#each somedayLists as list}
						<button
							class="nav-item sub-item"
							onclick={() => setCurrentView("someday")}
						>
							{#if list.color}
								<span
									class="list-dot"
									style="background:{list.color}"
								></span>
							{/if}
							{list.name}
						</button>
					{/each}
				</div>
			{/if}

			{#if parkedTasks.length > 0}
				<div class="sidebar-section">
					<span class="section-label"
						>Parked ({parkedTasks.length})</span
					>
				</div>
			{/if}

			<div class="sidebar-footer">
				<button class="nav-item" onclick={() => (captureOpen = true)}>
					<span class="nav-icon">&#x26A1;</span>
					<span>Quick Add</span>
				</button>
				<button
					class="nav-item"
					class:active={view === "settings"}
					onclick={() => setCurrentView("settings")}
				>
					<span class="nav-icon">&#x2699;</span>
					<span>Settings</span>
				</button>
			</div>
		</nav>

		<main class="main-content">
			{#if view === "focus"}
				<FocusView />
				{#if parkedTasks.length > 0}
					<div class="focus-parking">
						<ParkingLot />
					</div>
				{/if}
			{:else if view === "week"}
				<WeekView />
			{:else if view === "someday"}
				<SomedayView />
			{:else if view === "settings"}
				<SettingsView />
			{/if}
		</main>
	</div>

	<CommandPalette open={paletteOpen} onclose={() => (paletteOpen = false)} />
	<QuickCapture open={captureOpen} onclose={() => (captureOpen = false)} />
{/if}

{@render children()}

<style>
	.loading {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100vh;
		color: var(--text-muted);
		font-size: 16px;
	}

	.app {
		display: flex;
		height: 100vh;
		overflow: hidden;
		background: transparent;
	}

	.sidebar {
		width: var(--sidebar-width);
		background: var(--bg-sidebar);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		padding: 24px 16px;
		user-select: none;
		z-index: 10;
		box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
	}

	.sidebar-brand {
		padding: 0 8px 32px;
	}

	.brand-name {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
		background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.sidebar-nav {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 14px;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100%;
		text-align: left;
		position: relative;
	}

	.nav-item:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--accent);
		transform: translateX(2px);
	}

	.nav-item.active {
		background: var(--accent-soft);
		color: var(--accent);
		font-weight: 600;
		box-shadow: inset 0 0 0 1px rgba(94, 114, 255, 0.2);
	}

	.nav-item.active::before {
		content: "";
		position: absolute;
		left: -4px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 16px;
		background: var(--accent);
		border-radius: 0 4px 4px 0;
	}

	.nav-icon {
		width: 18px;
		text-align: center;
		font-size: 16px;
		opacity: 0.8;
	}

	.nav-item.active .nav-icon {
		opacity: 1;
	}

	.nav-kbd {
		margin-left: auto;
		font-size: 11px;
		font-family: var(--font-mono);
		font-weight: 600;
		color: var(--text-muted);
		background: rgba(0, 0, 0, 0.2);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.nav-item:hover .nav-kbd {
		border-color: rgba(0, 0, 0, 0.1);
		color: var(--text-secondary);
	}

	.sidebar-section {
		margin-top: 32px;
		padding-top: 0;
	}

	.section-label {
		display: block;
		font-size: 12px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--text-muted);
		padding: 0 14px 12px;
	}

	.sub-item {
		font-size: 13px;
		padding: 8px 14px 8px 24px;
	}

	.list-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 8px currentColor;
	}

	.sidebar-footer {
		margin-top: auto;
		padding-top: 24px;
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.main-content {
		flex: 1;
		overflow-y: auto;
		position: relative;
		z-index: 1;
	}

	.focus-parking {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px 48px;
	}
</style>
