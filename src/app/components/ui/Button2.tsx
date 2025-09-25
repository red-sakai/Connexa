"use client";

import React from "react";
import Link from "next/link";

type Button2Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline";
  href?: string;
};

export default function Button2({
  variant = "primary",
  className = "",
  children,
  href,
  ...props
}: Button2Props) {
  const base =
    "px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 transform";
  const variantClasses =
    variant === "primary"
      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg hover:scale-105"
      : "border border-indigo-600 text-indigo-600 bg-transparent hover:bg-indigo-50";

  if (href) {
    return (
      <Link href={href} className={`${base} ${variantClasses} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button className={`${base} ${variantClasses} ${className}`} {...props}>
      {children}
    </button>
  );
}
