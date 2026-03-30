<script lang="ts">
  import '../app.css';
  import { initializeFirebase } from '$lib/firebase';

  let { children } = $props();
  
  // Inicializar Firebase automáticamente al cargar la app
  if (typeof window !== 'undefined') {
    initializeFirebase();
  }
</script>

<svelte:head>
  <meta name="theme-color" content="#0B1220" />
  <meta name="description" content="Simula tu voto para las elecciones generales Perú 2026. Aprende la estructura de la cédula y practica sin miedo." />
</svelte:head>

{@render children()}
