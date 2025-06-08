import React, { useState, useRef, useEffect } from 'react';
import ItemBubble from './ItemBubble';
import { lightenColor } from '../utils/color';

export default function Calendar({
  blocks,
  onAdd,
  settings,
  onDelete,
  weekStart,
  onUpdate,
  onTimeChange,
  items,
  projectColors = {},
  onCommentDrop,
  lockedDays = {},
  setLockedDays,
}) {
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = settings.workDays;
  const weekDates = days.map((d) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    return date;
  });
  const hours = Array.from(
    { length: settings.endHour - settings.startHour },
    (_, i) => (i + settings.startHour).toString().padStart(2, '0')
  );
  const [hourHeight, setHourHeight] = useState(40); // px height for each hour block
  const blockMinutes = settings.blockMinutes || 15;
  const [activeDay, setActiveDay] = useState(null);
  const [form, setForm] = useState({
    start: `${String(settings.startHour).padStart(2, '0')}:00`,
    end: `${String(settings.startHour + 1).padStart(2, '0')}:00`,
    note: '',
    workItem: '',
  });
  const [drag, setDrag] = useState(null); // { day, start, end }
  const [hoveredId, setHoveredId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [taskSelect, setTaskSelect] = useState(null); // {blockId, parent, tasks}
  const [blockDrag, setBlockDrag] = useState(null); // {id, mode, startRel, endRel, dayIndex, rects, minuteHeight, offsetY}
  const [extendDrag, setExtendDrag] = useState(null); // {id, direction, startIndex, dayIndex}
  const [hoverDay, setHoverDay] = useState(null);
  const dayRefs = useRef({});

  useEffect(() => {
    const updateHeight = () => {
      const minHeight = window.innerHeight * 0.6;
      const hh = Math.max(minHeight / hours.length, 40);
      setHourHeight(hh);
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [hours.length]);

  useEffect(() => {
    if (!drag) return;
    const cancel = (e) => {
      if (e.button === 2) {
        e.preventDefault();
        setDrag(null);
      }
    };
    window.addEventListener('mousedown', cancel);
    window.addEventListener('contextmenu', cancel);
    return () => {
      window.removeEventListener('mousedown', cancel);
      window.removeEventListener('contextmenu', cancel);
    };
  }, [drag]);

  const findItem = (id) => items?.find((i) => i.id === id);
  const getDescendantTasks = (id) => {
    const tasks = [];
    const stack = items?.filter((i) => i.parentId === id) || [];
    while (stack.length) {
      const cur = stack.pop();
      if (cur.type?.toLowerCase() === 'task') tasks.push(cur);
      stack.push(...(items?.filter((i) => i.parentId === cur.id) || []));
    }
    return tasks;
  };
  const findDisplayItem = (item) => {
    if (item.type?.toLowerCase() !== 'task') return item;
    let cur = item;
    while (cur.parentId) {
      const parent = findItem(cur.parentId);
      if (!parent) break;
      if (parent.type?.toLowerCase() !== 'task') return parent;
      cur = parent;
    }
    return item;
  };

  const dayKey = (idx) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + idx);
    return d.toISOString().split('T')[0];
  };

  const isDayLocked = (idx) => lockedDays[dayKey(idx)];

  const toggleDayLock = (idx) => {
    if (!setLockedDays) return;
    const key = dayKey(idx);
    setLockedDays((prev) => {
      const next = { ...prev };
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const addBlock = (e) => {
    e.preventDefault();
    if (activeDay === null) return;
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + parseInt(activeDay));
    const endDate = new Date(startDate);
    startDate.setHours(parseInt(form.start.split(':')[0]), parseInt(form.start.split(':')[1]));
    endDate.setHours(parseInt(form.end.split(':')[0]), parseInt(form.end.split(':')[1]));
    onAdd({
      id: Date.now(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      note: form.note,
      workItem: form.workItem,
      itemId: null,
      comments: [],
    });
    setForm({
      start: `${String(settings.startHour).padStart(2, '0')}:00`,
      end: `${String(settings.startHour + 1).padStart(2, '0')}:00`,
      note: '',
      workItem: '',
    });
    setActiveDay(null);
  };

  const startDrag = (e, dayIdx) => {
    if (e.button !== 0) return; // only start on left click
    // ignore drags that originate from interactive elements or existing blocks
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('form') ||
      e.target.closest('.work-block')
    ) {
      return;
    }
    if (isDayLocked(dayIdx)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const minuteHeight = rect.height / (hours.length * 60);
    const rawStart = (e.clientY - rect.top) / minuteHeight;
    const start = Math.max(0, Math.floor(rawStart / blockMinutes) * blockMinutes);
    setDrag({ day: dayIdx, start, end: start + blockMinutes, rect, minuteHeight });
  };

  const onDrag = (e) => {
    if (!drag) return;
    let y = e.clientY - drag.rect.top;
    if (y < 0 || y > drag.rect.height) return;
    y = Math.max(0, Math.min(y, drag.rect.height));
    const cur = Math.floor(y / drag.minuteHeight / blockMinutes) * blockMinutes + blockMinutes;
    const maxMinutes = hours.length * 60;
    const end = Math.min(maxMinutes, Math.max(cur, drag.start + blockMinutes));
    if (end !== drag.end) setDrag({ ...drag, end });
  };

  const endDrag = (dayIdx, pos) => {
    if (!drag) return;
    if (drag.day !== dayIdx) {
      setDrag(null);
      return;
    }
    if (isDayLocked(dayIdx)) {
      setDrag(null);
      return;
    }
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dayIdx);
    const endDate = new Date(startDate);
    startDate.setHours(
      settings.startHour + Math.floor(drag.start / 60),
      drag.start % 60,
      0,
      0
    );
    let endMinutes = drag.end;
    if (typeof pos === 'number') {
      if (pos < 0) endMinutes = 0;
      else if (pos > drag.rect.height) endMinutes = hours.length * 60;
    }
    endDate.setHours(
      settings.startHour + Math.floor(endMinutes / 60),
      endMinutes % 60,
      0,
      0
    );
    onAdd({
      id: Date.now(),
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      note: '',
      workItem: '',
      comments: [],
    });
    setDrag(null);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => onDrag(e);
    const up = (e) => {
      const pos = e.clientY - drag.rect.top;
      endDrag(drag.day, pos);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag]);

  const duplicateBlockToDay = (block, targetIndex) => {
    const weekOffset = Math.floor(targetIndex / days.length);
    const indexInWeek = ((targetIndex % days.length) + days.length) % days.length;
    if (indexInWeek < 0 || indexInWeek >= days.length) return;
    const dayIdx = days[indexInWeek];
    if (isDayLocked(dayIdx)) return;
    const start = new Date(block.start);
    const end = new Date(block.end);
    const startDate = new Date(weekStart);
    startDate.setDate(weekStart.getDate() + dayIdx + weekOffset * 7);
    startDate.setHours(start.getHours(), start.getMinutes(), 0, 0);
    const endDate = new Date(weekStart);
    endDate.setDate(weekStart.getDate() + dayIdx + weekOffset * 7);
    endDate.setHours(end.getHours(), end.getMinutes(), 0, 0);
    onAdd({
      id: Date.now() + targetIndex,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      note: block.note,
      workItem: block.workItem,
      taskId: block.taskId,
      itemId: block.itemId,
      comments: [...(block.comments || [])],
    });
  };

  const startBlockDrag = (e, block, dayIdx) => {
    if (
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('form')
    ) {
      return;
    }
    if (isDayLocked(dayIdx)) return;
    e.preventDefault();
    const rects = days.map((d) => dayRefs.current[d].getBoundingClientRect());
    const minuteHeight = rects[dayIdx].height / (hours.length * 60);
    const bounds = e.currentTarget.getBoundingClientRect();
    const offsetY = e.clientY - bounds.top;
    const offsetX = e.clientX - bounds.left;
    let mode = 'move';
    if (offsetY < 5) mode = 'resize-top';
    else if (offsetY > bounds.height - 5) mode = 'resize-bottom';
    else if (offsetX < 5) mode = 'extend-left';
    else if (offsetX > bounds.width - 5) mode = 'extend-right';
    const start = new Date(block.start);
    const end = new Date(block.end);
    const startRel = start.getHours() * 60 + start.getMinutes() - settings.startHour * 60;
    const endRel = end.getHours() * 60 + end.getMinutes() - settings.startHour * 60;
    if (mode === 'extend-left' || mode === 'extend-right') {
      setExtendDrag({
        id: block.id,
        direction: mode === 'extend-right' ? 1 : -1,
        startIndex: days.indexOf(dayIdx),
        dayIndex: days.indexOf(dayIdx),
        startRel,
        endRel,
        rects,
      });
    } else {
      setBlockDrag({
        id: block.id,
        mode,
        startRel,
        endRel,
        dayIndex: days.indexOf(dayIdx),
        rects,
        minuteHeight,
        offsetY,
      });
    }
  };

  useEffect(() => {
    if (!blockDrag) return;
    const move = (e) => {
      let dayIndex = blockDrag.dayIndex;
      for (let i = 0; i < blockDrag.rects.length; i++) {
        const r = blockDrag.rects[i];
        if (e.clientX >= r.left && e.clientX <= r.right) {
          dayIndex = i;
          break;
        }
      }

      const rect = blockDrag.rects[dayIndex];
      let startRel = blockDrag.startRel;
      let endRel = blockDrag.endRel;

      if (blockDrag.mode === 'move') {
        const pos =
          e.clientY - rect.top - blockDrag.offsetY;
        const raw = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        const length = endRel - startRel;
        startRel = Math.min(Math.max(0, raw), hours.length * 60 - length);
        endRel = startRel + length;
      } else if (blockDrag.mode === 'resize-top') {
        const pos = e.clientY - rect.top;
        startRel = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        if (startRel < 0) startRel = 0;
        if (endRel - startRel < blockMinutes) startRel = endRel - blockMinutes;
      } else if (blockDrag.mode === 'resize-bottom') {
        const pos = e.clientY - rect.top;
        endRel = Math.floor(pos / blockDrag.minuteHeight / blockMinutes) * blockMinutes;
        const max = hours.length * 60;
        if (endRel > max) endRel = max;
        if (endRel - startRel < blockMinutes) endRel = startRel + blockMinutes;
      }

      setBlockDrag({ ...blockDrag, startRel, endRel, dayIndex });
    };

    const up = () => {
      const startAbs = blockDrag.startRel + settings.startHour * 60;
      const endAbs = blockDrag.endRel + settings.startHour * 60;
      const dayIdx = days[blockDrag.dayIndex];
      if (isDayLocked(dayIdx)) {
        setBlockDrag(null);
        return;
      }
      const startDate = new Date(weekStart);
      startDate.setDate(weekStart.getDate() + dayIdx);
      startDate.setHours(Math.floor(startAbs / 60), startAbs % 60, 0, 0);
      const endDate = new Date(weekStart);
      endDate.setDate(weekStart.getDate() + dayIdx);
      endDate.setHours(Math.floor(endAbs / 60), endAbs % 60, 0, 0);
      if (onTimeChange)
        onTimeChange(blockDrag.id, startDate.toISOString(), endDate.toISOString());
      setBlockDrag(null);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [blockDrag, blockMinutes, days, onTimeChange, settings.startHour, weekStart, hours.length]);

  useEffect(() => {
    if (!extendDrag) return;
    const move = (e) => {
      let dayIndex = extendDrag.dayIndex;
      for (let i = 0; i < extendDrag.rects.length; i++) {
        const r = extendDrag.rects[i];
        if (e.clientX >= r.left && e.clientX <= r.right) {
          dayIndex = i;
          break;
        }
      }
      setExtendDrag({ ...extendDrag, dayIndex });
    };

    const up = () => {
      const block = blocks.find((b) => b.id === extendDrag.id);
      if (block) {
        const startAbs = extendDrag.startRel + settings.startHour * 60;
        const endAbs = extendDrag.endRel + settings.startHour * 60;
        const step = extendDrag.direction;
        for (
          let i = extendDrag.startIndex + step;
          step > 0 ? i <= extendDrag.dayIndex : i >= extendDrag.dayIndex;
          i += step
        ) {
          if (i < 0 || i >= days.length) continue;
          const dayIdx = days[i];
          if (isDayLocked(dayIdx)) continue;
          const startDate = new Date(weekStart);
          startDate.setDate(weekStart.getDate() + dayIdx);
          startDate.setHours(Math.floor(startAbs / 60), startAbs % 60, 0, 0);
          const endDate = new Date(weekStart);
          endDate.setDate(weekStart.getDate() + dayIdx);
          endDate.setHours(Math.floor(endAbs / 60), endAbs % 60, 0, 0);
          onAdd({
            id: Date.now() + i,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            note: block.note,
            workItem: block.workItem,
            taskId: block.taskId,
            itemId: block.itemId,
            comments: [...(block.comments || [])],
          });
        }
      }
      setExtendDrag(null);
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [extendDrag, onAdd, blocks, days, settings.startHour, weekStart]);

  const handleDrop = (e, blockId) => {
    e.preventDefault();
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      const dIdx = (new Date(block.start).getDay() + 6) % 7;
      if (isDayLocked(dIdx)) return;
    }
    if (e.dataTransfer.types.includes('application/x-note')) {
      const rawNote = e.dataTransfer.getData('application/x-note');
      if (!rawNote) return;
      const note = JSON.parse(rawNote);
      if (onCommentDrop) onCommentDrop(blockId, note);
      return;
    }
    const raw = e.dataTransfer.getData('application/x-work-item');
    if (!raw) return;
    const item = JSON.parse(raw);
    if (!item) return;
    if (item.type?.toLowerCase() === 'task') {
      const display = findDisplayItem(item);
      if (onUpdate)
        onUpdate(blockId, {
          workItem: display.title,
          taskId: item.id,
          itemId: display.id,
        });
    } else {
      const tasks = getDescendantTasks(item.id);
      if (tasks.length === 1) {
        if (onUpdate)
          onUpdate(blockId, {
            workItem: item.title,
            taskId: tasks[0].id,
            itemId: item.id,
          });
      } else if (tasks.length > 0) {
        setTaskSelect({ blockId, parent: item, tasks });
      } else {
        const org = settings.azureOrg;
        const url = org
          ? `https://dev.azure.com/${org}/_workitems/edit/${item.id}`
          : `https://dev.azure.com/_workitems/edit/${item.id}`;
        const msg =
          'Please create a task under this work item to log your time.';
        if (window.api && window.api.openWorkItems) {
          window.api.openWorkItems([
            { id: item.id, hours: 0, url, days: {}, message: msg },
          ]);
        } else {
          window.open(url, '_blank');
          window.alert(msg);
        }
      }
    }
  };

  return (
    <div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
        {days.map((dayIdx, idx) => (
          <div
            key={dayIdx}
            ref={(el) => (dayRefs.current[dayIdx] = el)}
            className="bg-white rounded-md shadow p-3 relative"
            onMouseEnter={() => setHoverDay(dayIdx)}
            onMouseLeave={() => setHoverDay((h) => (h === dayIdx ? null : h))}
            onDoubleClick={(e) => {
              if (
                e.target.closest('button') ||
                e.target.closest('input') ||
                e.target.closest('form')
              ) {
                return;
              }
              if (!isDayLocked(dayIdx)) setActiveDay(dayIdx);
            }}
          >
            {isDayLocked(dayIdx) && (
              <div className="absolute inset-0 bg-gray-500 dark:bg-gray-600 opacity-10 pointer-events-none z-20" />
            )}
            {hoverDay === dayIdx && (
              <button
                className="absolute top-0 right-0 p-1 text-sm"
                onClick={() => toggleDayLock(dayIdx)}
              >
                {isDayLocked(dayIdx) ? '🔒' : '🔓'}
              </button>
            )}
            <h2 className="font-semibold mb-2 text-center bg-blue-600 dark:bg-blue-700 text-white rounded py-1">
              {weekDays[dayIdx]}
            </h2>
            <div
              className="relative select-none"
              style={{ height: `${hours.length * hourHeight}px` }}
              onMouseDown={(e) => {
                if (!isDayLocked(dayIdx)) startDrag(e, dayIdx);
              }}
              onMouseMove={onDrag}
              onMouseUp={(e) => {
                const pos = e.clientY - e.currentTarget.getBoundingClientRect().top;
                endDrag(dayIdx, pos);
              }}
            >
              <div className="absolute inset-0 pointer-events-none flex flex-col">
                {hours.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 border-t border-gray-200 text-[10px] text-gray-400"
                  >
                    {h}:00
                  </div>
                ))}
              </div>
              <div
                className="absolute left-0 right-0 bg-yellow-100 text-center text-xs pointer-events-none"
                style={{
                  top: (settings.lunchStart - settings.startHour) * hourHeight,
                  height: (settings.lunchEnd - settings.lunchStart) * hourHeight,
                  lineHeight: `${(settings.lunchEnd - settings.lunchStart) * hourHeight}px`,
                }}
              >
                Lunch
              </div>
              <div className="relative z-10 w-full h-full">
                {blocks
                  .filter((b) => {
                    if (blockDrag && blockDrag.id === b.id) {
                      return days[blockDrag.dayIndex] === dayIdx;
                    }
                    const date = new Date(b.start);
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(weekStart.getDate() + dayIdx);
                    return date.toDateString() === dayDate.toDateString();
                  })
                  .map((b) => {
                    const start = new Date(b.start);
                    const end = new Date(b.end);
                    let startMinutes = start.getHours() * 60 + start.getMinutes();
                    let endMinutes = end.getHours() * 60 + end.getMinutes();
                    if (blockDrag && blockDrag.id === b.id) {
                      startMinutes = settings.startHour * 60 + blockDrag.startRel;
                      endMinutes = settings.startHour * 60 + blockDrag.endRel;
                    }
                    const top =
                      (startMinutes - settings.startHour * 60) * (hourHeight / 60);
                    const height = (endMinutes - startMinutes) * (hourHeight / 60);
                    const highlight = hoveredId === b.id;
                    const item = b.itemId
                      ? findItem(b.itemId)
                      : b.taskId
                      ? findItem(b.taskId)
                      : null;
                    const projectColor = item ? projectColors[item.project] : null;
                    return (
                      <div
                        key={b.id}
                        onMouseEnter={() => {
                          if (!isDayLocked(dayIdx)) setHoveredId(b.id);
                        }}
                        onMouseLeave={(e) => {
                          setHoveredId(null);
                          if (confirmDeleteId !== b.id) setConfirmDeleteId(null);
                          e.currentTarget.style.cursor = 'default';
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleDrop(e, b.id)}
                        onMouseDown={(e) => {
                          if (!isDayLocked(dayIdx)) startBlockDrag(e, b, dayIdx);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const bounds = e.currentTarget.getBoundingClientRect();
                          const offsetX = e.clientX - bounds.left;
                          const idx = days.indexOf(dayIdx);
                          if (offsetX > bounds.width - 5) {
                            duplicateBlockToDay(b, idx + 1);
                          } else if (offsetX < 5) {
                            duplicateBlockToDay(b, idx - 1);
                          }
                        }}
                        onMouseMove={(e) => {
                          const bounds = e.currentTarget.getBoundingClientRect();
                          const offsetY = e.clientY - bounds.top;
                          const offsetX = e.clientX - bounds.left;
                          if (isDayLocked(dayIdx)) {
                            e.currentTarget.style.cursor = 'default';
                            return;
                          }
                          if (offsetY < 5 || offsetY > bounds.height - 5) {
                            e.currentTarget.style.cursor = 'ns-resize';
                          } else if (offsetX < 5 || offsetX > bounds.width - 5) {
                            e.currentTarget.style.cursor = 'ew-resize';
                          } else {
                            e.currentTarget.style.cursor = 'move';
                          }
                        }}
                        className={`work-block absolute left-0 right-0 p-1 border rounded-md overflow-hidden select-none text-[10px] leading-tight shadow-sm ${b.taskId ? 'border-gray-300 dark:border-gray-500' : 'bg-gray-100 dark:bg-gray-600 border-gray-300 dark:border-gray-500'} ${b.taskId && b.itemId ? 'border-yellow-400' : ''} ${highlight ? 'ring-2 ring-blue-400' : ''}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          borderLeft: projectColor ? `4px solid ${projectColor}` : undefined,
                          backgroundColor: b.taskId
                            ? projectColor
                              ? lightenColor(projectColor, 70)
                              : '#e5e7eb'
                            : undefined,
                        }}
                      >
                        <div className="text-[10px]">
                          {(() => {
                            const d = new Date(start);
                            if (blockDrag && blockDrag.id === b.id) {
                              d.setHours(
                                settings.startHour + Math.floor(blockDrag.startRel / 60),
                                blockDrag.startRel % 60,
                                0,
                                0
                              );
                            }
                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}{' '}
                          -{' '}
                          {(() => {
                            const d = new Date(end);
                            if (blockDrag && blockDrag.id === b.id) {
                              d.setHours(
                                settings.startHour + Math.floor(blockDrag.endRel / 60),
                                blockDrag.endRel % 60,
                                0,
                                0
                              );
                            }
                            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          })()}
                        </div>
                        <div className="text-[10px] flex flex-col gap-1">
                          {(() => {
                            const item = b.itemId ? findItem(b.itemId) : null;
                            const task = b.taskId ? findItem(b.taskId) : null;
                            const hasParent = item && task && item.id !== task.id;
                            if (item) {
                              return (
                                <div className="flex flex-col gap-1">
                                  <ItemBubble item={item} full showArea />
                                  {hasParent && (
                                    <div className="pl-2">
                                      <ItemBubble item={task} showArea />
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return task ? <ItemBubble item={task} showArea /> : null;
                          })()}
                          {!b.itemId && b.workItem && (
                            <span
                              className="px-1 italic truncate"
                              title={b.workItem}
                            >
                              {b.workItem}
                            </span>
                          )}
                          {b.note && (
                            <span className="truncate" title={b.note}>
                              {b.note}
                            </span>
                          )}
                          {b.comments && b.comments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {b.comments.map((c, idx) => (
                                <span key={idx} className="border px-0.5 text-[9px]">
                                  {c}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {highlight && confirmDeleteId !== b.id && !isDayLocked(dayIdx) && (
                          <button
                            className="absolute bottom-0 right-0 p-1 text-red-600 text-xs bg-yellow-50 dark:bg-gray-800"
                            onClick={() => setConfirmDeleteId(b.id)}
                          >
                            🗑
                          </button>
                        )}
                        {confirmDeleteId === b.id && !isDayLocked(dayIdx) && (
                          <div className="absolute bottom-0 right-0 flex space-x-1 text-xs">
                            <button
                              className="px-1 bg-red-500 text-white"
                              onClick={() => {
                                if (onDelete) onDelete(b.id);
                                setConfirmDeleteId(null);
                                setHoveredId(null);
                              }}
                            >
                              Confirm?
                            </button>
                            <button
                              className="px-1 bg-gray-300 dark:bg-gray-600"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              x
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                {activeDay === dayIdx && !isDayLocked(dayIdx) && (
                  <form
                    onSubmit={addBlock}
                    className="absolute top-0 left-0 bg-white dark:bg-gray-800 border p-2 space-y-1 z-20 shadow rounded"
                  >
                    <input
                      type="time"
                      step={blockMinutes * 60}
                      value={form.start}
                      onChange={(e) => setForm({ ...form, start: e.target.value })}
                      className="border"
                    />
                    <input
                      type="time"
                      step={blockMinutes * 60}
                      value={form.end}
                      onChange={(e) => setForm({ ...form, end: e.target.value })}
                      className="border"
                    />
                    <input
                      type="text"
                      placeholder="Work item"
                      value={form.workItem}
                      onChange={(e) =>
                        setForm({ ...form, workItem: e.target.value })
                      }
                      className="border"
                    />
                    <input
                      type="text"
                      placeholder="Note"
                      value={form.note}
                      onChange={(e) => setForm({ ...form, note: e.target.value })}
                      className="border"
                    />
                    <div className="flex space-x-1">
                      <button
                        type="submit"
                        className="px-2 py-1 bg-blue-500 text-white text-xs"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDay(null)}
                        className="px-2 py-1 bg-gray-300 dark:bg-gray-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
              {drag && drag.day === dayIdx && (
                <div
                  className="absolute left-0 right-0 bg-blue-300 opacity-50 pointer-events-none"
                  style={{
                    top: drag.start * drag.minuteHeight,
                    height: (drag.end - drag.start) * drag.minuteHeight,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      {taskSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-yellow-50 dark:bg-gray-800 dark:text-white p-4 max-h-64 overflow-y-auto">
            <h3 className="font-semibold mb-2">Select Task for {taskSelect.parent.title}</h3>
            <ul>
              {taskSelect.tasks.map((t) => (
                <li
                  key={t.id}
                  className="p-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                  onClick={() => {
                    if (onUpdate)
                      onUpdate(taskSelect.blockId, {
                        workItem: taskSelect.parent.title,
                        taskId: t.id,
                        itemId: taskSelect.parent.id,
                      });
                    setTaskSelect(null);
                  }}
                >
                  {t.id} {t.title}
                </li>
              ))}
            </ul>
            <button className="mt-2 px-2 py-1 bg-gray-300 dark:bg-gray-600" onClick={() => setTaskSelect(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
