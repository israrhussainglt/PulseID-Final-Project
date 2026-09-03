import { getRegions, getProvinces } from "@/lib/api";
import { Card, Eyebrow } from "@/components/ui";
import dynamic from "next/dynamic";

const RegionMap = dynamic(() => import("@/components/RegionMap").then((m) => m.RegionMap), { ssr: false });

export default async function MapPage() {
  const [regions, provinces] = await Promise.all([getRegions(), getProvinces()]);

  const cityPoints = regions.map((r) => ({
    region: r.region,
    visitCount: r.visitCount.count,
    suppressed: r.visitCount.suppressed,
    topCondition: r.topCondition,
  }));

  const provincePoints = provinces.map((p) => ({
    region: p.province,
    visitCount: p.visitCount.count,
    suppressed: p.visitCount.suppressed,
    topCondition: p.topCondition,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Map</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Case density by region</h1>
        <p className="text-sm text-sage mt-2">
          Circle size and color track visit volume — red is the busiest. Two views: by hospital city, or rolled
          up by province (Punjab, Sindh, Khyber Pakhtunkhwa, Balochistan, Gilgit-Baltistan, Azad Jammu & Kashmir,
          and Islamabad Capital Territory). Add a hospital's own lat/lng once this goes beyond a demo.
        </p>
      </div>

      <div>
        <h2 className="font-medium text-teal-dark mb-2">By province</h2>
        <Card className="p-3">
          <RegionMap points={provincePoints} mode="province" />
        </Card>
      </div>

      <div>
        <h2 className="font-medium text-teal-dark mb-2">By hospital city</h2>
        <Card className="p-3">
          <RegionMap points={cityPoints} mode="city" />
        </Card>
      </div>
    </div>
  );
}
