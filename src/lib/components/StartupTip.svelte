<script lang="ts">
	import type { Tip } from "$lib/core/tips.js";
	import { getRandomTip, DEFAULT_TIPS } from "$lib/core/tips.js";
	import { saveSetting } from "$lib/stores/app.svelte.js";

	interface Props {
		updateAvailable?: { version: string } | null;
		updateInstalling?: boolean;
		onInstallUpdate?: () => void;
	}

	let {
		updateAvailable = null,
		updateInstalling = false,
		onInstallUpdate,
	}: Props = $props();

	let tip: Tip | null = $state(null);
	let isVisible = $state(false);

	function loadTip() {
		tip = getRandomTip(DEFAULT_TIPS);
		isVisible = true;
	}

	function close() {
		isVisible = false;
		saveSetting("lastTipTime", new Date().toISOString());
	}

	function nextTip() {
		tip = getRandomTip(DEFAULT_TIPS);
	}

	export function showTip() {
		loadTip();
	}
</script>

{#if isVisible && tip}
	<div class="startup-tip-overlay" role="presentation" onclick={() => close()}>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="startup-tip-dialog" onclick={(e) => e.stopPropagation()}>
			<button class="close-btn" onclick={() => close()} aria-label="Close">
				&times;
			</button>

			{#if updateAvailable}
				<div class="update-section">
					<div class="update-icon">
						<svg viewBox="0 0 24 24" fill="none" class="update-svg">
							<path d="M12 2v10m0 0l-3-3m3 3l3-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180 12 12)"/>
							<path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<p class="update-text">
						Version <strong>{updateAvailable.version}</strong> is available!
					</p>
					{#if updateInstalling}
						<div class="update-progress">Installing update...</div>
					{:else if onInstallUpdate}
						<button class="update-btn" onclick={onInstallUpdate}>
							Install & Restart
						</button>
					{/if}
				</div>
				<div class="section-divider"></div>
			{/if}

			<div class="tip-icon">💡</div>

			<h2 class="tip-title">{tip.title}</h2>
			<p class="tip-message">{tip.message}</p>

			<div class="tip-actions">
				<button class="next-btn" onclick={nextTip}>Another tip</button>
				<button class="dismiss-btn" onclick={() => close()}>Got it</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.startup-tip-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		animation: fadeIn 0.2s ease-out;
	}

	.startup-tip-dialog {
		background: var(--bg-surface);
		border: 1px solid var(--border);
		border-radius: 16px;
		padding: 32px;
		max-width: 420px;
		width: 90%;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		position: relative;
		animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.close-btn {
		position: absolute;
		top: 12px;
		right: 12px;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		background: transparent;
		color: var(--text-muted);
		font-size: 24px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.tip-icon {
		font-size: 48px;
		margin-bottom: 16px;
		text-align: center;
	}

	.tip-title {
		font-size: 20px;
		font-weight: 700;
		color: var(--text);
		margin: 0 0 12px;
		letter-spacing: -0.02em;
	}

	.tip-message {
		font-size: 15px;
		line-height: 1.6;
		color: var(--text-secondary);
		margin: 0 0 24px;
	}

	.tip-actions {
		display: flex;
		gap: 12px;
	}

	.next-btn,
	.dismiss-btn {
		flex: 1;
		padding: 10px 16px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		transition: all var(--transition-fast);
		border: 1px solid var(--border);
		background: var(--bg-hover);
		color: var(--text);
	}

	.next-btn:hover,
	.dismiss-btn:hover {
		background: var(--border);
		transform: translateY(-1px);
	}

	.dismiss-btn {
		background: var(--heading-green);
		color: #fff;
		border-color: var(--heading-green);
	}

	.dismiss-btn:hover {
		background: var(--heading-green-light);
		border-color: var(--heading-green-light);
	}

	/* Update section */
	.update-section {
		text-align: center;
		padding: 16px;
		background: rgba(45, 106, 79, 0.08);
		border: 1px solid rgba(45, 106, 79, 0.15);
		border-radius: 12px;
		margin-bottom: 16px;
	}

	.update-icon {
		margin-bottom: 8px;
	}

	.update-svg {
		width: 32px;
		height: 32px;
		color: var(--heading-green);
	}

	.update-text {
		font-size: 15px;
		color: var(--text);
		margin: 0 0 12px;
	}

	.update-text strong {
		color: var(--heading-green);
	}

	.update-btn {
		padding: 10px 24px;
		border-radius: 10px;
		font-size: 14px;
		font-weight: 600;
		background: var(--heading-green);
		color: #fff;
		border: none;
		transition: all var(--transition-fast);
	}

	.update-btn:hover {
		background: var(--heading-green-light);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);
	}

	.update-progress {
		font-size: 14px;
		font-weight: 600;
		color: var(--heading-green);
		font-style: italic;
	}

	.section-divider {
		height: 1px;
		background: var(--border-light);
		margin: 8px 0 16px;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
