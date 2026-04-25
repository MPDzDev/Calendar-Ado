import React, { useEffect, useRef, useState } from 'react';

export default function TodoBar({
  todos = [],
  onToggleTodo,
  onDeleteTodo,
  onNoteDrop,
}) {
  const hasTodos = todos.length > 0;
  const showPopover = todos.length > 3;
  const previewTodos = todos.slice(0, showPopover ? 2 : 3);
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const trayRef = useRef(null);
  const isExpanded = (isPinnedOpen || isHovered) && !showPopover;
  const isPopoverOpen = showPopover && (isPinnedOpen || isHovered);
  const expandedWidth = todos.length > 1 ? 352 : 208;

  useEffect(() => {
    if (!showPopover && todos.length <= 3 && isPinnedOpen) {
      return;
    }
    const handlePointerDown = (event) => {
      if (!trayRef.current?.contains(event.target)) {
        setIsPinnedOpen(false);
      }
    };
    window.addEventListener('mousedown', handlePointerDown);
    return () => window.removeEventListener('mousedown', handlePointerDown);
  }, [isPinnedOpen, showPopover, todos.length]);

  const allowDrop = (e) => {
    if (e.dataTransfer.types.includes('application/x-note')) {
      e.preventDefault();
    }
  };

  const handleDrop = (e) => {
    const raw = e.dataTransfer.getData('application/x-note');
    if (!raw) return;
    e.preventDefault();
    const note = JSON.parse(raw);
    onNoteDrop && onNoteDrop(note);
  };

  return (
    <div
      ref={trayRef}
      className={`group relative z-30 flex h-9 w-20 md:w-24 items-center justify-end rounded-2xl border border-slate-200/70 bg-slate-100/45 px-2 shadow-inner transition-[width,padding,background-color,border-color] duration-200 hover:border-slate-300 hover:bg-slate-100/80 dark:border-slate-700/70 dark:bg-slate-800/35 dark:hover:border-slate-600 dark:hover:bg-slate-800/70 ${
        isExpanded ? 'pl-16' : ''
      } ${isPinnedOpen ? 'border-slate-300 bg-slate-100/80 dark:border-slate-600 dark:bg-slate-800/70' : ''}`}
      style={{ width: isExpanded ? `${expandedWidth}px` : undefined }}
      onDragOver={allowDrop}
      onDrop={handleDrop}
      onClick={() => setIsPinnedOpen((prev) => !prev)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="Drop notes here for later"
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsPinnedOpen((prev) => !prev);
        }
        if (e.key === 'Escape') {
          setIsPinnedOpen(false);
        }
      }}
    >
      <div className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 transition-opacity dark:text-slate-500 ${
        isExpanded ? 'opacity-100' : 'opacity-0'
      }`}>
        Notes
      </div>
      <div className="flex max-w-full flex-nowrap items-center gap-1.5 overflow-hidden">
        {!hasTodos && (
          <>
            <span className="h-2 w-2 rounded-full bg-slate-300/80 transition group-hover:bg-slate-400/80 dark:bg-slate-600/80 dark:group-hover:bg-slate-500/80" />
            <span className="h-2 w-2 rounded-full bg-slate-300/55 transition group-hover:bg-slate-400/60 dark:bg-slate-600/55 dark:group-hover:bg-slate-500/60" />
          </>
        )}
        {hasTodos && !showPopover && previewTodos.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`max-w-[110px] items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/90 px-2 py-1 text-[10px] text-slate-700 shadow-sm dark:border-amber-400/20 dark:bg-slate-700 dark:text-slate-100 ${
              isExpanded ? 'inline-flex' : 'hidden'
            }`}
            onClick={() => onToggleTodo && onToggleTodo(t.id)}
            title={t.text}
          >
            <span className={`truncate ${t.done ? 'line-through text-gray-500' : ''}`}>{t.text}</span>
            <span
              role="button"
              tabIndex={0}
              className="text-slate-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                if (onDeleteTodo) onDeleteTodo(t.id);
              }}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && onDeleteTodo) {
                  e.preventDefault();
                  e.stopPropagation();
                  onDeleteTodo(t.id);
                }
              }}
            >
              x
            </span>
          </button>
        ))}
        {hasTodos && (
          <span className="inline-flex rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm dark:bg-slate-700 dark:text-slate-200">
            {todos.length}
          </span>
        )}
        {!showPopover && todos.length > 3 && (
          <span className={`shrink-0 text-[10px] text-slate-400 dark:text-slate-500 ${
            isExpanded ? 'inline' : 'hidden'
          }`}>
            +{todos.length - 3}
          </span>
        )}
        <div className="h-5 w-5 rounded-full border border-dashed border-slate-300/80 bg-white/40 dark:border-slate-600/80 dark:bg-slate-700/30" />
      </div>
      {isPopoverOpen && (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mb-2 flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
              Notes
            </span>
            <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              {todos.length}
            </span>
          </div>
          <div className="max-h-48 space-y-1 overflow-y-auto pr-1 scroll-container">
            {todos.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-amber-200/70 bg-amber-50/80 px-2 py-1.5 text-[11px] text-slate-700 dark:border-amber-400/20 dark:bg-slate-800 dark:text-slate-100"
              >
                <input
                  type="checkbox"
                  checked={t.done}
                  onChange={() => onToggleTodo && onToggleTodo(t.id)}
                />
                <span className={`min-w-0 flex-1 truncate ${t.done ? 'line-through text-gray-500' : ''}`}>
                  {t.text}
                </span>
                <button
                  type="button"
                  className="text-slate-400 transition hover:text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDeleteTodo) onDeleteTodo(t.id);
                  }}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
