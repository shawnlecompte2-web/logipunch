import { useState, useRef, useCallback } from "react";
import { RefreshCw } from "lucide-react";

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const threshold = 72;

  const handleTouchStart = useCallback((e) => {
    const el = e.currentTarget;
    if (el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPullDistance(Math.min(delta * 0.45, threshold + 16));
  }, [threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold) {
      setRefreshing(true);
      setPullDistance(0);
      await onRefresh();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  }, [pullDistance, threshold, onRefresh]);

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: refreshing ? 48 : pullDistance }}
      >
        <RefreshCw
          size={20}
          className={`text-green-400 ${refreshing ? "animate-spin" : "transition-transform"}`}
          style={{ transform: refreshing ? "none" : `rotate(${(pullDistance / threshold) * 200}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}