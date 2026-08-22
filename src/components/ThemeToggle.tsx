"use client";

import { useTheme } from "./ThemeProvider";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "dark" ? "Switch to Light theme" : "Switch to Dark theme"}
      className={`p-2 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 transition cursor-pointer ${className}`}
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-neutral-200 hover:text-white transition" />
      ) : (
        <Moon className="w-4 h-4 text-neutral-600 hover:text-black transition" />
      )}
    </button>
  );
}
