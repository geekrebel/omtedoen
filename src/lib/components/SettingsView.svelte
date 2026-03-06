<script lang="ts">
	import {
		isLowEnergyMode,
		toggleLowEnergyMode,
		doFreshStart,
		saveSetting,
	} from "$lib/stores/app.svelte.js";

	let lowEnergy = $derived(isLowEnergyMode());
	let freshStartConfirm = $state(false);
	let freshStartResult = $state<number | null>(null);

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
</script>

<div class="settings-view">
	<h1>Settings</h1>

	<section class="setting-group">
		<h2>Display</h2>

		<div class="setting-row">
			<div class="setting-info">
				<span class="setting-label">Low Energy Mode</span>
				<span class="setting-desc"
					>Only show must-do tasks. Simplify the interface.</span
				>
			</div>
			<button
				class="toggle-btn"
				class:active={lowEnergy}
				onclick={toggleLowEnergyMode}
				role="switch"
				aria-checked={lowEnergy}
			>
				<span class="toggle-knob"></span>
			</button>
		</div>
	</section>

	<section class="setting-group">
		<h2>Data</h2>

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
			<strong>OmTeDoen</strong> v0.1.0<br />
			A simple, ADHD-friendly todo app.<br />
			Built with Svelte + Tauri.
		</p>
	</section>
</div>

<style>
	.settings-view {
		max-width: 640px;
		margin: 0 auto;
		padding: 48px 24px;
		animation: popIn 0.4s var(--transition-bounce);
	}

	h1 {
		font-size: 36px;
		font-weight: 800;
		letter-spacing: -0.03em;
		background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
		text-shadow: 0 2px 10px rgba(165, 180, 252, 0.2);
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
		color: var(--accent);
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
		background: var(--accent);
		border-color: var(--accent);
		box-shadow: 0 0 12px rgba(94, 114, 255, 0.4);
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
		color: var(--accent);
		background: var(--accent-soft);
		border: 1px solid rgba(94, 114, 255, 0.2);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.action-btn:hover {
		background: var(--accent);
		color: #fff;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(94, 114, 255, 0.3);
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
</style>
