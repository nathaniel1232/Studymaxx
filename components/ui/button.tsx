import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-bold transition-all duration-200 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "bg-blue-600 text-white font-bold shadow-xl shadow-blue-500/40 border-2 border-blue-400/50 hover:bg-blue-500 hover:shadow-2xl hover:shadow-blue-500/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-blue-500",
        primary:
          "bg-teal-500 text-white font-bold shadow-xl shadow-teal-500/50 border-2 border-teal-300/50 hover:bg-teal-400 hover:shadow-2xl hover:shadow-teal-400/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-teal-500",
        destructive:
          "bg-rose-500 text-white font-bold shadow-xl shadow-red-500/40 border-2 border-red-400/50 hover:bg-rose-400 hover:shadow-2xl hover:shadow-red-500/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-red-500",
        secondary:
          "bg-slate-700 text-white font-bold shadow-lg shadow-slate-900/30 border-2 border-slate-600 hover:bg-slate-600 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] dark:bg-slate-600 dark:border-slate-500 dark:hover:bg-slate-500 focus-visible:ring-slate-400",
        ghost:
          "bg-white/90 text-slate-900 font-semibold shadow-md border-2 border-slate-300 hover:bg-white hover:border-blue-400 hover:text-blue-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-blue-500 dark:hover:text-blue-300 focus-visible:ring-slate-400",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline hover:text-blue-700 dark:hover:text-blue-300 shadow-none",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-md gap-1.5 px-4 text-xs",
        lg: "h-14 rounded-md px-8 text-base",
        xl: "h-16 rounded-md px-10 text-lg",
        icon: "size-10 rounded-md",
        "icon-sm": "size-8 rounded-md",
        "icon-lg": "size-12 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
