<script lang="ts">
	/** Trash can used for the sidebar Trash item and the card delete button. */
	let { size = 16 }: { size?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
	<path d="M2.5 4h11" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
	<path d="M6 4V2.8c0-.4.3-.8.8-.8h2.4c.5 0 .8.4.8.8V4" stroke="currentColor" stroke-width="1.3"/>
	<path d="M3.8 4l.7 9.2c.1.5.5.8 1 .8h5c.5 0 .9-.3 1-.8l.7-9.2" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>
	<path d="M6.6 6.8v4.4M9.4 6.8v4.4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>
</svg>
