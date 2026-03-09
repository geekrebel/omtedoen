<script lang="ts">
	import "../app.css";
	import { onMount } from "svelte";
	import type { Snippet } from "svelte";
	import { createStore } from "$lib/storage/index.js";
	import {
		initStore,
		getCurrentView,
		setCurrentView,
		isFocusMode,
		toggleFocusMode,
		saveSetting,
		getParkedTasks,
		getSomedayLists,
		undo,
	} from "$lib/stores/app.svelte.js";
	import FocusView from "$lib/components/FocusView.svelte";
	import MonthView from "$lib/components/MonthView.svelte";
	import SomedayView from "$lib/components/SomedayView.svelte";
	import SettingsView from "$lib/components/SettingsView.svelte";
	import ParkingLot from "$lib/components/ParkingLot.svelte";
	import CommandPalette from "$lib/components/CommandPalette.svelte";
	import QuickCapture from "$lib/components/QuickCapture.svelte";

	let { children }: { children: Snippet } = $props();

	let ready = $state(false);
	let paletteOpen = $state(false);
	let captureOpen = $state(false);
	let sidebarExpanded = $state(false);
	let updateAvailable = $state<{ version: string } | null>(null);
	let updateInstalling = $state(false);

	let view = $derived(getCurrentView());
	let focusMode = $derived(isFocusMode());
	let parkedTasks = $derived(getParkedTasks());
	let somedayLists = $derived(getSomedayLists());

	onMount(async () => {
		const { store, type } = await createStore();
		await initStore(store, type);
		ready = true;

		// Silent update check on startup
		if (typeof window !== "undefined" && "__TAURI__" in window) {
			try {
				const { check } = await import("@tauri-apps/plugin-updater");
				const update = await check();
				if (update?.available) {
					updateAvailable = { version: update.version };
				}
			} catch {
				// Silently ignore — not critical
			}
		}
	});

	async function installUpdate() {
		updateInstalling = true;
		try {
			const { check } = await import("@tauri-apps/plugin-updater");
			const { relaunch } = await import("@tauri-apps/plugin-process");
			const update = await check();
			if (update?.available) {
				await update.downloadAndInstall();
				await relaunch();
			}
		} catch {
			updateInstalling = false;
		}
	}

	function handleToggleFocusMode() {
		toggleFocusMode();
		saveSetting("focusMode", String(isFocusMode()));
		if (isFocusMode()) {
			sidebarExpanded = false;
		}
	}

	function toggleSidebar() {
		sidebarExpanded = !sidebarExpanded;
	}

	function handleGlobalKeydown(e: KeyboardEvent) {
		// Cmd+K / Ctrl+K — command palette
		if ((e.metaKey || e.ctrlKey) && e.key === "k") {
			e.preventDefault();
			paletteOpen = !paletteOpen;
		}
		// Cmd+Shift+Space or 'q' — quick capture
		if (
			((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === " ") ||
			(e.key === "q" &&
				!e.metaKey &&
				!e.ctrlKey &&
				e.target instanceof HTMLElement &&
				e.target.tagName !== "INPUT" &&
				e.target.tagName !== "TEXTAREA" &&
				!e.target.isContentEditable)
		) {
			e.preventDefault();
			captureOpen = !captureOpen;
		}
		// Cmd+Z / Ctrl+Z — undo
		if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
			const target = e.target as HTMLElement;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
			e.preventDefault();
			undo();
		}
		// Cmd+1-4 — view switching
		if ((e.metaKey || e.ctrlKey) && !e.shiftKey) {
			if (e.key === "1") {
				e.preventDefault();
				setCurrentView("focus");
			}
			if (e.key === "2") {
				e.preventDefault();
				setCurrentView("month");
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
	<div class="app" class:focus-mode={focusMode}>
		<nav class="sidebar" class:expanded={sidebarExpanded}>
			<button
				class="sidebar-toggle"
				onclick={toggleSidebar}
				aria-label="Toggle sidebar"
			>
				<span class="toggle-icon">{sidebarExpanded ? "✕" : "☰"}</span>
			</button>

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
					<span class="nav-label">Today</span>
					<kbd class="nav-kbd">1</kbd>
				</button>

				{#if !focusMode}
					<button
						class="nav-item"
						class:active={view === "month"}
						onclick={() => setCurrentView("month")}
					>
						<span class="nav-icon">&#x2630;</span>
						<span class="nav-label">Month</span>
						<kbd class="nav-kbd">2</kbd>
					</button>
				{/if}

				<button
					class="nav-item"
					class:active={view === "someday"}
					onclick={() => setCurrentView("someday")}
				>
					<span class="nav-icon">&#x2606;</span>
					<span class="nav-label">Someday</span>
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
							<span class="nav-label">{list.name}</span>
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
					<span class="nav-label">Quick Add</span>
				</button>
				<button
					class="nav-item"
					class:active={view === "settings"}
					onclick={() => setCurrentView("settings")}
				>
					<span class="nav-icon">&#x2699;</span>
					<span class="nav-label">Settings</span>
				</button>
			</div>
		</nav>

		<main class="main-content">
			{#if updateAvailable}
				<div class="update-banner">
					<span>Update v{updateAvailable.version} available</span>
					{#if updateInstalling}
						<span class="update-installing">Installing...</span>
					{:else}
						<button
							class="update-install-btn"
							onclick={installUpdate}>Install & Restart</button
						>
						<button
							class="update-dismiss-btn"
							onclick={() => (updateAvailable = null)}
							aria-label="Dismiss">&times;</button
						>
					{/if}
				</div>
			{/if}

			<div class="main-toolbar">
				<button
					class="focus-mode-btn"
					class:active={focusMode}
					onclick={handleToggleFocusMode}
					aria-label="Toggle Focus Mode"
					title="Click the bolt on each task to mark it for focus, then toggle this to show only those tasks"
				>
					<svg class="focus-icon" viewBox="0 0 16 16" fill="none">
						<path
							d="M8.5 1L3 9.5h4.5L6.5 15l6-8.5H8L8.5 1z"
							fill="currentColor"
						/>
					</svg>
					<span>Focus</span>
				</button>
			</div>

			{#if view === "focus"}
				<FocusView />
				{#if parkedTasks.length > 0}
					<div class="focus-parking">
						<ParkingLot />
					</div>
				{/if}
			{:else if view === "month"}
				<MonthView />
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

	/* ── Sidebar ── */
	.sidebar {
		width: 56px;
		background: var(--bg-sidebar);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		padding: 12px 8px;
		user-select: none;
		z-index: 10;
		box-shadow: 4px 0 24px rgba(0, 0, 0, 0.2);
		transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		overflow: hidden;
	}

	.sidebar.expanded {
		width: 240px;
		padding: 24px 16px;
	}

	.sidebar-toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		font-size: 18px;
		color: var(--text-secondary);
		margin-bottom: 12px;
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.sidebar-toggle:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--heading-green);
	}

	.sidebar-brand {
		padding: 0 4px 20px;
		overflow: hidden;
		opacity: 0;
		height: 0;
		transition:
			opacity 0.2s ease,
			height 0.3s ease;
	}

	.sidebar.expanded .sidebar-brand {
		opacity: 1;
		height: auto;
		padding: 0 8px 32px;
	}

	.brand-name {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.03em;
		background: linear-gradient(
			135deg,
			var(--heading-green) 0%,
			var(--heading-green-light) 100%
		);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		white-space: nowrap;
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
		padding: 10px 12px;
		border-radius: 12px;
		font-size: 14px;
		font-weight: 500;
		color: var(--text-secondary);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		width: 100%;
		text-align: left;
		position: relative;
		white-space: nowrap;
		overflow: hidden;
	}

	.nav-item:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--heading-green);
		transform: translateX(2px);
	}

	.nav-item.active {
		background: rgba(45, 106, 79, 0.1);
		color: var(--heading-green);
		font-weight: 600;
		box-shadow: inset 0 0 0 1px rgba(45, 106, 79, 0.2);
	}

	.nav-item.active::before {
		content: "";
		position: absolute;
		left: -4px;
		top: 50%;
		transform: translateY(-50%);
		width: 4px;
		height: 16px;
		background: var(--heading-green);
		border-radius: 0 4px 4px 0;
	}

	.nav-icon {
		width: 18px;
		text-align: center;
		font-size: 16px;
		opacity: 0.8;
		flex-shrink: 0;
	}

	.nav-item.active .nav-icon {
		opacity: 1;
	}

	.nav-label {
		opacity: 0;
		transition: opacity 0.15s ease;
		overflow: hidden;
	}

	.sidebar.expanded .nav-label {
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
		opacity: 0;
	}

	.sidebar.expanded .nav-kbd {
		opacity: 1;
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
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.sidebar.expanded .section-label {
		opacity: 1;
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

	/* ── Main content ── */
	.main-content {
		flex: 1;
		overflow-y: auto;
		position: relative;
		z-index: 1;
	}

	.main-toolbar {
		display: flex;
		justify-content: flex-end;
		padding: 12px 24px 0;
		position: sticky;
		top: 0;
		z-index: 5;
	}

	.focus-mode-btn {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 18px;
		border-radius: 20px;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-secondary);
		background: var(--bg-surface);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border: 1px solid var(--border);
		box-shadow: var(--shadow-sm);
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
		cursor: pointer;
	}

	.focus-mode-btn:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
		border-color: #eab308;
		color: #b45309;
	}

	.focus-mode-btn.active {
		background: #eab308;
		color: #fff;
		border-color: #d4a017;
		box-shadow: 0 4px 16px rgba(234, 179, 8, 0.3);
	}

	.focus-mode-btn.active:hover {
		background: #d4a017;
		border-color: #ca8a04;
	}

	.focus-icon {
		width: 16px;
		height: 16px;
		color: #eab308;
		flex-shrink: 0;
	}

	.focus-mode-btn.active .focus-icon {
		color: #fff;
	}

	.focus-parking {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 24px 48px;
	}

	/* ── Update banner ── */
	.update-banner {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 24px;
		background: rgba(45, 106, 79, 0.1);
		border-bottom: 1px solid rgba(45, 106, 79, 0.2);
		font-size: 14px;
		font-weight: 600;
		color: var(--heading-green);
	}

	.update-install-btn {
		padding: 4px 14px;
		border-radius: 6px;
		font-size: 13px;
		font-weight: 600;
		background: var(--heading-green);
		color: #fff;
		transition: all var(--transition-fast);
	}

	.update-install-btn:hover {
		background: var(--heading-green-light);
		box-shadow: 0 2px 8px rgba(45, 106, 79, 0.3);
	}

	.update-dismiss-btn {
		font-size: 16px;
		color: var(--text-muted);
		padding: 2px 6px;
		border-radius: 4px;
		transition: all var(--transition-fast);
	}

	.update-dismiss-btn:hover {
		background: rgba(0, 0, 0, 0.05);
		color: var(--text);
	}

	/* Focus mode: hide sidebar entirely */
	.app.focus-mode .sidebar,
	.app.focus-mode .sidebar.expanded {
		width: 0;
		padding: 0;
		border: none;
		overflow: hidden;
	}

	.app.focus-mode .main-content {
		max-width: 580px;
	}

	.update-installing {
		font-style: italic;
		color: var(--text-secondary);
	}
</style>
