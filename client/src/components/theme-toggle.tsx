import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={`relative h-9 w-9 rounded-full p-0 transition-all duration-300 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 ${className}`}
      aria-label={theme === "dark" ? "Passa alla modalità chiara" : "Passa alla modalità scura"}
      title={theme === "dark" ? "Modalità chiara" : "Modalità scura"}
    >
      <Sun className="h-4 w-4 text-amber-500 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 absolute" />
      <Moon className="h-4 w-4 text-amber-300 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 absolute" />
    </Button>
  );
}
