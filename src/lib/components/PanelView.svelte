<script lang="ts">
	import { onMount } from "svelte";
	import DayColumn from "./DayColumn.svelte";
	import { addTask } from "$lib/stores/app.svelte.js";
	import { todayISO } from "$lib/utils/dates.js";

	const COLLAPSED_W = 28;
	const COLLAPSED_H = 56; // ~10% of the expanded height
	const EXPANDED_W = 400;
	const PANEL_H = 560;

	const isTauri =
		typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

	let expanded = $state(false);
	let inputFocused = $state(false);
	let dragging = $state(false);
	let value = $state("");
	let collapseTimer: ReturnType<typeof setTimeout> | null = null;

	// Top of the expanded panel; recomputed from the screen size in onMount.
	// The collapsed tab keeps the expanded panel's bottom edge, so hovering
	// the tab grows the window upward into the same footprint as before.
	let baseY = 200;
	const collapsedY = () => baseY + PANEL_H - COLLAPSED_H;

	async function setWindowBounds(w: number, h: number, y: number) {
		if (!isTauri) return;
		try {
			const { getCurrentWindow } = await import("@tauri-apps/api/window");
			const { LogicalSize, LogicalPosition } = await import(
				"@tauri-apps/api/dpi"
			);
			const win = getCurrentWindow();
			await Promise.all([
				win.setPosition(new LogicalPosition(0, y)),
				win.setSize(new LogicalSize(w, h)),
			]);
		} catch {}
	}

	function expand() {
		if (collapseTimer) {
			clearTimeout(collapseTimer);
			collapseTimer = null;
		}
		// A pointerup outside the window never fires inside it, so clear the
		// drag flag whenever the mouse comes back
		dragging = false;
		if (!expanded) {
			expanded = true;
			setWindowBounds(EXPANDED_W, PANEL_H, baseY);
		}
	}

	function scheduleCollapse() {
		if (!isTauri) return;
		if (collapseTimer) clearTimeout(collapseTimer);
		collapseTimer = setTimeout(() => {
			if (inputFocused || dragging) {
				scheduleCollapse();
				return;
			}
			expanded = false;
			setWindowBounds(COLLAPSED_W, COLLAPSED_H, collapsedY());
		}, 300);
	}

	async function focusPanelWindow() {
		// Borderless windows never become key from a plain click on macOS, so
		// keystrokes would land in the main window — force key status instead
		if (!isTauri) return;
		try {
			const { getCurrentWindow } = await import("@tauri-apps/api/window");
			await getCurrentWindow().setFocus();
		} catch {}
	}

	async function handleQuickAddKeydown(e: KeyboardEvent) {
		if (e.key === "Enter" && value.trim()) {
			e.preventDefault();
			await addTask(value.trim(), todayISO());
			value = "";
		}
		if (e.key === "Escape") {
			value = "";
			(e.target as HTMLInputElement).blur();
		}
	}

	onMount(() => {
		if (!isTauri) {
			// Plain browser (web dev): show the panel expanded, no window APIs
			expanded = true;
			return;
		}
		let unlistenFns: Array<() => void> = [];
		(async () => {
			baseY = Math.max(
				0,
				Math.round((window.screen.availHeight - PANEL_H) / 2),
			);
			await setWindowBounds(COLLAPSED_W, COLLAPSED_H, collapsedY());
			try {
				// Hover detection comes from a native cursor watcher in Rust:
				// macOS never delivers mouseMoved to this unfocused window, so
				// the DOM mouseenter/mouseleave below only help while focused
				const { listen } = await import("@tauri-apps/api/event");
				unlistenFns.push(await listen("panel-hover-enter", expand));
				unlistenFns.push(
					await listen("panel-hover-leave", scheduleCollapse),
				);
			} catch {}
		})();
		return () => unlistenFns.forEach((fn) => fn());
	});
</script>

<svelte:document
	onmouseenter={expand}
	onmouseleave={scheduleCollapse}
	onpointerdown={() => {
		dragging = true;
		focusPanelWindow();
	}}
	onpointerup={() => (dragging = false)}
/>

<div class="panel-root" class:expanded>
	{#if expanded}
		<div class="panel-body">
			<input
				class="panel-quick-add"
				placeholder="Add for today…"
				type="text"
				autocomplete="off"
				bind:value
				onfocus={() => (inputFocused = true)}
				onblur={() => (inputFocused = false)}
				onkeydown={handleQuickAddKeydown}
			/>
			<div class="panel-list">
				<DayColumn status="today" compact />
			</div>
		</div>
	{/if}
	<div class="panel-tab" aria-hidden="true">
		<span class="chevron">{expanded ? "‹" : "›"}</span>
	</div>
</div>

<style>
	.panel-root {
		display: flex;
		align-items: stretch;
		height: 100vh;
		width: 100%;
		overflow: hidden;
		user-select: none;
	}

	.panel-tab {
		width: 28px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg-sidebar);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border: 1px solid var(--border);
		border-left: none;
		border-radius: 0 12px 12px 0;
		/* CSS shadow instead of the (disabled) native window shadow */
		box-shadow: 2px 0 8px rgba(0, 0, 0, 0.12);
	}

	.expanded .panel-tab {
		width: 20px;
	}

	.chevron {
		font-size: 18px;
		font-weight: 700;
		color: var(--heading-green);
		opacity: 0.8;
	}

	.panel-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-left: none;
		border-right: none;
		overflow: hidden;
	}

	.panel-quick-add {
		margin: 12px 12px 8px;
		padding: 8px 12px;
		font-size: 14px;
		border: 1px solid var(--border-light);
		border-radius: 10px;
		background: var(--bg);
		color: var(--text);
	}

	.panel-quick-add:focus {
		border-color: var(--heading-green);
		box-shadow: 0 0 0 2px rgba(45, 106, 79, 0.1);
	}

	.panel-quick-add::placeholder {
		color: var(--text-placeholder);
	}

	.panel-list {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 4px 8px;
	}

	/* The DayColumn inside the panel needs no right border */
	.panel-list :global(.day-column) {
		border-right: none;
		max-width: none;
	}
</style>
