import { redirect } from "next/navigation"

export const metadata = {
  title: "Overview | QCC Electronic Attendance",
  description: "Dashboard overview",
}

export default function OverviewPage() {
  // Redirect to main dashboard
  redirect("/dashboard")
}
