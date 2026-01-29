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
    default: "bg-gray-900 border-gray-700 hover:border-gray-600",
    success: "bg-emerald-900 border-emerald-700 hover:border-emerald-600",
    warning: "bg-amber-900 border-amber-700 hover:border-amber-600",
    error: "bg-red-900 border-red-700 hover:border-red-600",
  }

  const iconStyles = {
    default: "text-gray-300",
    success: "text-emerald-300",
    warning: "text-amber-300",
    error: "text-red-300",
  }

  const iconBgStyles = {
    default: "bg-gray-800",
    success: "bg-emerald-800",
    warning: "bg-amber-800",
    error: "bg-red-800",
  }

  return (
    <Card
      className={`shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] border ${variantStyles[variant]} group cursor-pointer`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-gray-300 tracking-wide uppercase">{title}</CardTitle>
        <div
          className={`p-3 rounded-xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 ${iconBgStyles[variant]}`}
        >
          <Icon className={`h-5 w-5 transition-all duration-300 ${iconStyles[variant]}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-heading font-bold text-white tracking-tight transition-all duration-300 group-hover:scale-105">
          {value}
        </div>
        {description && <p className="text-sm text-gray-300 font-medium leading-relaxed">{description}</p>}
        {trend && (
          <div
            className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-300 ${
              trend.isPositive
                ? "text-emerald-300 bg-emerald-800/50 border border-emerald-600"
                : "text-red-300 bg-red-800/50 border border-red-600"
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
