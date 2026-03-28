<script lang="ts">
  interface Seat {
    partyColor: string;
    partyName: string;
    partySymbolUrl: string;
  }

  interface Props {
    seats: Seat[];
    totalSeats: number;
    rows?: number;
    arcAngle?: number;
  }

  let { seats, totalSeats, rows = 8, arcAngle = 180 }: Props = $props();

  // Calculate seat positions in a hemicycle
  function calculateSeatPositions(): Array<{ x: number; y: number; seat: Seat }> {
    const positions: Array<{ x: number; y: number; seat: Seat }> = [];
    const startAngle = -arcAngle / 2;
    
    // Create concentric arcs
    for (let row = 0; row < rows; row++) {
      const radius = 30 + (row * 12);
      const seatsInRow = Math.floor(totalSeats / rows) + (row * 2);
      const rowAngleStep = arcAngle / (seatsInRow - 1);
      
      for (let i = 0; i < seatsInRow && positions.length < seats.length; i++) {
        const angle = startAngle + (i * rowAngleStep);
        const radian = (angle * Math.PI) / 180;
        
        const x = 50 + (radius * Math.sin(radian));
        const y = 80 - (radius * Math.cos(radian));
        
        positions.push({
          x,
          y,
          seat: seats[positions.length]
        });
      }
    }
    
    return positions;
  }

  let seatPositions = $derived(calculateSeatPositions());
  
  // Simple layout for small seat counts
  function calculateSimplePositions(): Array<{ x: number; y: number; seat: Seat }> {
    if (totalSeats <= 10) {
      return seats.map((seat, i) => {
        const angle = -90 + ((i / (totalSeats - 1)) * 180);
        const radian = (angle * Math.PI) / 180;
        const radius = 35;
        return {
          x: 50 + (radius * Math.cos(radian)),
          y: 50 + (radius * Math.sin(radian)),
          seat
        };
      });
    }
    return [];
  }

  let simplePositions = $derived(totalSeats <= 10 ? calculateSimplePositions() : []);
  let displayPositions = $derived(totalSeats <= 10 ? simplePositions : seatPositions);
  
  // Track hovered seat
  let hoveredSeat: { seat: Seat; index: number } | null = $state(null);
</script>

<div class="hemicycle-container">
  <!-- Legend at top -->
  {#if hoveredSeat}
    <div class="seat-info-bar">
      <img src={hoveredSeat.seat.partySymbolUrl} alt="" class="info-symbol" />
      <span class="info-name">{hoveredSeat.seat.partyName}</span>
    </div>
  {:else}
    <div class="seat-info-bar hint">
      <span class="info-hint">Pasa el mouse sobre los escaños para ver los partidos</span>
    </div>
  {/if}

  <svg 
    viewBox="0 0 100 100" 
    class="hemicycle-svg"
    preserveAspectRatio="xMidYMax meet"
  >
    <!-- Background arcs (only for large counts) -->
    {#if totalSeats > 10}
      {#each Array(rows) as _, row}
        <path
          d="M {50 + (30 + row * 12) * Math.sin((-arcAngle/2 * Math.PI) / 180)} {80 - (30 + row * 12) * Math.cos((-arcAngle/2 * Math.PI) / 180)} 
             A {30 + row * 12} {30 + row * 12} 0 0 1 
             {50 + (30 + row * 12) * Math.sin((arcAngle/2 * Math.PI) / 180)} {80 - (30 + row * 12) * Math.cos((arcAngle/2 * Math.PI) / 180)}"
          fill="none"
          stroke="#e0e0e0"
          stroke-width="0.3"
          stroke-dasharray="1,1"
          opacity="0.5"
        />
      {/each}
    {/if}
    
    <!-- Seats -->
    {#each displayPositions as pos, i}
      <g 
        class="seat-group"
        transform="translate({pos.x}, {pos.y})"
        onmouseenter={() => hoveredSeat = { seat: pos.seat, index: i }}
        onmouseleave={() => hoveredSeat = null}
      >
        <!-- Main seat circle - NO extra circles, NO transforms -->
        <circle
          cx="0"
          cy="0"
          r={totalSeats <= 10 ? 6 : 3.5}
          fill={pos.seat.partyColor}
          stroke="white"
          stroke-width="0.5"
          class="seat-circle"
          class:highlighted={hoveredSeat?.index === i}
          style="animation-delay: {i * 15}ms"
        />
        
        <!-- Party symbol for small layouts -->
        {#if totalSeats <= 10}
          <image
            x="-3"
            y="-3"
            width="6"
            height="6"
            href={pos.seat.partySymbolUrl}
            clip-path="circle(3px at 3px 3px)"
            preserveAspectRatio="xMidYMid slice"
          />
        {/if}
      </g>
    {/each}
    
    <!-- Center podium -->
    <circle cx="50" cy="80" r="2" fill="#ddd" opacity="0.3" />
  </svg>
</div>

<style>
  .hemicycle-container {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    aspect-ratio: 2/1;
  }

  /* Info bar at top - static position */
  .seat-info-bar {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10;
    min-width: 200px;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .seat-info-bar.hint {
    background: rgba(100, 100, 100, 0.7);
  }

  .info-symbol {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    object-fit: cover;
    background: white;
    padding: 2px;
  }

  .info-name {
    font-weight: 600;
    white-space: nowrap;
  }

  .info-hint {
    font-size: 0.85rem;
    opacity: 0.9;
  }

  .hemicycle-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    padding-top: 40px; /* Space for the info bar */
  }

  .seat-group {
    cursor: pointer;
  }

  .seat-circle {
    animation: popIn 0.3s ease-out forwards;
    opacity: 0;
    transition: filter 0.15s ease, stroke-width 0.15s ease;
  }

  /* Simple highlight on hover - NO transforms, NO extra elements */
  .seat-circle.highlighted {
    filter: brightness(1.3);
    stroke-width: 1.5;
    stroke: rgba(255, 255, 255, 0.9);
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    70% {
      transform: scale(1.1);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hemicycle-container {
      aspect-ratio: 2.5/1;
    }
    
    .seat-info-bar {
      font-size: 0.8rem;
      padding: 8px 15px;
      min-width: 180px;
    }
    
    .info-symbol {
      width: 20px;
      height: 20px;
    }
  }
</style>
