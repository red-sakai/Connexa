"use client";

import React from "react";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform";
  const variantClasses =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-105 hover:shadow-2xl"
      : "border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 hover:scale-105 hover:shadow-xl";

  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
