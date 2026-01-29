import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  variant?: "default" | "success" | "warning" | "error"
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, description, icon: Icon, variant = "default", trend }: StatsCardProps) {
  const variantStyles = {
    default: "bg-gradient-to-br from-orange-100 to-amber-200 border-orange-300 hover:border-orange-400 dark:from-gray-800 dark:to-gray-700 dark:border-gray-600",
    success: "bg-gradient-to-br from-green-100 to-emerald-200 border-emerald-300 hover:border-emerald-400 dark:from-emerald-800 dark:to-emerald-700 dark:border-emerald-600",
    warning: "bg-gradient-to-br from-amber-100 to-yellow-200 border-amber-300 hover:border-amber-400 dark:from-amber-800 dark:to-amber-700 dark:border-amber-600",
    error: "bg-gradient-to-br from-pink-100 to-rose-200 border-pink-300 hover:border-pink-400 dark:from-red-800 dark:to-red-700 dark:border-red-600",
  }

  const iconStyles = {
    default: "text-orange-700 dark:text-gray-300",
    success: "text-emerald-700 dark:text-emerald-300",
    warning: "text-amber-700 dark:text-amber-300",
    error: "text-pink-700 dark:text-red-300",
  }

  const iconBgStyles = {
    default: "bg-orange-300 dark:bg-gray-700",
    success: "bg-emerald-300 dark:bg-emerald-700",
    warning: "bg-amber-300 dark:bg-amber-700",
    error: "bg-pink-300 dark:bg-red-700",
  }

  const textStyles = {
    default: "text-orange-900 dark:text-white",
    success: "text-emerald-900 dark:text-white",
    warning: "text-amber-900 dark:text-white",
    error: "text-pink-900 dark:text-white",
  }

  const labelStyles = {
    default: "text-orange-700 dark:text-gray-300",
    success: "text-emerald-700 dark:text-gray-300",
    warning: "text-amber-700 dark:text-gray-300",
    error: "text-pink-700 dark:text-gray-300",
  }

  return (
    <Card
      className={`shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] border ${variantStyles[variant]} group cursor-pointer`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className={`text-sm font-semibold tracking-wide uppercase ${labelStyles[variant]}`}>{title}</CardTitle>
        <div
          className={`p-3 rounded-xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${iconBgStyles[variant]}`}
        >
          <Icon className={`h-5 w-5 transition-all duration-300 ${iconStyles[variant]}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`text-3xl font-heading font-bold tracking-tight transition-all duration-300 group-hover:scale-105 ${textStyles[variant]}`}>
          {value}
        </div>
        {description && <p className={`text-sm font-medium leading-relaxed ${labelStyles[variant]}`}>{description}</p>}
        {trend && (
          <div
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
              trend.isPositive
                ? "text-emerald-700 bg-emerald-200 border border-emerald-400 dark:text-emerald-300 dark:bg-emerald-800/50 dark:border-emerald-600"
                : "text-red-700 bg-red-200 border border-red-400 dark:text-red-300 dark:bg-red-800/50 dark:border-red-600"
            }`}
          >
            {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {trend.isPositive ? "+" : ""}
              {trend.value}% from last month
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}