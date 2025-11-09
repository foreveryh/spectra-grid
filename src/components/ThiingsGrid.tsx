import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";

// Grid physics constants
const MIN_VELOCITY = 0.2;
const UPDATE_INTERVAL = 16;
const VELOCITY_HISTORY_SIZE = 5;
const FRICTION = 0.9;
const VELOCITY_THRESHOLD = 0.3;

// Custom debounce implementation
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;

  const debouncedFn = function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = undefined;
    }, wait);
  };

  debouncedFn.cancel = function () {
    clearTimeout(timeoutId);
    timeoutId = undefined;
  };

  return debouncedFn;
}

// Custom throttle implementation
function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
  options: { leading?: boolean; trailing?: boolean } = {}
) {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined;
  const { leading = true, trailing = true } = options;

  const throttledFn = function (...args: Parameters<T>) {
    const now = Date.now();

    if (!lastCall && !leading) {
      lastCall = now;
    }

    const remaining = limit - (now - lastCall);

    if (remaining <= 0 || remaining > limit) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
      lastCall = now;
      func(...args);
    } else if (!timeoutId && trailing) {
      timeoutId = setTimeout(() => {
        lastCall = leading ? Date.now() : 0;
        timeoutId = undefined;
        func(...args);
      }, remaining);
    }
  };

  throttledFn.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
  };

  return throttledFn;
}

function getDistance(p1: Position, p2: Position) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

type Position = {
  x: number;
  y: number;
};

type GridItem = {
  position: Position;
  gridIndex: number;
};

export type ItemConfig = {
  isMoving: boolean;
  position: Position;
  gridIndex: number;
};

export type ThiingsGridProps = {
  gridSize: number;
  renderItem: (itemConfig: ItemConfig) => React.ReactNode;
  className?: string;
  initialPosition?: Position;
  onItemClick?: (gridIndex: number, position: Position) => void;
  onOffsetChange?: (offset: Position) => void;
};

const ThiingsGrid: React.FC<ThiingsGridProps> = ({
  gridSize,
  renderItem,
  className,
  initialPosition,
  onItemClick,
  onOffsetChange,
}) => {
  // State
  const [offset, setOffset] = useState<Position>(
    initialPosition || { x: 0, y: 0 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<Position>({ x: 0, y: 0 });
  const [restPos, setRestPos] = useState<Position>(
    initialPosition || { x: 0, y: 0 }
  );
  const [velocity, setVelocity] = useState<Position>({ x: 0, y: 0 });
  const [gridItems, setGridItems] = useState<GridItem[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  const [lastMoveTime, setLastMoveTime] = useState(0);
  const [velocityHistory, setVelocityHistory] = useState<Position[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPosRef = useRef<Position>({ x: 0, y: 0 });
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Spiral grid index calculation
  const getItemIndexForPosition = useCallback((x: number, y: number): number => {
    // Special case for center
    if (x === 0 && y === 0) return 0;

    // Determine which layer of the spiral we're in
    const layer = Math.max(Math.abs(x), Math.abs(y));

    // Calculate the size of all inner layers
    const innerLayersSize = Math.pow(2 * layer - 1, 2);

    // Calculate position within current layer
    let positionInLayer = 0;

    if (y === 0 && x === layer) {
      // Starting position (middle right)
      positionInLayer = 0;
    } else if (y < 0 && x === layer) {
      // Right side, bottom half
      positionInLayer = -y;
    } else if (y === -layer && x > -layer) {
      // Bottom side
      positionInLayer = layer + (layer - x);
    } else if (x === -layer && y < layer) {
      // Left side
      positionInLayer = 3 * layer + (layer + y);
    } else if (y === layer && x < layer) {
      // Top side
      positionInLayer = 5 * layer + (layer + x);
    } else {
      // Right side, top half (y > 0 && x === layer)
      positionInLayer = 7 * layer + (layer - y);
    }

    const index = innerLayersSize + positionInLayer;
    return index;
  }, []);

  // Calculate visible positions
  const calculateVisiblePositions = useCallback((): Position[] => {
    if (!containerRef.current) return [];

    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate grid cells needed to fill container
    const cellsX = Math.ceil(width / gridSize);
    const cellsY = Math.ceil(height / gridSize);

    // Calculate center position based on offset
    const centerX = -Math.round(offset.x / gridSize);
    const centerY = -Math.round(offset.y / gridSize);

    const positions: Position[] = [];
    const halfCellsX = Math.ceil(cellsX / 2);
    const halfCellsY = Math.ceil(cellsY / 2);

    for (let y = centerY - halfCellsY; y <= centerY + halfCellsY; y++) {
      for (let x = centerX - halfCellsX; x <= centerX + halfCellsX; x++) {
        positions.push({ x, y });
      }
    }

    return positions;
  }, [gridSize, offset]);

  // Debounced stop moving
  const debouncedStopMoving = useMemo(
    () =>
      debounce(() => {
        setIsMoving(false);
        setRestPos({ ...offset });
      }, 200),
    [offset]
  );

  // Update grid items
  const updateGridItems = useCallback(() => {
    const positions = calculateVisiblePositions();
    const newItems = positions.map((position) => {
      const gridIndex = getItemIndexForPosition(position.x, position.y);
      return {
        position,
        gridIndex,
      };
    });

    const distanceFromRest = getDistance(offset, restPos);
    setGridItems(newItems);
    setIsMoving(distanceFromRest > 5);
    debouncedStopMoving();
  }, [calculateVisiblePositions, getItemIndexForPosition, offset, restPos, debouncedStopMoving]);

  // Throttled update grid items
  const debouncedUpdateGridItems = useMemo(
    () =>
      throttle(updateGridItems, UPDATE_INTERVAL, {
        leading: true,
        trailing: true,
      }),
    [updateGridItems]
  );

  // Set offset and notify
  const setOffsetAndNotify = useCallback(
    (newOffset: Position) => {
      setOffset(newOffset);
      if (onOffsetChange) {
        onOffsetChange(newOffset);
      }
    },
    [onOffsetChange]
  );

  // Animation loop
  const animate = useCallback(() => {
    const currentTime = performance.now();
    const deltaTime = currentTime - lastUpdateTimeRef.current;

    if (deltaTime >= UPDATE_INTERVAL) {
      setVelocity((currentVelocity) => {
        const speed = Math.sqrt(
          currentVelocity.x * currentVelocity.x +
            currentVelocity.y * currentVelocity.y
        );

        if (speed < MIN_VELOCITY) {
          return { x: 0, y: 0 };
        }

        let deceleration = FRICTION;
        if (speed < VELOCITY_THRESHOLD) {
          deceleration = FRICTION * (speed / VELOCITY_THRESHOLD);
        }

        setOffset((currentOffset) => {
          const newOffset = {
            x: currentOffset.x + currentVelocity.x,
            y: currentOffset.y + currentVelocity.y,
          };
          if (onOffsetChange) {
            onOffsetChange(newOffset);
          }
          return newOffset;
        });

        debouncedUpdateGridItems();

        lastUpdateTimeRef.current = currentTime;

        return {
          x: currentVelocity.x * deceleration,
          y: currentVelocity.y * deceleration,
        };
      });
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [onOffsetChange, debouncedUpdateGridItems]);

  // Handle down
  const handleDown = useCallback(
    (p: Position) => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsDragging(true);
      setStartPos({
        x: p.x - offset.x,
        y: p.y - offset.y,
      });
      setVelocity({ x: 0, y: 0 });
      lastPosRef.current = { x: p.x, y: p.y };
    },
    [offset]
  );

  // Handle move
  const handleMove = useCallback(
    (p: Position) => {
      if (!isDragging) return;

      const currentTime = performance.now();
      const timeDelta = currentTime - lastMoveTime;

      const rawVelocity = {
        x: (p.x - lastPosRef.current.x) / (timeDelta || 1),
        y: (p.y - lastPosRef.current.y) / (timeDelta || 1),
      };

      setVelocityHistory((history) => {
        const newHistory = [...history, rawVelocity];
        if (newHistory.length > VELOCITY_HISTORY_SIZE) {
          newHistory.shift();
        }
        return newHistory;
      });

      const newVelocityHistory = [...velocityHistory, rawVelocity];
      if (newVelocityHistory.length > VELOCITY_HISTORY_SIZE) {
        newVelocityHistory.shift();
      }

      const smoothedVelocity = newVelocityHistory.reduce(
        (acc, vel) => ({
          x: acc.x + vel.x / newVelocityHistory.length,
          y: acc.y + vel.y / newVelocityHistory.length,
        }),
        { x: 0, y: 0 }
      );

      const newOffset = {
        x: p.x - startPos.x,
        y: p.y - startPos.y,
      };

      setOffsetAndNotify(newOffset);
      setVelocity(smoothedVelocity);
      setLastMoveTime(currentTime);
      updateGridItems();
      lastPosRef.current = { x: p.x, y: p.y };
    },
    [isDragging, lastMoveTime, velocityHistory, startPos, setOffsetAndNotify, updateGridItems]
  );

  // Handle up
  const handleUp = useCallback(
    (p?: Position) => {
      if (p && onItemClick) {
        // Calculate movement distance
        const dx = p.x - lastPosRef.current.x;
        const dy = p.y - lastPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // If movement distance is less than 5px, treat as click
        if (distance < 5) {
          // Calculate grid index for click position
          const containerRect = containerRef.current?.getBoundingClientRect();
          if (containerRect) {
            const x = p.x - containerRect.left - offset.x;
            const y = p.y - containerRect.top - offset.y;
            const gridX = Math.round(x / gridSize);
            const gridY = Math.round(y / gridSize);
            const gridIndex = getItemIndexForPosition(gridX, gridY);
            onItemClick(gridIndex, p);
          }
        }
      }

      setIsDragging(false);
      animationFrameRef.current = requestAnimationFrame(animate);
    },
    [onItemClick, offset, gridSize, getItemIndexForPosition, animate]
  );

  // Mouse event handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      handleDown({ x: e.clientX, y: e.clientY });
    },
    [handleDown]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleMove({ x: e.clientX, y: e.clientY });
    },
    [handleMove]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      handleUp({ x: e.clientX, y: e.clientY });
    },
    [handleUp]
  );

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handleDown({ x: touch.clientX, y: touch.clientY });
    },
    [handleDown]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      handleMove({ x: touch.clientX, y: touch.clientY });
    },
    [handleMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      if (touch) {
        handleUp({ x: touch.clientX, y: touch.clientY });
      } else {
        handleUp();
      }
    },
    [handleUp]
  );

  // Wheel event handler
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const deltaX = e.deltaX;
      const deltaY = e.deltaY;
      const newOffset = {
        x: offset.x - deltaX,
        y: offset.y - deltaY,
      };
      setOffsetAndNotify(newOffset);
      setVelocity({ x: 0, y: 0 });
      debouncedUpdateGridItems();
    },
    [offset, setOffsetAndNotify, debouncedUpdateGridItems]
  );

  // Mount effect - handle initial position
  useEffect(() => {
    if (initialPosition) {
      setOffset({ ...initialPosition });
      setRestPos({ ...initialPosition });
    }
    updateGridItems();
  }, [initialPosition, updateGridItems]);

  // Mount/unmount effect for event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add non-passive event listeners
    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      debouncedUpdateGridItems.cancel();

      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleWheel, handleTouchMove, debouncedUpdateGridItems]);

  // Get container dimensions
  const containerRect = containerRef.current?.getBoundingClientRect();
  const containerWidth = containerRect?.width || 0;
  const containerHeight = containerRect?.height || 0;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        overflow: "hidden",
        cursor: isDragging ? "grabbing" : "grab",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          willChange: "transform",
        }}
      >
        {gridItems.map((item) => {
          const x = item.position.x * gridSize + containerWidth / 2;
          const y = item.position.y * gridSize + containerHeight / 2;

          return (
            <div
              key={`${item.position.x}-${item.position.y}`}
              style={{
                position: "absolute",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                userSelect: "none",
                width: gridSize,
                height: gridSize,
                transform: `translate3d(${x}px, ${y}px, 0)`,
                marginLeft: `-${gridSize / 2}px`,
                marginTop: `-${gridSize / 2}px`,
                willChange: "transform",
              }}
            >
              {renderItem({
                gridIndex: item.gridIndex,
                position: item.position,
                isMoving,
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThiingsGrid;
