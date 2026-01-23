"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Types matching CardModal
type ChecklistItem = { 
  id: string; 
  title: string; 
  completed: boolean; 
  dueDate?: string | null; 
  order?: number 
};

type Checklist = { 
  id: string; 
  title: string; 
  items: ChecklistItem[] 
};

interface ChecklistItemsProps {
  checklist: Checklist;
  onUpdateItem: (itemId: string, data: Partial<ChecklistItem>) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (checklistId: string, title: string) => void;
  onReorderItems: (checklistId: string, newItems: ChecklistItem[]) => void;
}

interface SortableItemProps {
  item: ChecklistItem;
  onUpdate: (id: string, data: Partial<ChecklistItem>) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  onStopEditing: () => void;
  onEnter: () => void;
}

function SortableItem({ 
  item, 
  onUpdate, 
  onDelete,
  isEditing,
  onEdit,
  onStopEditing,
  onEnter
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Local state for title to avoid cursor jumping
  const [title, setTitle] = useState(item.title);
  
  useEffect(() => {
    if (!isEditing) setTitle(item.title);
  }, [item.title, isEditing]);

  const save = () => {
    if (title.trim() !== item.title) {
        onUpdate(item.id, { title: title.trim() });
    }
  };

  const handleBlur = () => {
    save();
    onStopEditing();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
        e.preventDefault();
        save();
        onEnter();
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="group flex items-center justify-between gap-2 rounded px-2 py-1 hover:bg-foreground/5 my-1">
       {/* Drag Handle */}
       <div {...attributes} {...listeners} className="cursor-grab text-foreground/30 hover:text-foreground/60 flex-shrink-0">
         <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="9" r="2" />
            <circle cx="9" cy="15" r="2" />
            <circle cx="15" cy="9" r="2" />
            <circle cx="15" cy="15" r="2" />
         </svg>
       </div>
       
       {/* Checkbox */}
       <input 
         type="checkbox" 
         checked={item.completed} 
         onChange={(e) => onUpdate(item.id, { completed: e.target.checked })}
         className="cursor-pointer flex-shrink-0 w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" 
       />
       
       {/* Title Input/Display */}
       <div className="flex-1 min-w-0">
         {isEditing ? (
            <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="w-full text-sm bg-background border border-primary/50 rounded px-1 py-0.5 outline-none"
            />
         ) : (
            <div 
                onClick={onEdit} 
                className={`text-sm cursor-text break-words px-1 py-0.5 rounded hover:bg-foreground/5 ${item.completed ? "line-through text-foreground/50" : ""}`}
            >
                {item.title}
            </div>
         )}
       </div>

       {/* Due Date */}
       <div className="flex-shrink-0 relative group/date">
            <input 
                type="date" 
                value={item.dueDate ? new Date(item.dueDate).toISOString().split('T')[0] : ""} 
                onChange={(e) => onUpdate(item.id, { dueDate: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={`text-xs bg-transparent border-none p-0 cursor-pointer ${!item.dueDate ? 'w-6 opacity-0' : 'w-auto'}`}
                title="Set due date"
            />
            {!item.dueDate && (
                 <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                 </div>
            )}
       </div>

       {/* Delete Button */}
       <button 
        onClick={() => onDelete(item.id)} 
        className="opacity-0 group-hover:opacity-100 text-foreground/50 hover:text-red-500 transition-opacity flex-shrink-0 p-1"
       >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
       </button>
    </div>
  );
}

export default function ChecklistItems({ checklist, onUpdateItem, onDeleteItem, onAddItem, onReorderItems }: ChecklistItemsProps) {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Sort items by order
    const sortedItems = [...checklist.items].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const newItemInputRef = useRef<HTMLInputElement>(null);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
            const newIndex = sortedItems.findIndex((item) => item.id === over.id);
            
            const newItems = arrayMove(sortedItems, oldIndex, newIndex);
            
            // Recalculate orders
            const updatedItems = newItems.map((item, index) => ({
                ...item,
                order: index
            }));

            onReorderItems(checklist.id, updatedItems);
        }
    };

    const [newItemTitle, setNewItemTitle] = useState("");

    const handleAddItem = () => {
        if (!newItemTitle.trim()) return;
        onAddItem(checklist.id, newItemTitle);
        setNewItemTitle("");
    };

    const handleItemEnter = (itemId: string) => {
        const index = sortedItems.findIndex(i => i.id === itemId);
        if (index !== -1 && index < sortedItems.length - 1) {
            // Edit next item
            setEditingItemId(sortedItems[index + 1].id);
        } else {
            // Last item, focus new item input
            setEditingItemId(null);
            setTimeout(() => {
                 newItemInputRef.current?.focus();
            }, 0);
        }
    };

    return (
        <div className="mt-2">
            <DndContext 
                sensors={sensors} 
                collisionDetection={closestCenter} 
                onDragEnd={handleDragEnd}
            >
                <SortableContext 
                    items={sortedItems.map(i => i.id)} 
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1">
                        {sortedItems.map((item) => (
                            <SortableItem 
                                key={item.id} 
                                item={item} 
                                onUpdate={onUpdateItem} 
                                onDelete={onDeleteItem} 
                                isEditing={editingItemId === item.id}
                                onEdit={() => setEditingItemId(item.id)}
                                onStopEditing={() => {
                                    if (editingItemId === item.id) setEditingItemId(null);
                                }}
                                onEnter={() => handleItemEnter(item.id)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
            
            <div className="mt-2 pl-7 pr-2">
                <input
                    ref={newItemInputRef}
                    placeholder="Add an item"
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="w-full text-xs px-2 py-1.5 border border-transparent hover:border-foreground/10 focus:border-primary rounded bg-foreground/5 focus:bg-background transition-colors outline-none"
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleAddItem();
                        }
                    }}
                />
            </div>
        </div>
    );
}
