import React, { useState, useRef, useEffect, ReactNode } from 'react';

interface ResizablePanelGroupProps {
  direction: 'horizontal' | 'vertical';
  className?: string;
  children: ReactNode;
}

interface ResizablePanelProps {
  defaultSize?: number;
  minSize?: number;
  className?: string;
  children: ReactNode;
}

interface ResizableHandleProps {
  withHandle?: boolean;
}

export const ResizablePanelGroup: React.FC<ResizablePanelGroupProps> = ({
  direction,
  className = '',
  children
}) => {
  const [panels, setPanels] = useState<Array<{ size: number; minSize: number }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef(0);
  const startSizes = useRef<number[]>([]);

  useEffect(() => {
    const panelElements = containerRef.current?.children;
    if (!panelElements) return;

    const panelCount = Array.from(panelElements).filter(
      el => el.classList.contains('resizable-panel')
    ).length;

    if (panelCount > 0 && panels.length === 0) {
      const defaultSize = 100 / panelCount;
      setPanels(Array(panelCount).fill({ size: defaultSize, minSize: 20 }));
    }
  }, [children, panels.length]);

  const handleMouseDown = (e: React.MouseEvent, panelIndex: number) => {
    e.preventDefault();
    isDragging.current = true;
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    startSizes.current = [...panels.map(p => p.size)];

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - startPos.current;
      const containerSize = direction === 'horizontal' 
        ? containerRef.current.offsetWidth 
        : containerRef.current.offsetHeight;
      
      const deltaPercent = (delta / containerSize) * 100;

      const newPanels = [...panels];
      const leftPanel = newPanels[panelIndex];
      const rightPanel = newPanels[panelIndex + 1];

      if (leftPanel && rightPanel) {
        const newLeftSize = Math.max(
          leftPanel.minSize,
          Math.min(100 - rightPanel.minSize, leftPanel.size + deltaPercent)
        );
        const newRightSize = 100 - newLeftSize;

        newPanels[panelIndex] = { ...leftPanel, size: newLeftSize };
        newPanels[panelIndex + 1] = { ...rightPanel, size: newRightSize };
        setPanels(newPanels);
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`resizable-panel-group ${direction} ${className}`}
      style={{ display: 'flex', flexDirection: direction === 'horizontal' ? 'row' : 'column', height: '100%' }}
    >
      {React.Children.map(children, (child, index) => {
        if (React.isValidElement(child)) {
          if (child.type === ResizableHandle) {
            return React.cloneElement(child, {
              onMouseDown: (e: React.MouseEvent) => handleMouseDown(e, index - 1)
            } as any);
          } else if (child.type === ResizablePanel) {
            const panelSize = panels[index]?.size || 50;
            return (
              <div
                key={index}
                className="resizable-panel overflow-y-scroll"
                style={{
                  [direction === 'horizontal' ? 'width' : 'height']: `${panelSize}%`,
                  flexShrink: 0
                }}
              >
                {child}
              </div>
            );
          }
        }
        return child;
      })}
    </div>
  );
};

export const ResizablePanel: React.FC<ResizablePanelProps> = ({
  defaultSize = 50,
  minSize = 20,
  className = '',
  children
}) => {
  return (
    <div className={`resizable-panel ${className}`}>
      {children}
    </div>
  );
};

export const ResizableHandle: React.FC<ResizableHandleProps & { onMouseDown?: (e: React.MouseEvent) => void }> = ({
  withHandle = false,
  onMouseDown
}) => {
  return (
    <div
      className={`resizable-handle ${withHandle ? 'with-handle' : ''}`}
      onMouseDown={onMouseDown}
      style={{
        width: withHandle ? '12px' : '4px',
        height: withHandle ? '12px' : '4px',
        backgroundColor: withHandle ? '#e5e7eb' : 'transparent',
        cursor: 'col-resize',
        position: 'relative',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {withHandle && (
        <div
          style={{
            width: '4px',
            height: '20px',
            backgroundColor: '#9ca3af',
            borderRadius: '2px'
          }}
        />
      )}
    </div>
  );
};

