import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-bold transition-all duration-200 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: 
          "bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 text-white font-bold shadow-xl shadow-purple-500/40 border-2 border-purple-400/50 hover:from-violet-500 hover:via-purple-500 hover:to-fuchsia-500 hover:shadow-2xl hover:shadow-purple-500/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-purple-500",
        primary:
          "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold shadow-xl shadow-teal-500/50 border-2 border-teal-300/50 hover:from-emerald-400 hover:via-teal-400 hover:to-cyan-400 hover:shadow-2xl hover:shadow-teal-400/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-teal-500",
        destructive:
          "bg-gradient-to-r from-red-500 via-rose-500 to-pink-500 text-white font-bold shadow-xl shadow-red-500/40 border-2 border-red-400/50 hover:from-red-400 hover:via-rose-400 hover:to-pink-400 hover:shadow-2xl hover:shadow-red-500/60 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-red-500",
        secondary:
          "bg-gradient-to-r from-slate-700 to-slate-800 text-white font-bold shadow-lg shadow-slate-900/30 border-2 border-slate-600 hover:from-slate-600 hover:to-slate-700 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] dark:from-slate-600 dark:to-slate-700 dark:border-slate-500 dark:hover:from-slate-500 dark:hover:to-slate-600 focus-visible:ring-slate-400",
        ghost:
          "bg-white/90 text-slate-900 font-semibold shadow-md border-2 border-slate-300 hover:bg-white hover:border-purple-400 hover:text-purple-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] dark:bg-slate-800 dark:text-white dark:border-slate-600 dark:hover:bg-slate-700 dark:hover:border-purple-500 dark:hover:text-purple-300 focus-visible:ring-slate-400",
        link: "text-purple-600 dark:text-purple-400 underline-offset-4 hover:underline hover:text-purple-700 dark:hover:text-purple-300 shadow-none",
      },
      size: {
        default: "h-11 px-6 py-2.5",
        sm: "h-9 rounded-lg gap-1.5 px-4 text-xs",
        lg: "h-14 rounded-xl px-8 text-base",
        xl: "h-16 rounded-2xl px-10 text-lg",
        icon: "size-10 rounded-lg",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-xl",
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
