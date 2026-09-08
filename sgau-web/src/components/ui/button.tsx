import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-xl border border-transparent text-xs font-extrabold whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-[#6d28d9]/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-[#6d28d9] text-white shadow-md hover:bg-[#5b21b6] active:bg-[#4c1d95]",
        outline:
          "border border-[#6d28d9]/20 bg-white text-[#64748b] hover:bg-[#f8f9fc] hover:text-[#1a1a2e] hover:border-[#6d28d9]/40",
        secondary:
          "bg-[#6d28d9]/10 text-[#6d28d9] hover:bg-[#6d28d9]/20 active:bg-[#6d28d9]/25",
        ghost:
          "text-[#64748b] hover:bg-[#6d28d9]/10 hover:text-[#6d28d9]",
        destructive:
          "bg-red-600 text-white shadow-md hover:bg-red-700 active:bg-red-800",
        link: "text-[#6d28d9] underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 gap-2 px-4 shadow-xs",
        xs: "h-7 gap-1.5 rounded-lg px-2.5 text-[11px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 gap-1.5 rounded-xl px-3 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-11 gap-2.5 rounded-2xl px-6 text-sm",
        icon: "size-10 rounded-xl",
        "icon-xs":
          "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-8 rounded-xl",
        "icon-lg": "size-11 rounded-2xl",
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
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
