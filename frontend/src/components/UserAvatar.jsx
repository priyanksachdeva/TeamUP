import React from "react";
import { initials, avatarColor } from "../lib/taskHelpers";

export default function UserAvatar({ user, size = "sm", className = "" }) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  const name = user?.name || user?.email || "?";
  return (
    <div
      title={name}
      className={`${sizes[size]} ${avatarColor(name)} ${className} inline-flex items-center justify-center rounded-full border border-border font-medium font-display`}
      data-testid="user-avatar"
    >
      {initials(name)}
    </div>
  );
}
