import React, { useState, useRef, useEffect } from "react";

/**
 * Inline-editable task title component
 * Click to edit, blur to save, Escape to cancel
 */
export function InlineEditableTitle({
  value,
  onSave,
  onCancel,
  isEditing,
  setIsEditing,
}) {
  const inputRef = useRef(null);
  const [tempValue, setTempValue] = useState(value);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync tempValue when external value prop changes (e.g., after API response)
  useEffect(() => {
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  const handleSave = () => {
    const trimmed = tempValue.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
    onCancel?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full rounded px-1 py-0 text-sm font-medium leading-snug border border-primary/50 bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-0"
        data-testid="task-title-edit-input"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group cursor-pointer line-clamp-2 text-sm font-medium leading-snug rounded px-1 hover:bg-accent/50 transition-colors"
      title="Click to edit task title"
      data-testid="task-title-display"
    >
      {value}
      <span className="ml-1 opacity-0 group-hover:opacity-50 text-[10px] text-muted-foreground transition-opacity">
        (click to edit)
      </span>
    </div>
  );
}
