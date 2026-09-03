"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { coordsForRegion, coordsForProvince } from "@/lib/geo";

type RegionPoint = {
  region: string;
  visitCount: number | null;
  suppressed: boolean;
  topCondition: string | null;
};

// Circle size/color scale with case volume — a literal outbreak map, not
// just a table. Client-only (Leaflet touches window/document directly),
// loaded via next/dynamic with ssr:false from the page that renders this.
//
// mode="province" plots by province (Gilgit-Baltistan, AJK, etc. included)
// using a representative province coordinate; mode="city" (default) plots
// by hospital city as before.
export function RegionMap({ points, mode = "city" }: { points: RegionPoint[]; mode?: "city" | "province" }) {
  const lookup = mode === "province" ? coordsForProvince : coordsForRegion;
  const plottable = points.map((p) => ({ ...p, coords: lookup(p.region) })).filter((p) => p.coords);
  const max = Math.max(1, ...plottable.map((p) => p.visitCount ?? 4));

  return (
    <div className="h-[480px] rounded-xl overflow-hidden border border-line">
      <MapContainer center={[30.3753, 69.3451]} zoom={5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {plottable.map((p) => {
          const value = p.visitCount ?? 4;
          const radius = 8 + (value / max) * 26;
          const color = value / max > 0.66 ? "#D64550" : value / max > 0.33 ? "#B8790B" : "#0E7C7B";
          return (
            <CircleMarker
              key={p.region}
              center={p.coords as [number, number]}
              radius={radius}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.45, weight: 2 }}
            >
              <Tooltip direction="top" offset={[0, -radius]}>
                <div className="text-xs">
                  <strong>{p.region}</strong>
                  <br />
                  {p.suppressed ? "<5 visits" : `${p.visitCount?.toLocaleString()} visits`}
                  {p.topCondition && (
                    <>
                      <br />
                      Top: {p.topCondition}
                    </>
                  )}
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
