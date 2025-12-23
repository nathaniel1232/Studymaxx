"use client";

interface ArrowIconProps {
  direction?: "right" | "left" | "up" | "down";
  size?: number;
  className?: string;
}

export default function ArrowIcon({ direction = "right", size = 20, className = "" }: ArrowIconProps) {
  const getRotation = () => {
    switch (direction) {
      case "left": return "rotate-180";
      case "up": return "-rotate-90";
      case "down": return "rotate-90";
      default: return "";
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`arrow-icon transition-transform duration-200 ${getRotation()} ${className}`}
      style={{ minWidth: size, minHeight: size }}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// Simple chevron for navigation
export function ChevronIcon({ direction = "right", size = 20, className = "" }: ArrowIconProps) {
  const getRotation = () => {
    switch (direction) {
      case "left": return "rotate-180";
      case "up": return "-rotate-90";
      case "down": return "rotate-90";
      default: return "";
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`chevron-icon transition-transform duration-200 ${getRotation()} ${className}`}
      style={{ minWidth: size, minHeight: size }}
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
