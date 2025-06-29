import React, { Component } from "react";

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

type State = {
  offset: Position;
  isDragging: boolean;
  startPos: Position;
  restPos: Position;
  velocity: Position;
  gridItems: GridItem[];
  isMoving: boolean;
  lastMoveTime: number;
  velocityHistory: Position[];
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

class ThiingsGrid extends Component<ThiingsGridProps, State> {
  private containerRef: React.RefObject<HTMLElement | null>;
  private lastPos: Position;
  private animationFrame: number | null;
  private isComponentMounted: boolean;
  private lastUpdateTime: number;
  private debouncedUpdateGridItems: ReturnType<typeof throttle>;

  constructor(props: ThiingsGridProps) {
    super(props);
    const offset = this.props.initialPosition || { x: 0, y: 0 };
    this.state = {
      offset: { ...offset },
      restPos: { ...offset },
      startPos: { ...offset },
      velocity: { x: 0, y: 0 },
      isDragging: false,
      gridItems: [],
      isMoving: false,
      lastMoveTime: 0,
      velocityHistory: [],
    };
    this.containerRef = React.createRef();
    this.lastPos = { x: 0, y: 0 };
    this.animationFrame = null;
    this.isComponentMounted = false;
    this.lastUpdateTime = 0;
    this.debouncedUpdateGridItems = throttle(
      this.updateGridItems,
      UPDATE_INTERVAL,
      {
        leading: true,
        trailing: true,
      }
    );
  }

  componentDidMount() {
    this.isComponentMounted = true;
    if (this.props.initialPosition) {
      this.setState({ offset: { ...this.props.initialPosition }, restPos: { ...this.props.initialPosition } });
    }
    this.updateGridItems();

    // Add non-passive event listener
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener("wheel", this.handleWheel, {
        passive: false,
      });
      this.containerRef.current.addEventListener(
        "touchmove",
        this.handleTouchMove,
        { passive: false }
      );
    }
  }

  componentWillUnmount() {
    this.isComponentMounted = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.debouncedUpdateGridItems.cancel();

    // Remove event listeners
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener("wheel", this.handleWheel);
      this.containerRef.current.removeEventListener(
        "touchmove",
        this.handleTouchMove
      );
    }
  }

  public publicGetCurrentPosition = () => {
    return this.state.offset;
  };

  private calculateVisiblePositions = (): Position[] => {
    if (!this.containerRef.current) return [];

    const rect = this.containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate grid cells needed to fill container
    const cellsX = Math.ceil(width / this.props.gridSize);
    const cellsY = Math.ceil(height / this.props.gridSize);

    // Calculate center position based on offset
    const centerX = -Math.round(this.state.offset.x / this.props.gridSize);
    const centerY = -Math.round(this.state.offset.y / this.props.gridSize);

    const positions: Position[] = [];
    const halfCellsX = Math.ceil(cellsX / 2);
    const halfCellsY = Math.ceil(cellsY / 2);

    for (let y = centerY - halfCellsY; y <= centerY + halfCellsY; y++) {
      for (let x = centerX - halfCellsX; x <= centerX + halfCellsX; x++) {
        positions.push({ x, y });
      }
    }

    return positions;
  };

  private getItemIndexForPosition = (x: number, y: number): number => {
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
  };

  private debouncedStopMoving = debounce(() => {
    this.setState({ isMoving: false, restPos: { ...this.state.offset } });
  }, 200);

  private updateGridItems = () => {
    if (!this.isComponentMounted) return;

    const positions = this.calculateVisiblePositions();
    const newItems = positions.map((position) => {
      const gridIndex = this.getItemIndexForPosition(position.x, position.y);
      return {
        position,
        gridIndex,
      };
    });

    const distanceFromRest = getDistance(this.state.offset, this.state.restPos);

    this.setState({ gridItems: newItems, isMoving: distanceFromRest > 5 });

    this.debouncedStopMoving();
  };

  private setOffsetAndNotify = (offset: Position) => {
    this.setState({ offset }, () => {
      if (this.props.onOffsetChange) {
        this.props.onOffsetChange(offset);
      }
    });
  };

  private animate = () => {
    if (!this.isComponentMounted) return;
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    if (deltaTime >= UPDATE_INTERVAL) {
      const { velocity } = this.state;
      const speed = Math.sqrt(
        velocity.x * velocity.x + velocity.y * velocity.y
      );
      if (speed < MIN_VELOCITY) {
        this.setState({ velocity: { x: 0, y: 0 } });
        return;
      }
      let deceleration = FRICTION;
      if (speed < VELOCITY_THRESHOLD) {
        deceleration = FRICTION * (speed / VELOCITY_THRESHOLD);
      }
      const newOffset = {
        x: this.state.offset.x + this.state.velocity.x,
        y: this.state.offset.y + this.state.velocity.y,
      };
      this.setOffsetAndNotify(newOffset);
      this.setState(
        prevState => ({
          velocity: {
            x: prevState.velocity.x * deceleration,
            y: prevState.velocity.y * deceleration,
          },
        }),
        this.debouncedUpdateGridItems
      );
      this.lastUpdateTime = currentTime;
    }
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private handleDown = (p: Position) => {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.setState({
      isDragging: true,
      startPos: {
        x: p.x - this.state.offset.x,
        y: p.y - this.state.offset.y,
      },
      velocity: { x: 0, y: 0 },
    });
    this.lastPos = { x: p.x, y: p.y };
  };

  private handleMove = (p: Position) => {
    if (!this.state.isDragging) return;
    const currentTime = performance.now();
    const timeDelta = currentTime - this.state.lastMoveTime;
    const rawVelocity = {
      x: (p.x - this.lastPos.x) / (timeDelta || 1),
      y: (p.y - this.lastPos.y) / (timeDelta || 1),
    };
    const velocityHistory = [...this.state.velocityHistory, rawVelocity];
    if (velocityHistory.length > VELOCITY_HISTORY_SIZE) {
      velocityHistory.shift();
    }
    const smoothedVelocity = velocityHistory.reduce(
      (acc, vel) => ({
        x: acc.x + vel.x / velocityHistory.length,
        y: acc.y + vel.y / velocityHistory.length,
      }),
      { x: 0, y: 0 }
    );
    const newOffset = {
      x: p.x - this.state.startPos.x,
      y: p.y - this.state.startPos.y,
    };
    this.setOffsetAndNotify(newOffset);
    this.setState(
      {
        velocity: smoothedVelocity,
        lastMoveTime: currentTime,
        velocityHistory,
      },
      this.updateGridItems
    );
    this.lastPos = { x: p.x, y: p.y };
  };

  private handleUp = (p?: Position) => {
    if (p && this.props.onItemClick) {
      // 计算移动距离
      const dx = p.x - this.lastPos.x;
      const dy = p.y - this.lastPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 如果移动距离小于5像素，认为是点击
      if (distance < 5) {
        // 计算点击位置对应的网格索引
        const containerRect = this.containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const x = p.x - containerRect.left - this.state.offset.x;
          const y = p.y - containerRect.top - this.state.offset.y;
          const gridX = Math.round(x / this.props.gridSize);
          const gridY = Math.round(y / this.props.gridSize);
          const gridIndex = this.getItemIndexForPosition(gridX, gridY);
          this.props.onItemClick(gridIndex, p);
        }
      }
    }
    
    this.setState({ isDragging: false });
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private handleMouseDown = (e: React.MouseEvent) => {
    this.handleDown({
      x: e.clientX,
      y: e.clientY,
    });
  };

  private handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    this.handleMove({
      x: e.clientX,
      y: e.clientY,
    });
  };

  private handleMouseUp = (e: React.MouseEvent) => {
    this.handleUp({ x: e.clientX, y: e.clientY });
  };

  private handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];

    if (!touch) return;

    this.handleDown({
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  private handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];

    if (!touch) return;

    e.preventDefault();
    this.handleMove({
      x: touch.clientX,
      y: touch.clientY,
    });
  };

  private handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    if (touch) {
      this.handleUp({ x: touch.clientX, y: touch.clientY });
    } else {
      this.handleUp();
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const deltaX = e.deltaX;
    const deltaY = e.deltaY;
    const newOffset = {
      x: this.state.offset.x - deltaX,
      y: this.state.offset.y - deltaY,
    };
    this.setOffsetAndNotify(newOffset);
    this.setState(
      prevState => ({
        velocity: { x: 0, y: 0 },
      }),
      this.debouncedUpdateGridItems
    );
  };

  render() {
    const { offset, isDragging, gridItems, isMoving } = this.state;
    const { gridSize, className } = this.props;

    // Get container dimensions
    const containerRect = this.containerRef.current?.getBoundingClientRect();
    const containerWidth = containerRect?.width || 0;
    const containerHeight = containerRect?.height || 0;

    return (
      <div
        ref={this.containerRef as React.RefObject<HTMLDivElement>}
        className={className}
        style={{
          position: "absolute",
          inset: 0,
          touchAction: "none",
          overflow: "hidden",
          cursor: isDragging ? "grabbing" : "grab",
        }}
        onMouseDown={this.handleMouseDown}
        onMouseMove={this.handleMouseMove}
        onMouseUp={this.handleMouseUp}
        onMouseLeave={this.handleMouseUp}
        onTouchStart={this.handleTouchStart}
        onTouchEnd={this.handleTouchEnd}
        onTouchCancel={this.handleTouchEnd}
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
                {this.props.renderItem({
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
  }
}

export default ThiingsGrid;
