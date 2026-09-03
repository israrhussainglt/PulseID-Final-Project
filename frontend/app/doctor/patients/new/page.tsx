import Link from "next/link";
import { redirect } from "next/navigation";
import { serverFetch } from "@/lib/server-api";
import { DoctorHeader } from "@/components/doctor/DoctorHeader";
import { RegisterPatientForm } from "@/components/doctor/RegisterPatientForm";

type MeResponse = { role: "doctor"; session: { fullName: string; hospitalName?: string } };

export default async function NewPatientPage() {
  const me = await serverFetch<MeResponse>("/api/me");
  if (me.status !== 200 || me.data?.role !== "doctor") redirect("/doctor/login");
  const session = me.data.session;

  return (
    <main className="min-h-screen bg-paper">
      <DoctorHeader doctorName={session?.fullName || "Doctor"} hospitalName={session?.hospitalName} />

      <div className="max-w-2xl mx-auto px-6 md:px-10 py-10">
        <Link href="/doctor/patients" className="text-sm font-medium text-sage hover:text-ink">
          ← All patients
        </Link>

        <div className="eyebrow text-teal mt-4 mb-2">New patient</div>
        <h1 className="font-display text-3xl mb-2">Register a patient</h1>
        <p className="text-sm text-sage mb-8 leading-relaxed">
          Scan the patient's CNIC first — that same card becomes their emergency ID once
          registered, so any doctor or first responder can scan it later for life-critical info.
        </p>

        <RegisterPatientForm />
      </div>
    </main>
  );
}
