<script lang="ts">
	import PanelView from "$lib/components/PanelView.svelte";
</script>

<PanelView />

<style>
	/* The panel window is transparent; app.css paints body with an opaque
	   cream background + gradients, which must not show here */
	:global(html),
	:global(body) {
		background: transparent !important;
		background-image: none !important;
	}
</style>
