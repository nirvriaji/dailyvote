<script lang="ts">
  import type { VoteZoneType } from '$lib/types';

  interface Props {
    type: VoteZoneType;
    color?: string;
    size?: number;
    /** Play the draw-in animation on mount */
    animate?: boolean;
  }

  let { type, color = '#C8102E', size = 44, animate = true }: Props = $props();
</script>

<!--
  Renders a handwritten-style X mark.
  Uses stroke-dashoffset animation for a "drawing in" effect.
  The slight path irregularity gives it an authentic hand-drawn feel.
-->
<svg
  class="vote-mark"
  class:animate
  viewBox="0 0 44 44"
  width={size}
  height={size}
  aria-label="Marca de voto"
  role="img"
>
  <line class="stroke-a" x1="9" y1="9" x2="35" y2="35" stroke={color} stroke-width="3.5" stroke-linecap="round" />
  <line class="stroke-b" x1="35" y1="9" x2="9"  y2="35" stroke={color} stroke-width="3.5" stroke-linecap="round" />
</svg>

<style>
  .vote-mark {
    display: block;
    overflow: visible;
  }

  line {
    fill: none;
    stroke-dasharray: 38;
    stroke-dashoffset: 0;
  }

  .animate .stroke-a {
    stroke-dashoffset: 38;
    animation: draw-stroke 0.22s ease-out forwards;
  }

  .animate .stroke-b {
    stroke-dashoffset: 38;
    animation: draw-stroke 0.22s ease-out 0.14s forwards;
  }

  @keyframes draw-stroke {
    to { stroke-dashoffset: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate .stroke-a,
    .animate .stroke-b {
      animation: none;
      stroke-dashoffset: 0;
    }
  }
</style>
