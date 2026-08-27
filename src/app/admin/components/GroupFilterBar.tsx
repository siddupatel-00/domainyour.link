"use client";

import { useState, useRef, useLayoutEffect, useEffect } from "react";
import { LinkGroup } from "@/lib/db/schema";
import { Folder, FolderPlus, Settings2, Share2, GripVertical } from "lucide-react";

interface GroupFilterBarProps {
  groups: LinkGroup[];
  selectedGroupId: number | "all";
  onSelectGroup: (groupId: number | "all") => void;
  totalLinksCount: number;
  onOpenCreateGroup: () => void;
  onOpenEditGroup: (group: LinkGroup) => void;
  onOpenShareGroup?: (group: LinkGroup) => void;
  onReorderGroups?: (reordered: LinkGroup[]) => void;
}

export function GroupFilterBar({
  groups,
  selectedGroupId,
  onSelectGroup,
  totalLinksCount,
  onOpenCreateGroup,
  onOpenEditGroup,
  onOpenShareGroup,
  onReorderGroups,
}: GroupFilterBarProps) {
  const [items, setItems] = useState<LinkGroup[]>(groups);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevPositions = useRef<Map<number, DOMRect>>(new Map());
  const isDraggingRef = useRef(false);

  // Sync external groups prop when not dragging
  useEffect(() => {
    if (!isDraggingRef.current) {
      setItems(groups);
    }
  }, [groups]);

  // FLIP Animation: Smoothly glide other items when order changes
  useLayoutEffect(() => {
    itemRefs.current.forEach((el, id) => {
      const prevRect = prevPositions.current.get(id);
      if (prevRect && el) {
        const currentRect = el.getBoundingClientRect();
        const deltaX = prevRect.left - currentRect.left;

        if (deltaX !== 0) {
          // 1. Invert: position element back at previous spot instantly
          el.style.transform = `translateX(${deltaX}px)`;
          el.style.transition = "none";

          // 2. Force reflow
          el.getBoundingClientRect();

          // 3. Play: smoothly animate to new spot
          requestAnimationFrame(() => {
            el.style.transition = "transform 260ms cubic-bezier(0.2, 0, 0.1, 1)";
            el.style.transform = "";
          });
        }
      }
    });

    // Record new positions for next mutation
    const newPositions = new Map<number, DOMRect>();
    itemRefs.current.forEach((el, id) => {
      if (el) {
        newPositions.set(id, el.getBoundingClientRect());
      }
    });
    prevPositions.current = newPositions;
  }, [items]);

  const handleDragStart = (e: React.DragEvent, id: number) => {
    isDraggingRef.current = true;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", `${id}`);

    // Capture initial positions
    const initialPositions = new Map<number, DOMRect>();
    itemRefs.current.forEach((el, key) => {
      if (el) initialPositions.set(key, el.getBoundingClientRect());
    });
    prevPositions.current = initialPositions;
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!draggedId || draggedId === targetId) return;

    setDragOverId(targetId);

    const fromIndex = items.findIndex((g) => g.id === draggedId);
    const toIndex = items.findIndex((g) => g.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
      const updated = [...items];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      setItems(updated);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    finalizeReorder();
  };

  const handleDragEnd = () => {
    finalizeReorder();
  };

  const finalizeReorder = () => {
    isDraggingRef.current = false;
    setDraggedId(null);
    setDragOverId(null);

    if (onReorderGroups) {
      onReorderGroups(items);
    }
  };

  return (
    <div className="space-y-2 font-sans">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={onOpenCreateGroup}
          className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white inline-flex items-center gap-1.5 transition cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>New Group Box</span>
        </button>
      </div>

      {/* Horizontal Group Cards / Boxes with Smooth Fluid Drag & Drop */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {/* All Links Box (Fixed at start) */}
        <button
          type="button"
          onClick={() => onSelectGroup("all")}
          className={`px-3.5 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex-shrink-0 flex items-center gap-2 border select-none ${
            selectedGroupId === "all"
              ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm font-semibold"
              : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>All Links</span>
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
              selectedGroupId === "all"
                ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
            }`}
          >
            {totalLinksCount}
          </span>
        </button>

        {/* Draggable User Groups with Smooth Sliding Animations */}
        {items.map((group) => {
          let count = 0;
          try {
            const parsed = JSON.parse(group.linkIds || "[]");
            count = Array.isArray(parsed) ? parsed.length : 0;
          } catch {}

          const isSelected = selectedGroupId === group.id;
          const isDragging = draggedId === group.id;

          return (
            <div
              key={group.id}
              ref={(el) => {
                if (el) itemRefs.current.set(group.id, el);
                else itemRefs.current.delete(group.id);
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, group.id)}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className={`inline-flex items-center rounded-xl border text-xs flex-shrink-0 group cursor-grab active:cursor-grabbing select-none transition-shadow duration-200 will-change-transform ${
                isDragging
                  ? "opacity-40 scale-95 shadow-lg ring-2 ring-black dark:ring-white z-20"
                  : "z-10"
              } ${
                isSelected
                  ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-sm font-semibold"
                  : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
              }`}
            >
              {/* Grip handle indicator */}
              <div
                className={`pl-2 pr-0.5 text-neutral-300 dark:text-neutral-600 group-hover:text-neutral-500 dark:group-hover:text-neutral-400 transition cursor-grab ${
                  isSelected ? "text-neutral-400 dark:text-neutral-500" : ""
                }`}
                title="Drag to reorder"
              >
                <GripVertical className="w-3 h-3" />
              </div>

              {/* Group selection button */}
              <button
                type="button"
                onClick={() => onSelectGroup(group.id)}
                className="pl-1 pr-2.5 py-2 flex items-center gap-2 cursor-pointer"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: group.color || "#000000" }}
                />
                <span>{group.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    isSelected
                      ? "bg-neutral-800 dark:bg-neutral-200 text-white dark:text-black"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                  }`}
                >
                  {count}
                </span>
              </button>

              {/* Share group button */}
              {onOpenShareGroup && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenShareGroup(group);
                  }}
                  title="Share group link"
                  className={`px-1.5 py-2 transition cursor-pointer opacity-70 hover:opacity-100 ${
                    isSelected
                      ? "text-white dark:text-black"
                      : "text-neutral-400 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Edit settings button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenEditGroup(group);
                }}
                title="Edit group"
                className={`pr-2.5 pl-1 py-2 transition cursor-pointer opacity-70 hover:opacity-100 ${
                  isSelected
                    ? "text-white dark:text-black"
                    : "text-neutral-400 hover:text-black dark:hover:text-white"
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {/* Empty add prompt if no custom groups */}
        {groups.length === 0 && (
          <button
            type="button"
            onClick={onOpenCreateGroup}
            className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 border border-dashed border-neutral-300 dark:border-neutral-800 transition cursor-pointer flex-shrink-0 inline-flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Create first folder box</span>
          </button>
        )}
      </div>
    </div>
  );
}
