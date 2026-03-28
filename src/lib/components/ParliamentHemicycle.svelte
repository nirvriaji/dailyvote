<script lang="ts">
  interface Seat {
    partyColor: string;
    partyName: string;
    partySymbolUrl: string;
  }

  interface Props {
    seats: Seat[];
    totalSeats: number;
  }

  let { seats, totalSeats }: Props = $props();

  // Standard hemicycle layout - each row gets progressively more seats
  function calculateSeatPositions(): Array<{ x: number; y: number; seat: Seat }> {
    if (totalSeats <= 10) {
      // Simple semi-circle for small numbers - HORIZONTAL orientation
      return seats.map((seat, i) => {
        const angle = -90 + ((i / Math.max(1, totalSeats - 1)) * 180);
        const radian = (angle * Math.PI) / 180;
        const radius = 35;
        // Swapped sin/cos for horizontal hemicycle
        return {
          x: 50 + (radius * Math.sin(radian)),  // horizontal spread
          y: 50 - (radius * Math.cos(radian) * 0.6),  // vertical arc (flattened)
          seat
        };
      });
    }

    // For larger numbers (30, 130), use proper hemicycle rows
    const positions: Array<{ x: number; y: number; seat: Seat }> = [];
    
    // Define rows with specific seat counts for realistic hemicycle
    // Inner rows have fewer seats, outer rows have more
    const rowConfig = getRowConfiguration(totalSeats);
    
    let seatIndex = 0;
    for (let row = 0; row < rowConfig.length && seatIndex < seats.length; row++) {
      const { radius, count } = rowConfig[row];
      const angleStep = 180 / (count - 1);
      
      for (let i = 0; i < count && seatIndex < seats.length; i++) {
        const angle = -90 + (i * angleStep); // -90 (left) to 90 (right) degrees
        const radian = (angle * Math.PI) / 180;
        
        // Horizontal hemicycle: arc at top, opening at bottom
        positions.push({
          x: 50 + (radius * Math.sin(radian)),  // horizontal: -90°=left, 90°=right
          y: 85 - (radius * Math.cos(radian) * 0.7),  // vertical: 0°=top (row 0), 90°=bottom
          seat: seats[seatIndex++]
        });
      }
    }
    
    return positions;
  }

  // Get row configuration based on total seats
  function getRowConfiguration(total: number): Array<{ radius: number; count: number }> {
    if (total <= 30) {
      // For 30 seats (Senadores): 5 rows
      return [
        { radius: 25, count: 4 },   // Inner: 4 seats
        { radius: 32, count: 5 },   // Row 2: 5 seats
        { radius: 39, count: 6 },   // Row 3: 6 seats
        { radius: 46, count: 7 },   // Row 4: 7 seats
        { radius: 53, count: 8 },   // Outer: 8 seats
        // Total: 30 seats
      ];
    } else {
      // For 130 seats (Diputados): 8 rows
      return [
        { radius: 20, count: 10 },   // Row 1: 10
        { radius: 28, count: 14 },  // Row 2: 14
        { radius: 36, count: 16 },  // Row 3: 16
        { radius: 44, count: 18 },  // Row 4: 18
        { radius: 52, count: 20 },  // Row 5: 20
        { radius: 60, count: 18 },  // Row 6: 18
        { radius: 68, count: 16 },  // Row 7: 16
        { radius: 76, count: 10 },  // Row 8: 10
        // Total: 130 seats
      ];
    }
  }

  let displayPositions = $derived(calculateSeatPositions());
  
  // Track hovered seat
  let hoveredSeat: { seat: Seat; index: number } | null = $state(null);
  
  // Get arc rows for background
  let arcRows = $derived(totalSeats <= 10 ? [] : getRowConfiguration(totalSeats));
</script>

<div class="hemicycle-container">
  <!-- Info bar at top -->
  {#if hoveredSeat}
    <div class="seat-info-bar">
      <img src={hoveredSeat.seat.partySymbolUrl} alt="" class="info-symbol" />
      <span class="info-name">{hoveredSeat.seat.partyName}</span>
    </div>
  {:else}
    <div class="seat-info-bar hint">
      <span class="info-hint">Pasa el mouse sobre los escaños ({totalSeats} total)</span>
    </div>
  {/if}

  <svg 
    viewBox="0 0 100 100" 
    class="hemicycle-svg"
    preserveAspectRatio="xMidYMax meet"
  >
    <!-- Background arcs - horizontal hemicycle -->
    {#if arcRows.length > 0}
      {#each arcRows as row}
        <path
          d="M {50 + row.radius * Math.sin((-90 * Math.PI) / 180)} {85 - row.radius * Math.cos((-90 * Math.PI) / 180) * 0.7} 
             A {row.radius} {row.radius * 0.7} 0 0 1 
             {50 + row.radius * Math.sin((90 * Math.PI) / 180)} {85 - row.radius * Math.cos((90 * Math.PI) / 180) * 0.7}"
          fill="none"
          stroke="#c0c0c0"
          stroke-width="1"
          opacity="0.8"
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
        <!-- Main seat circle -->
        <circle
          cx="0"
          cy="0"
          r={totalSeats <= 10 ? 6 : totalSeats <= 30 ? 3.5 : 2.8}
          fill={pos.seat.partyColor}
          stroke="white"
          stroke-width="0.4"
          class="seat-circle"
          class:highlighted={hoveredSeat?.index === i}
          style="animation-delay: {i * 8}ms"
        />
        
        <!-- Party symbol for larger seats -->
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
    
    <!-- Center podium reference at bottom center -->
    <circle cx="50" cy="85" r="1.5" fill="#bbb" opacity="0.5" />
  </svg>
</div>

<style>
  .hemicycle-container {
    position: relative;
    width: 100%;
    max-width: 1000px;
    margin: 0 auto;
    aspect-ratio: 16/9;
    background: linear-gradient(180deg, #f8f8f8 0%, #ececec 100%);
    border-radius: 16px;
    padding: 20px;
  }

  /* Info bar at top */
  .seat-info-bar {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
    z-index: 10;
    min-width: 220px;
    justify-content: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255,255,255,0.1);
  }

  .seat-info-bar.hint {
    background: rgba(80, 80, 80, 0.7);
  }

  .info-symbol {
    width: 22px;
    height: 22px;
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
    opacity: 0.95;
  }

  .hemicycle-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .seat-group {
    cursor: pointer;
  }

  .seat-circle {
    animation: popIn 0.4s ease-out forwards;
    opacity: 0;
    transition: filter 0.15s ease, stroke-width 0.15s ease;
  }

  /* Simple highlight on hover */
  .seat-circle.highlighted {
    filter: brightness(1.4) drop-shadow(0 0 3px rgba(255,255,255,0.9));
    stroke-width: 1;
  }

  @keyframes popIn {
    0% {
      opacity: 0;
      transform: scale(0);
    }
    60% {
      transform: scale(1.15);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .hemicycle-container {
      aspect-ratio: 2/1.2;
      padding: 15px;
    }
    
    .seat-info-bar {
      font-size: 0.8rem;
      padding: 8px 15px;
      min-width: 180px;
      top: 10px;
    }
    
    .info-symbol {
      width: 18px;
      height: 18px;
    }
  }
</style>
