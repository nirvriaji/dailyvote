<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';
  import { initializeFirebase } from '$lib/firebase';

  let { children } = $props();
  
  // Inicializar Firebase automáticamente al cargar la app
  if (typeof window !== 'undefined') {
    initializeFirebase();
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="theme-color" content="#1C1B19" />
  <meta name="description" content="Simula tu voto para las elecciones generales Perú 2026. Aprende la estructura de la cédula y practica sin miedo." />
</svelte:head>

{@render children()}
