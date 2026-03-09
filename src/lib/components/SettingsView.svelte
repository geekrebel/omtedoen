<script lang="ts">
	import {
		isFocusMode,
		toggleFocusMode,
		doFreshStart,
		saveSetting,
		exportData,
		getStoreType,
	} from "$lib/stores/app.svelte.js";

	let focusModeActive = $derived(isFocusMode());
	let storageType = $derived(getStoreType());
	let freshStartConfirm = $state(false);
	let freshStartResult = $state<number | null>(null);
	let exportMsg = $state<string | null>(null);
	let updateStatus = $state<
		| "idle"
		| "checking"
		| "downloading"
		| "available"
		| "up-to-date"
		| "error"
	>("idle");
	let updateVersion = $state<string | null>(null);
	let updateError = $state<string | null>(null);

	async function handleFreshStart() {
		if (!freshStartConfirm) {
			freshStartConfirm = true;
			return;
		}
		const count = await doFreshStart();
		freshStartResult = count;
		freshStartConfirm = false;
		setTimeout(() => (freshStartResult = null), 3000);
	}

	function cancelFreshStart() {
		freshStartConfirm = false;
	}

	async function handleCheckUpdate() {
		if (updateStatus === "checking" || updateStatus === "downloading")
			return;
		updateStatus = "checking";
		updateError = null;
		try {
			const { check } = await import("@tauri-apps/plugin-updater");
			const update = await check();
			if (update?.available) {
				updateVersion = update.version;
				updateStatus = "available";
			} else {
				updateStatus = "up-to-date";
				setTimeout(() => (updateStatus = "idle"), 3000);
			}
		} catch (e: any) {
			updateError = e?.message || "Update check failed";
			updateStatus = "error";
			setTimeout(() => (updateStatus = "idle"), 5000);
		}
	}

	async function handleInstallUpdate() {
		updateStatus = "downloading";
		try {
			const { check } = await import("@tauri-apps/plugin-updater");
			const { relaunch } = await import("@tauri-apps/plugin-process");
			const update = await check();
			if (update?.available) {
				await update.downloadAndInstall();
				await relaunch();
			}
		} catch (e: any) {
			updateError = e?.message || "Install failed";
			updateStatus = "error";
			setTimeout(() => (updateStatus = "idle"), 5000);
		}
	}

	function handleExport() {
		const json = exportData();
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `omtedoen-backup-${new Date().toISOString().split("T")[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
		exportMsg = "Backup downloaded";
		setTimeout(() => (exportMsg = null), 3000);
	}
</script>

<div class="settings-view">
	<h1>Settings</h1>

	<section class="setting-group">
		<h2>Display</h2>

		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Focus Mode</span>
				<span class="setting-desc"
					>Only show tasks with the lightning bolt on.</span
				>
			</div>
			<button
				class="toggle-btn"
				class:active={focusModeActive}
				onclick={() => {
					toggleFocusMode();
					saveSetting("focusMode", String(isFocusMode()));
				}}
				role="switch"
				aria-checked={focusModeActive}
				aria-label="Toggle Focus Mode"
			>
				<span class="toggle-knob"></span>
			</button>
		</div>
	</section>

	<section class="setting-group">
		<h2>Data</h2>

		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Storage</span>
				<span class="setting-desc">
					{#if storageType === "sqlite"}
						Tasks are stored in a local database and will persist
						across app updates.
					{:else}
						Tasks are in memory only and will be lost when the app
						closes.
					{/if}
				</span>
			</div>
			<span
				class="storage-badge"
				class:ok={storageType === "sqlite"}
				class:warn={storageType === "memory"}
			>
				{storageType === "sqlite" ? "Persistent" : "Temporary"}
			</span>
		</div>

		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Export Backup</span>
				<span class="setting-desc"
					>Download all your tasks as a JSON file. Good idea before
					updating.</span
				>
			</div>
			{#if exportMsg}
				<span class="fresh-result">{exportMsg}</span>
			{:else}
				<button class="action-btn" onclick={handleExport}>Export</button
				>
			{/if}
		</div>

		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Fresh Start</span>
				<span class="setting-desc"
					>Archive all incomplete tasks and start with a clean slate.
					You won't lose anything — tasks are soft-deleted.</span
				>
			</div>
			{#if freshStartResult !== null}
				<span class="fresh-result"
					>Archived {freshStartResult} tasks</span
				>
			{:else if freshStartConfirm}
				<div class="confirm-btns">
					<button
						class="confirm-btn danger"
						onclick={handleFreshStart}>Yes, archive all</button
					>
					<button class="confirm-btn" onclick={cancelFreshStart}
						>Cancel</button
					>
				</div>
			{:else}
				<button class="action-btn" onclick={handleFreshStart}
					>Fresh Start</button
				>
			{/if}
		</div>
	</section>

	<section class="setting-group">
		<h2>About</h2>
		<p class="about-text">
			<strong>OmTeDoen</strong> v0.3.7<br />
			A simple, ADHD-friendly todo app.<br />
			Built with Svelte + Tauri.
		</p>

		<div class="setting-row" style="margin-top: 12px;">
			<div class="setting-info">
				<span class="setting-label">Updates</span>
				<span class="setting-desc">
					{#if updateStatus === "checking"}
						Checking for updates...
					{:else if updateStatus === "downloading"}
						Downloading update...
					{:else if updateStatus === "available"}
						Version {updateVersion} is available.
					{:else if updateStatus === "up-to-date"}
						You're up to date.
					{:else if updateStatus === "error"}
						{updateError}
					{:else}
						Check for new versions of OmTeDoen.
					{/if}
				</span>
			</div>
			{#if updateStatus === "available"}
				<button class="action-btn" onclick={handleInstallUpdate}
					>Install & Restart</button
				>
			{:else if updateStatus === "up-to-date"}
				<span class="fresh-result">Up to date</span>
			{:else if updateStatus === "error"}
				<button class="action-btn" onclick={handleCheckUpdate}
					>Retry</button
				>
			{:else if updateStatus === "checking" || updateStatus === "downloading"}
				<span class="update-spinner"></span>
			{:else}
				<button class="action-btn" onclick={handleCheckUpdate}
					>Check for Updates</button
				>
			{/if}
		</div>
	</section>
</div>

<style>
	.settings-view {
		max-width: 640px;
		margin: 0 auto;
		padding: 48px 24px;
	}

	h1 {
		font-size: 36px;
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
		text-shadow: 0 2px 10px rgba(45, 106, 79, 0.2);
		margin-bottom: 40px;
	}

	.setting-group {
		margin-bottom: 40px;
	}

	h2 {
		font-size: 13px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--heading-green);
		margin-bottom: 16px;
		padding-left: 4px;
	}

	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 20px 24px;
		background: var(--bg-surface);
		backdrop-filter: var(--glass);
		-webkit-backdrop-filter: var(--glass);
		border-radius: 16px;
		border: 1px solid var(--border-light);
		margin-bottom: 12px;
		box-shadow: var(--shadow-sm);
		transition: all var(--transition-normal);
	}

	.setting-row:hover {
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
		border-color: var(--border);
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.setting-label {
		font-weight: 600;
		font-size: 16px;
		color: var(--text);
	}

	.setting-desc {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.storage-badge {
		font-size: 13px;
		font-weight: 600;
		font-family: var(--font-mono);
		padding: 4px 12px;
		border-radius: 8px;
		flex-shrink: 0;
	}

	.storage-badge.ok {
		background: var(--success-soft);
		color: var(--success);
	}

	.storage-badge.warn {
		background: rgba(245, 158, 11, 0.15);
		color: var(--priority-should);
	}

	.toggle-btn {
		width: 48px;
		height: 26px;
		border-radius: 13px;
		background: rgba(0, 0, 0, 0.1);
		border: 1px solid var(--border);
		position: relative;
		transition: all var(--transition-normal);
		flex-shrink: 0;
	}

	.toggle-btn.active {
		background: var(--heading-green);
		border-color: var(--heading-green);
		box-shadow: 0 0 12px rgba(45, 106, 79, 0.4);
	}

	.toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		border-radius: 10px;
		background: #fff;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.toggle-btn.active .toggle-knob {
		transform: translateX(22px);
	}

	.action-btn {
		padding: 8px 20px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		color: var(--heading-green);
		background: rgba(45, 106, 79, 0.1);
		border: 1px solid rgba(45, 106, 79, 0.2);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.action-btn:hover {
		background: var(--heading-green);
		color: #fff;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);
	}

	.confirm-btns {
		display: flex;
		gap: 12px;
	}

	.confirm-btn {
		padding: 8px 16px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 600;
		transition: all var(--transition-fast);
		background: rgba(0, 0, 0, 0.05);
		color: var(--text);
	}

	.confirm-btn:hover {
		background: rgba(0, 0, 0, 0.1);
	}

	.confirm-btn.danger {
		background: rgba(255, 71, 110, 0.15);
		color: var(--priority-must);
		border: 1px solid rgba(255, 71, 110, 0.3);
	}

	.confirm-btn.danger:hover {
		background: var(--priority-must);
		color: #fff;
		box-shadow: 0 4px 12px rgba(255, 71, 110, 0.3);
	}

	.fresh-result {
		font-size: 14px;
		color: var(--success);
		font-weight: 600;
		background: var(--success-soft);
		padding: 6px 12px;
		border-radius: 8px;
	}

	.about-text {
		font-size: 14px;
		color: var(--text-secondary);
		line-height: 1.7;
		padding: 24px;
		background: var(--bg-hover);
		border: 1px solid var(--border-light);
		border-radius: 16px;
	}

	.about-text strong {
		color: var(--text);
		font-size: 16px;
	}

	.update-spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--border);
		border-top-color: var(--heading-green);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
		flex-shrink: 0;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
