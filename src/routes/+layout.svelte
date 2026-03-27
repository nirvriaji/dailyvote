<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="theme-color" content="#1C1B19" />
  <meta name="description" content="Simula tu voto para las elecciones generales Perú 2026. Aprende la estructura de la cédula y practica sin miedo." />
</svelte:head>

{@render children()}
