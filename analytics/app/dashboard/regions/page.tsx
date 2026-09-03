import { getRegions, getProvinces, getHospitals } from "@/lib/api";
import { SuppressedValue } from "@/components/SuppressedValue";
import { Card, Eyebrow } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import Link from "next/link";

export default async function RegionsPage() {
  const [regions, provinces, hospitals] = await Promise.all([getRegions(), getProvinces(), getHospitals()]);

  // Group hospitals under their region (hospital city) for the drill-down
  // under each city row. A region with no hospitals on file just gets an
  // empty list here — rendered as "No hospitals on file for this region"
  // below rather than being skipped or crashing.
  const hospitalsByRegion = new Map<string, typeof hospitals>();
  for (const h of hospitals) {
    const list = hospitalsByRegion.get(h.region) ?? [];
    list.push(h);
    hospitalsByRegion.set(h.region, list);
  }

  // Group city rows under their province so the table reads
  // province → its cities, in one organized view.
  const citiesByProvince = new Map<string, typeof regions>();
  for (const r of regions) {
    const list = citiesByProvince.get(r.province) ?? [];
    list.push(r);
    citiesByProvince.set(r.province, list);
  }
  // Keep province order matching the province summary (highest volume first),
  // then append any province that only appears in city data.
  const provinceOrder = [
    ...provinces.map((p) => p.province),
    ...[...citiesByProvince.keys()].filter((p) => !provinces.some((pp) => pp.province === p)),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow tone="teal">Regions</Eyebrow>
          <h1 className="font-display text-3xl mt-1">Every province, one hospital city at a time</h1>
          <p className="text-sm text-sage mt-2">
            Visit and patient counts under 5 are shown as &lt;5 rather than an exact number, to protect anyone in a
            small/rare cell from being identifiable.
          </p>
          <p className="text-sm text-sage mt-2">
            "Region" here means the hospital's city where a visit was recorded — not a patient's home address.
            Editing a patient's address on the doctor app never changes these numbers; only which hospital the
            visiting doctor belongs to does. Cities are grouped under their province — including Gilgit-Baltistan
            and Azad Jammu & Kashmir, alongside the four provinces and the federal capital.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton type="provinces" label="Export provinces CSV" />
          <ExportButton type="regions" label="Export cities CSV" />
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-light/60 text-teal-dark">
            <tr>
              <th className="text-left font-medium px-4 py-3">Province</th>
              <th className="text-right font-medium px-4 py-3">Cities reporting</th>
              <th className="text-right font-medium px-4 py-3">Visits</th>
              <th className="text-right font-medium px-4 py-3">Patients seen</th>
              <th className="text-left font-medium px-4 py-3">Top condition</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {provinces.map((p) => (
              <tr key={p.province}>
                <td className="px-4 py-3 font-medium">{p.province}</td>
                <td className="px-4 py-3 text-right font-mono">{p.regionCount}</td>
                <td className="px-4 py-3 text-right font-mono">
                  <SuppressedValue value={p.visitCount} />
                </td>
                <td className="px-4 py-3 text-right font-mono">
                  <SuppressedValue value={p.patientCount} />
                </td>
                <td className="px-4 py-3 capitalize text-sage">{p.topCondition ?? "—"}</td>
              </tr>
            ))}
            {provinces.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sage">
                  No provincial data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="space-y-4">
        {provinceOrder.map((province) => {
          const cities = citiesByProvince.get(province);
          if (!cities || cities.length === 0) return null;
          return (
            <Card key={province} className="overflow-hidden">
              <div className="px-4 py-3 bg-teal-light/40 border-b border-line">
                <h2 className="font-medium text-teal-dark">{province}</h2>
              </div>
              <table className="w-full text-sm">
                <thead className="text-sage">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">City</th>
                    <th className="text-right font-medium px-4 py-2">Visits</th>
                    <th className="text-right font-medium px-4 py-2">Patients seen</th>
                    <th className="text-left font-medium px-4 py-2">Top condition</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {cities.map((r) => {
                    const regionHospitals = hospitalsByRegion.get(r.region) ?? [];
                    return (
                      <tr key={r.region}>
                        <td className="px-4 py-2 font-medium">{r.region}</td>
                        <td className="px-4 py-2 text-right font-mono">
                          <SuppressedValue value={r.visitCount} />
                        </td>
                        <td className="px-4 py-2 text-right font-mono">
                          <SuppressedValue value={r.patientCount} />
                        </td>
                        <td className="px-4 py-2 capitalize text-sage">{r.topCondition ?? "—"}</td>
                        <td className="px-4 py-2 text-right">
                          <Link
                            href={`/dashboard/benchmark?region=${encodeURIComponent(r.region)}`}
                            className="text-teal-dark text-xs font-medium hover:underline"
                          >
                            Benchmark →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Hospital-level drill-down: every hospital in this province,
                  grouped under its region (city), with its own visit/patient
                  counts and doctor count. Hospitals with zero visits still
                  show a row (rendered as "<5" by SuppressedValue, per the
                  same small-cell rule as everything else — never blank or
                  a crash). */}
              <div className="px-4 py-3 bg-cream/60 border-t border-line space-y-3">
                {citiesByProvince.get(province)!.map((r) => {
                  const regionHospitals = hospitalsByRegion.get(r.region) ?? [];
                  return (
                    <div key={`${province}-${r.region}-hospitals`}>
                      <h3 className="text-xs font-medium uppercase tracking-wide text-sage mb-1">
                        {r.region} — hospitals
                      </h3>
                      {regionHospitals.length === 0 ? (
                        <p className="text-xs text-sage italic">No hospitals on file for this region.</p>
                      ) : (
                        <table className="w-full text-xs">
                          <thead className="text-sage">
                            <tr>
                              <th className="text-left font-medium px-2 py-1">Hospital</th>
                              <th className="text-right font-medium px-2 py-1">Doctors</th>
                              <th className="text-right font-medium px-2 py-1">Visits</th>
                              <th className="text-right font-medium px-2 py-1">Patients seen</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {regionHospitals.map((h) => (
                              <tr key={h.hospitalId}>
                                <td className="px-2 py-1">{h.hospitalName}</td>
                                <td className="px-2 py-1 text-right font-mono">{h.doctorCount}</td>
                                <td className="px-2 py-1 text-right font-mono">
                                  <SuppressedValue value={h.visitCount} />
                                </td>
                                <td className="px-2 py-1 text-right font-mono">
                                  <SuppressedValue value={h.patientCount} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
