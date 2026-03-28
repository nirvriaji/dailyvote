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
    const angleStep = arcAngle / (totalSeats / rows);
    
    // Create concentric arcs
    for (let row = 0; row < rows; row++) {
      const radius = 30 + (row * 12); // Increasing radius for each row
      const seatsInRow = Math.floor(totalSeats / rows) + (row * 2);
      const rowAngleStep = arcAngle / (seatsInRow - 1);
      
      for (let i = 0; i < seatsInRow && positions.length < seats.length; i++) {
        const angle = startAngle + (i * rowAngleStep);
        const radian = (angle * Math.PI) / 180;
        
        // Calculate position
        const x = 50 + (radius * Math.sin(radian)); // 50 is center x%
        const y = 80 - (radius * Math.cos(radian)); // 80 is bottom y%
        
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
  
  // For smaller seat counts (like Parlamento Andino = 5), use a simpler layout
  function calculateSimplePositions(): Array<{ x: number; y: number; seat: Seat }> {
    if (totalSeats <= 10) {
      // Semi-circle layout for small numbers
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
  <svg 
    viewBox="0 0 100 100" 
    class="hemicycle-svg"
    preserveAspectRatio="xMidYMax meet"
  >
    <!-- Background arc lines for reference -->
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
        <circle
          cx="0"
          cy="0"
          r={totalSeats <= 10 ? 6 : 3.5}
          fill={pos.seat.partyColor}
          stroke="white"
          stroke-width="0.5"
          class="seat-circle"
          style="animation-delay: {i * 20}ms"
        />
        
        <!-- Party symbol inside seat for larger seats -->
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
        
        <!-- Highlight on hover -->
        {#if hoveredSeat && hoveredSeat.index === i}
          <circle
            cx="0"
            cy="0"
            r={totalSeats <= 10 ? 7 : 4.5}
            fill="none"
            stroke="rgba(255,255,255,0.8)"
            stroke-width="1"
            class="hover-ring"
          />
        {/if}
      </g>
    {/each}
    
    <!-- Center podium reference -->
    <circle cx="50" cy="80" r="2" fill="#ddd" opacity="0.3" />
  </svg>
  
  <!-- Tooltip -->
  {#if hoveredSeat}
    <div 
      class="seat-tooltip"
      style="left: {(hoveredSeat.index / displayPositions.length) * 100}%"
    >
      <img src={hoveredSeat.seat.partySymbolUrl} alt="" class="tooltip-symbol" />
      <span class="tooltip-name">{hoveredSeat.seat.partyName}</span>
    </div>
  {/if}
</div>

<style>
  .hemicycle-container {
    position: relative;
    width: 100%;
    max-width: 800px;
    margin: 0 auto;
    aspect-ratio: 2/1;
  }

  .hemicycle-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .seat-group {
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .seat-group:hover {
    transform: scale(1.2);
    z-index: 10;
  }

  .seat-circle {
    animation: popIn 0.4s ease-out forwards;
    opacity: 0;
    transform-origin: center;
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    50% {
      transform: scale(1.2);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .hover-ring {
    animation: pulse 1.5s infinite;
    pointer-events: none;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 0.8;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(1.1);
    }
  }

  .seat-tooltip {
    position: absolute;
    bottom: 100%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .tooltip-symbol {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
  }

  .tooltip-name {
    font-weight: 500;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hemicycle-container {
      aspect-ratio: 2.5/1;
    }
    
    .seat-tooltip {
      font-size: 0.75rem;
      padding: 6px 10px;
    }
    
    .tooltip-symbol {
      width: 16px;
      height: 16px;
    }
  }
</style>
