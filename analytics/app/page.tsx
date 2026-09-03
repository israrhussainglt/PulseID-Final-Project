import { redirect } from "next/navigation";

// Middleware already gates every route behind the analyst session, so by
// the time this renders we're either authenticated (send to the dashboard)
// or middleware already bounced us to /login before we got here.
export default function RootPage() {
  redirect("/dashboard");
}
