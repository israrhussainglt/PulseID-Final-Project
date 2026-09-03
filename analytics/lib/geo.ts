// A small, hand-maintained lookup of major-city coordinates. This is a
// pragmatic placeholder for a real deployment — swap for hospitals having
// their own lat/lng on file (a one-column addition to the `hospitals`
// table) once this goes beyond a demo, rather than matching on city name.
export const CITY_COORDS: Record<string, [number, number]> = {
  Lahore: [31.5497, 74.3436],
  Karachi: [24.8607, 67.0011],
  Islamabad: [33.6844, 73.0479],
  Rawalpindi: [33.5651, 73.0169],
  Peshawar: [34.0151, 71.5249],
  Quetta: [30.1798, 66.975],
  Faisalabad: [31.4504, 73.135],
  Multan: [30.1575, 71.5249],
  Hyderabad: [25.396, 68.3578],
  Sialkot: [32.4945, 74.5229],
  Gilgit: [35.9208, 74.3144],
  Skardu: [35.2971, 75.6333],
  Muzaffarabad: [34.37, 73.4711],
};

// One representative coordinate per province/administrative unit, used for
// the province-level map view. Gilgit-Baltistan and Azad Jammu & Kashmir
// are included alongside the four provinces and the federal capital, since
// health/census data in Pakistan is routinely reported at that level.
export const PROVINCE_COORDS: Record<string, [number, number]> = {
  Punjab: [31.1704, 72.7097],
  Sindh: [25.8943, 68.5247],
  "Khyber Pakhtunkhwa": [34.5261, 72.3312],
  Balochistan: [28.4907, 65.0958],
  "Gilgit-Baltistan": [35.8, 75.0],
  "Azad Jammu & Kashmir": [34.0, 73.7],
  "Islamabad Capital Territory": [33.6844, 73.0479],
};

export function coordsForRegion(region: string): [number, number] | null {
  return CITY_COORDS[region] ?? null;
}

export function coordsForProvince(province: string): [number, number] | null {
  return PROVINCE_COORDS[province] ?? null;
}
