"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { CnicScanner } from "@/components/CnicScanner";
import { apiUrl, readCsrfCookie } from "@/lib/api";
import { idLabel, isMinorDob } from "@/lib/identity";

const BLOOD_GROUPS = ["unknown", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONSHIPS = ["Parent", "Spouse", "Sibling", "Child", "Guardian", "Friend", "Other"];

type Contact = { fullName: string; relationshipType: string; phoneNumber: string };
type Step = "scan" | "form";

const emptyContact = (): Contact => ({ fullName: "", relationshipType: "Parent", phoneNumber: "" });

export function RegisterPatientForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("scan");
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    nationalId: "",
    fullName: "",
    dateOfBirth: "",
    gender: "female",
    phoneNumber: "",
    email: "",
    address: "",
    bloodGroup: "unknown",
    allergies: "",
    chronicConditions: "",
    weightKg: "",
    pediatricianName: "",
    pediatricianPhone: "",
  });

  const [contacts, setContacts] = useState<Contact[]>([emptyContact()]);

  // NADRA gives everyone a #####-#######-# style ID — a CNIC from 18, a
  // B-Form number before that — so date of birth is what decides which
  // label (and which extra rules) apply here, not the digits themselves.
  const isMinor = useMemo(() => isMinorDob(form.dateOfBirth), [form.dateOfBirth]);
  const idType = isMinor ? "b_form" : "cnic";

  function updateContact(i: number, patch: Partial<Contact>) {
    setContacts((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }

  function addContact() {
    if (contacts.length >= 3) return;
    setContacts((cs) => [...cs, emptyContact()]);
  }

  function removeContact(i: number) {
    setContacts((cs) => cs.filter((_, idx) => idx !== i));
  }

  // Format National ID as the user types: 12345-1234567-1
  function formatNationalId(raw: string): string {
    const digits = raw.replace(/\D/g, "").slice(0, 13);
    const part1 = digits.slice(0, 5);
    const part2 = digits.slice(5, 12);
    const part3 = digits.slice(12, 13);
    return [part1, part2, part3].filter(Boolean).join("-");
  }

  function handleScanned(cnic: string) {
    setScannedId(cnic);
    setForm((f) => ({ ...f, nationalId: cnic }));
    setStep("form");
  }

  function useManualEntry() {
    setScannedId(null);
    setStep("form");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});
    try {
      const usableContacts = contacts.filter((c) => c.fullName.trim() && c.phoneNumber.trim());
      const res = await fetch(apiUrl("/api/patients"), { credentials: "include",
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": readCsrfCookie() || "" },
        body: JSON.stringify({ ...form, idType, contacts: usableContacts }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not register this patient.");
        setFieldErrors(data.fieldErrors || {});
        // A scanned ID that turns out to already be registered, or invalid,
        // needs the person to rescan/retype it — send them back rather than
        // leaving them stuck on a locked field they can't fix.
        if (data.fieldErrors?.nationalId) {
          setScannedId(null);
          setStep("scan");
        }
        return;
      }
      router.push(`/doctor/patients/${data.patient.id}`);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "scan") {
    return (
      <Card className="p-6 max-w-md">
        <div className="eyebrow text-sage mb-2">Step 1 of 2</div>
        <h2 className="font-display text-xl mb-4">Scan the patient's CNIC</h2>
        <CnicScanner onDetected={handleScanned} hint="Hold the patient's CNIC up to the camera." />
        <button
          type="button"
          onClick={useManualEntry}
          className="focus-ring text-sm text-sage hover:text-ink w-full text-center mt-4"
        >
          Can't scan? Enter details manually →
        </button>
        <p className="text-xs text-sage text-center mt-3">
          Registering a child under 18? They won't have a CNIC yet — skip scanning and enter their
          B-Form number manually instead.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="eyebrow text-sage">Identity</div>
        {scannedId && (
          <div className="rounded-lg bg-teal-light px-3.5 py-2.5 text-sm text-teal-dark flex items-center justify-between gap-2">
            <span>
              <span aria-hidden>✓</span> CNIC scanned: <span className="font-mono font-semibold">{scannedId}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setScannedId(null);
                setForm((f) => ({ ...f, nationalId: "" }));
                setStep("scan");
              }}
              className="focus-ring text-xs font-medium underline hover:no-underline"
            >
              Rescan
            </button>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" hint={fieldErrors.fullName}>
            <input
              className={inputClass}
              placeholder="e.g. Hassan Tariq"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
              autoFocus={Boolean(scannedId)}
            />
          </Field>
          <Field label="Date of birth" hint={fieldErrors.dateOfBirth}>
            <input
              type="date"
              className={inputClass}
              value={form.dateOfBirth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              required
            />
          </Field>
          <Field
            label={idLabel(isMinor)}
            hint={
              fieldErrors.nationalId ||
              (isMinor
                ? "Under 18 — enter their B-Form number (same format as a CNIC)."
                : undefined)
            }
          >
            <input
              className={inputClass}
              placeholder="12345-1234567-1"
              value={form.nationalId}
              onChange={(e) => setForm({ ...form, nationalId: formatNationalId(e.target.value) })}
              required
              autoFocus={!scannedId}
              readOnly={Boolean(scannedId)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Gender" hint={fieldErrors.gender}>
            <select
              className={inputClass}
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>
        {isMinor && (
          <div className="rounded-lg bg-teal-light px-3.5 py-2.5 text-sm text-teal-dark">
            This patient is under 18. A parent or guardian's contact is required below, and their
            phone number can be used for OTP sign-in on the patient's behalf.
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="eyebrow text-sage">Contact</div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Phone number" hint={fieldErrors.phoneNumber}>
            <input
              type="tel"
              inputMode="tel"
              className={inputClass}
              placeholder="03xx-xxxxxxx"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              required
            />
          </Field>
          <Field label="Email" hint={fieldErrors.email || "Optional"}>
            <input
              type="email"
              className={inputClass}
              placeholder="name@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Address" hint="Optional">
          <input
            className={inputClass}
            placeholder="Street, city"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="eyebrow text-sage">Medical profile</div>
        <Field label="Blood group" hint={fieldErrors.bloodGroup}>
          <select
            className={`${inputClass} max-w-[160px]`}
            value={form.bloodGroup}
            onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
          >
            {BLOOD_GROUPS.map((bg) => (
              <option key={bg} value={bg}>
                {bg === "unknown" ? "Unknown" : bg}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Allergies" hint="Optional — shown to emergency responders who scan the CNIC">
          <input
            className={inputClass}
            placeholder="e.g. Penicillin, peanuts"
            value={form.allergies}
            onChange={(e) => setForm({ ...form, allergies: e.target.value })}
          />
        </Field>
        <Field label="Chronic conditions" hint="Optional — shown to emergency responders who scan the CNIC">
          <input
            className={inputClass}
            placeholder="e.g. Type 2 diabetes, hypertension"
            value={form.chronicConditions}
            onChange={(e) => setForm({ ...form, chronicConditions: e.target.value })}
          />
        </Field>

        {isMinor && (
          <>
            <div className="eyebrow text-sage pt-2">Pediatric care (optional)</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Weight (kg)" hint={fieldErrors.weightKg || "For weight-based emergency dosing"}>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className={inputClass}
                  placeholder="e.g. 18.5"
                  value={form.weightKg}
                  onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                />
              </Field>
              <Field label="Pediatrician's name" hint="Shown to ER doctors and first responders">
                <input
                  className={inputClass}
                  placeholder="e.g. Dr. Ayesha Malik"
                  value={form.pediatricianName}
                  onChange={(e) => setForm({ ...form, pediatricianName: e.target.value })}
                />
              </Field>
            </div>
            <Field label="Pediatrician's phone" hint="Optional">
              <input
                className={inputClass}
                placeholder="03xx-xxxxxxx"
                value={form.pediatricianPhone}
                onChange={(e) => setForm({ ...form, pediatricianPhone: e.target.value })}
              />
            </Field>
          </>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="eyebrow text-sage">Emergency contacts</div>
          {contacts.length < 3 && (
            <button
              type="button"
              onClick={addContact}
              className="focus-ring text-sm font-medium text-teal-dark hover:underline"
            >
              + Add another
            </button>
          )}
        </div>
        {fieldErrors.contacts && <p className="text-sm text-alert">{fieldErrors.contacts}</p>}
        <div className="space-y-4">
          {contacts.map((c, i) => (
            <div key={i} className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end">
              <Field label={i === 0 ? "Name" : ""}>
                <input
                  className={inputClass}
                  placeholder="Contact name"
                  value={c.fullName}
                  onChange={(e) => updateContact(i, { fullName: e.target.value })}
                />
              </Field>
              <Field label={i === 0 ? "Relationship" : ""}>
                <select
                  className={inputClass}
                  value={c.relationshipType}
                  onChange={(e) => updateContact(i, { relationshipType: e.target.value })}
                >
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={i === 0 ? "Phone" : ""}>
                <input
                  type="tel"
                  inputMode="tel"
                  className={inputClass}
                  placeholder="03xx-xxxxxxx"
                  value={c.phoneNumber}
                  onChange={(e) => updateContact(i, { phoneNumber: e.target.value })}
                />
              </Field>
              {contacts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeContact(i)}
                  className="focus-ring text-sm text-sage hover:text-alert pb-2.5"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-sage">
          The first contact filled in is set as the primary emergency contact. At least one is
          recommended, but you can skip this and add it later from the patient's record.
        </p>
      </Card>

      {error && <p className="text-sm text-alert">{error}</p>}

      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={() => router.push("/doctor/patients")}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Registering…" : "Register patient"}
        </Button>
      </div>
    </form>
  );
}
