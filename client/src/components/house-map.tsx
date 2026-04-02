import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, AlertCircle, X } from "lucide-react";
import houseGraphic from "@assets/house-graphic.png";

type HomeSystem = {
  id: string;
  systemType: string;
  installationYear?: number;
  lastServiceYear?: number;
  brand?: string;
  model?: string;
  notes?: string;
  houseId: string;
};

type HomeAppliance = {
  id: string;
  name: string;
  make: string;
  model: string;
  purchaseDate?: string;
  installDate?: string;
  yearInstalled?: number;
  notes?: string;
  location?: string;
  warrantyExpiration?: string;
  lastServiceDate?: string;
  houseId?: string;
};

type AreaKey =
  | "exterior"
  | "attic"
  | "bedroom"
  | "bathroom"
  | "living"
  | "kitchen"
  | "mechanical"
  | "laundry"
  | "foundation"
  | "garage";

type StatusType = "green" | "yellow" | "red" | "unknown";

// Percentage-based coordinate space (0–100 maps to 0%–100% of image)
const VB_W = 100;
const VB_H = 100;

type ZoneDef = { label: string; cx: number; cy: number; w: number; h: number };

// Zones tuned to the house illustration:
//   Roof peak ≈ y 7%  |  Upper-floor band ≈ y 30–54%
//   Lower-floor band  ≈ y 54–87%  |  Ground ≈ y 87%
const ZONES: Record<AreaKey, ZoneDef> = {
  exterior:   { label: "Exterior Systems",  cx: 50, cy: 6,   w: 76, h: 10  },
  attic:      { label: "Attic",             cx: 50, cy: 20,  w: 30, h: 14  },
  bedroom:    { label: "Bedroom(s)",        cx: 27, cy: 41,  w: 22, h: 18  },
  bathroom:   { label: "Bathroom(s)",       cx: 69, cy: 41,  w: 22, h: 18  },
  living:     { label: "Living / Dining",   cx: 22, cy: 69,  w: 18, h: 14  },
  kitchen:    { label: "Kitchen",           cx: 74, cy: 69,  w: 18, h: 14  },
  mechanical: { label: "Mechanical Room",   cx: 33, cy: 79,  w: 18, h: 8   },
  laundry:    { label: "Laundry Room",      cx: 63, cy: 79,  w: 18, h: 8   },
  foundation: { label: "Foundation",        cx: 50, cy: 92,  w: 56, h: 6   },
  garage:     { label: "Garage",            cx: 88, cy: 72,  w: 12, h: 20  },
};

const LIFESPANS: Record<string, number> = {
  "central air": 15, "central ac": 15, "hvac": 15, "air conditioner": 15, "ac unit": 15,
  "gas heat": 20, "gas furnace": 20, "electric heat": 15, "furnace": 20, "boiler": 20,
  "heat pump": 15, "mini split": 15, "ductwork": 25,
  "water heater": 12, "gas water heater": 12, "electric water heater": 10, "tankless water heater": 20,
  "water softener": 12, "water filter": 8, "water treatment": 10,
  "electrical": 30, "electrical panel": 30, "plumbing": 40, "copper pipe": 50, "pvc pipe": 40,
  "roof": 25, "asphalt shingle": 25, "metal roof": 50, "tile roof": 50, "flat roof": 15,
  "gutter": 20, "downspout": 20,
  "siding": 25, "vinyl siding": 25, "wood siding": 20, "fiber cement": 35, "stucco": 25,
  "window": 25, "double pane": 25, "triple pane": 30,
  "door": 25, "entry door": 25, "front door": 25, "exterior door": 25, "garage door": 15,
  "deck": 15, "composite deck": 25, "wood deck": 15, "patio": 25,
  "driveway": 25, "asphalt driveway": 20, "concrete driveway": 30,
  "fence": 20, "wood fence": 15, "vinyl fence": 25,
  "solar": 25, "solar panel": 25,
  "foundation": 100, "crawl space": 25, "vapor barrier": 25,
  "sump pump": 10, "ejector pump": 10,
  "septic": 30, "septic tank": 30, "well pump": 15, "well": 25,
  "attic insulation": 20, "insulation": 20,
  "radon": 10, "radon mitigation": 10,
  "smoke detector": 10, "smoke alarm": 10,
  "carbon monoxide": 7, "co detector": 7,
  "security": 10, "alarm": 10,
  "dishwasher": 10, "refrigerator": 13, "fridge": 13,
  "washer": 12, "dryer": 12,
  "garbage disposal": 12, "disposal": 12,
  "range": 15, "oven": 15, "stove": 15,
  "microwave": 9, "freezer": 16,
};

const REPLACEMENT_COSTS: Record<string, string> = {
  "central air": "$4,000–$8,000", "central ac": "$4,000–$8,000", "hvac": "$4,000–$8,000",
  "air conditioner": "$4,000–$8,000", "ac unit": "$4,000–$8,000",
  "gas heat": "$2,500–$5,000", "gas furnace": "$2,500–$5,000", "furnace": "$2,500–$5,000",
  "boiler": "$3,000–$6,000", "heat pump": "$3,500–$7,500", "mini split": "$2,000–$5,500",
  "electric heat": "$1,500–$4,000", "ductwork": "$1,500–$5,000",
  "water heater": "$800–$1,500", "gas water heater": "$800–$1,500",
  "electric water heater": "$700–$1,200", "tankless water heater": "$1,500–$3,500",
  "water softener": "$800–$2,500", "water filter": "$200–$1,000",
  "electrical": "$1,500–$3,500", "electrical panel": "$1,500–$3,500", "plumbing": "$2,000–$15,000",
  "roof": "$7,000–$15,000", "asphalt shingle": "$7,000–$15,000",
  "metal roof": "$12,000–$30,000", "flat roof": "$5,000–$12,000",
  "gutter": "$800–$2,500", "downspout": "$100–$600",
  "siding": "$6,000–$18,000", "vinyl siding": "$6,000–$15,000",
  "wood siding": "$8,000–$20,000", "fiber cement": "$10,000–$25,000", "stucco": "$6,000–$15,000",
  "window": "$300–$800 each", "double pane": "$400–$900 each",
  "door": "$800–$3,500", "entry door": "$800–$3,500", "front door": "$800–$3,500",
  "garage door": "$800–$2,500",
  "deck": "$5,000–$20,000", "composite deck": "$8,000–$25,000", "patio": "$3,000–$12,000",
  "driveway": "$3,000–$8,000", "asphalt driveway": "$3,000–$7,000",
  "concrete driveway": "$4,000–$10,000", "fence": "$1,500–$6,000",
  "solar": "$10,000–$25,000", "solar panel": "$10,000–$25,000",
  "foundation": "$5,000–$50,000+", "crawl space": "$1,500–$6,000",
  "vapor barrier": "$1,500–$6,000",
  "sump pump": "$500–$1,200", "ejector pump": "$800–$2,000",
  "septic": "$3,000–$15,000", "septic tank": "$3,000–$15,000",
  "well pump": "$800–$2,500", "well": "$800–$5,000",
  "attic insulation": "$1,500–$4,000", "insulation": "$1,500–$4,000",
  "radon": "$800–$2,500", "radon mitigation": "$800–$2,500",
  "water treatment": "$500–$2,500",
  "triple pane": "$500–$1,200 each",
  "smoke detector": "$20–$80 each", "smoke alarm": "$20–$80 each",
  "carbon monoxide": "$25–$100 each", "co detector": "$25–$100 each",
  "security": "$300–$1,500", "alarm": "$300–$1,500",
  "dishwasher": "$500–$1,200", "refrigerator": "$800–$2,000", "fridge": "$800–$2,000",
  "washer": "$500–$1,000", "dryer": "$400–$900",
  "garbage disposal": "$150–$400", "disposal": "$150–$400",
  "range": "$600–$2,000", "oven": "$600–$2,000", "stove": "$600–$2,000",
  "microwave": "$150–$600", "freezer": "$400–$1,000",
};

function getArea(name: string, location?: string): AreaKey {
  const n = name.toLowerCase().replace(/-/g, " ");
  const l = (location || "").toLowerCase().replace(/-/g, " ");

  if (l.includes("attic")) return "attic";
  if (l.includes("garage")) return "garage";
  if (l.includes("laundry")) return "laundry";
  if (l.includes("kitchen")) return "kitchen";
  if (l.includes("bathroom") || l.includes("bath")) return "bathroom";
  if (l.includes("bedroom") || l.includes("master")) return "bedroom";
  if (l.includes("basement") || l.includes("utility") || l.includes("mechanical")) return "mechanical";
  if (l.includes("exterior") || l.includes("outside")) return "exterior";
  if (l.includes("crawl") || l.includes("foundation")) return "foundation";

  if (n.includes("bedroom") || n.includes("master bedroom")) return "bedroom";
  if (n.includes("bathroom") || (n.includes("bath") && !n.includes("water"))) return "bathroom";

  if (n.includes("garage door")) return "garage";

  if (n.includes("roof") || n.includes("shingle") || n.includes("gutter") || n.includes("downspout") ||
      n.includes("siding") || n.includes("stucco") || n.includes("window") || n.includes("door") ||
      n.includes("deck") || n.includes("patio") || n.includes("driveway") || n.includes("walkway") ||
      n.includes("fence")) return "exterior";

  if (n.includes("solar") && !n.includes("water heater")) return "exterior";

  if (n.includes("foundation") || n.includes("crawl space") || n.includes("vapor barrier") ||
      n.includes("sump pump") || n.includes("ejector pump") || n.includes("septic") ||
      n.includes("well pump") || n.includes("well water") || n.includes("radon")) return "foundation";

  if (n.includes("attic insulation") || n.includes("insulation")) return "attic";
  if (n.includes("central air") || n.includes("central ac") || n.includes("hvac") ||
      n.includes("air condition") || n.includes("air handler") || n.includes("heat pump") ||
      n.includes("ac unit") || n.includes("mini split") || n.includes("ductwork")) return "attic";

  if (n.includes("furnace") || n.includes("gas heat") || n.includes("electric heat") ||
      n.includes("boiler") || n.includes("water heater") || n.includes("electrical") ||
      n.includes("electrical panel") || n.includes("plumbing") ||
      n.includes("copper pipe") || n.includes("pvc pipe") ||
      n.includes("water softener") || n.includes("water filter") || n.includes("water treatment")) return "mechanical";

  if (n.includes("dishwasher") || n.includes("refrigerator") || n.includes("fridge") ||
      n.includes("range") || n.includes("oven") || n.includes("stove") || n.includes("microwave") ||
      n.includes("garbage disposal") || n.includes("disposal") || n.includes("freezer")) return "kitchen";

  if ((n.includes("washer") && !n.includes("dish")) || n.includes("dryer") || n.includes("washing machine")) return "laundry";

  if (n.includes("security") || n.includes("alarm") || n.includes("smoke") ||
      n.includes("carbon monoxide") || n.includes("co detector")) return "living";

  return "living";
}

function getAge(item: HomeSystem | HomeAppliance): number | null {
  const currentYear = new Date().getFullYear();
  if ("installationYear" in item && item.installationYear) return currentYear - item.installationYear;
  if ("yearInstalled" in item && item.yearInstalled) return currentYear - item.yearInstalled;
  if ("purchaseDate" in item && item.purchaseDate) {
    const y = new Date(item.purchaseDate).getFullYear();
    if (!isNaN(y) && y > 1900) return currentYear - y;
  }
  if ("installDate" in item && item.installDate) {
    const y = new Date(item.installDate).getFullYear();
    if (!isNaN(y) && y > 1900) return currentYear - y;
  }
  return null;
}

function getLifespan(name: string): number {
  const n = name.toLowerCase().replace(/-/g, " ");
  for (const [key, val] of Object.entries(LIFESPANS)) {
    if (n.includes(key)) return val;
  }
  return 15;
}

function getReplacementCost(name: string): string {
  const n = name.toLowerCase().replace(/-/g, " ");
  for (const [key, val] of Object.entries(REPLACEMENT_COSTS)) {
    if (n.includes(key)) return val;
  }
  return "Contact a pro for an estimate";
}

function getStatus(name: string, age: number | null): { status: StatusType; reason: string } {
  if (age === null) return { status: "unknown", reason: "Installation date not recorded — add it in your home record for accurate tracking." };
  const lifespan = getLifespan(name);
  const pct = age / lifespan;
  const remaining = lifespan - age;
  if (pct < 0.5) return { status: "green", reason: `${age} yr${age !== 1 ? "s" : ""} old — approximately ${remaining} yr${remaining !== 1 ? "s" : ""} of typical lifespan remaining.` };
  if (pct < 0.8) return { status: "yellow", reason: `${age} yr${age !== 1 ? "s" : ""} old — approaching end of its typical ${lifespan}-year lifespan. Plan ahead for replacement.` };
  if (age < lifespan) return { status: "red", reason: `${age} yr${age !== 1 ? "s" : ""} old — nearing the end of its typical ${lifespan}-year lifespan. Start planning for replacement.` };
  return { status: "red", reason: `${age} yr${age !== 1 ? "s" : ""} old — past its typical ${lifespan}-year lifespan. Replacement is recommended.` };
}

const STATUS_FILL: Record<StatusType, string> = {
  green:   "#22c55e",
  yellow:  "#eab308",
  red:     "#ef4444",
  unknown: "#9ca3af",
};

type DotItem = {
  id: string;
  name: string;
  make?: string;
  model?: string;
  age: number | null;
  area: AreaKey;
  status: StatusType;
  statusReason: string;
  replacementCost: string;
  notes?: string;
};

type PlacedDot = DotItem & { cx: number; cy: number };

function placeDots(items: DotItem[], zone: ZoneDef): PlacedDot[] {
  if (items.length === 0) return [];

  const usableW = Math.max(2, zone.w - 2);
  const usableH = Math.max(2, zone.h - 2);

  let spacing = 5;
  let cols: number;
  let rows: number;

  do {
    const maxColsByWidth = Math.max(1, Math.floor((usableW + spacing) / spacing));
    cols = Math.min(items.length, maxColsByWidth);
    rows = Math.ceil(items.length / cols);
    if (rows <= 1 || (rows - 1) * spacing <= usableH) break;
    spacing -= 0.5;
  } while (spacing >= 2);

  const totalW = (cols - 1) * spacing;
  const totalH = (rows - 1) * spacing;
  const halfW = usableW / 2;
  const halfH = usableH / 2;

  return items.map((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCount = Math.min(cols, items.length - row * cols);
    const isLastRow = row === rows - 1 && rowCount < cols;
    const rowShiftX = isLastRow ? ((cols - rowCount) * spacing) / 2 : 0;

    const rawCx = zone.cx - totalW / 2 + col * spacing + rowShiftX;
    const rawCy = zone.cy - totalH / 2 + row * spacing;
    const cx = Math.max(zone.cx - halfW, Math.min(zone.cx + halfW, rawCx));
    const cy = Math.max(zone.cy - halfH, Math.min(zone.cy + halfH, rawCy));

    return { ...item, cx, cy };
  });
}

interface HouseMapProps {
  houseId: string;
  homeownerId: string;
  houseName?: string;
  checkedSystems?: string[];
}

export default function HouseMap({ houseId, homeownerId, checkedSystems = [] }: HouseMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: systems = [] } = useQuery<HomeSystem[]>({
    queryKey: ["/api/home-systems", houseId],
    queryFn: () => fetch(`/api/home-systems?houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

  const { data: appliances = [] } = useQuery<HomeAppliance[]>({
    queryKey: ["/api/appliances", homeownerId, houseId],
    queryFn: () => fetch(`/api/appliances?homeownerId=${encodeURIComponent(homeownerId)}&houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

  // Normalize a system name/value to a common key for deduplication:
  // strips hyphens, underscores, spaces and lowercases so "gas-furnace" == "Gas Furnace"
  const normalize = (s: string) => s.toLowerCase().replace(/[-_\s]+/g, "");

  // System types that already have a detailed record in the homeSystems table
  const detailedNorm = new Set(systems.map(s => normalize(s.systemType)));

  const dots: DotItem[] = [
    ...systems.map(s => {
      const age = getAge(s);
      const { status, reason } = getStatus(s.systemType, age);
      return {
        id: `sys-${s.id}`, name: s.systemType, make: s.brand, model: s.model,
        age, area: getArea(s.systemType), status, statusReason: reason,
        replacementCost: getReplacementCost(s.systemType), notes: s.notes,
      };
    }),
    // Checked systems that have no detailed record yet — show as gray "unknown" dots
    ...checkedSystems
      .filter(v => !detailedNorm.has(normalize(v)))
      .map(v => ({
        id: `chk-${v}`, name: v, make: null, model: null,
        age: null, area: getArea(v), status: "unknown" as StatusType,
        statusReason: "Installation date not recorded — add it in your home record for accurate tracking.",
        replacementCost: getReplacementCost(v), notes: null,
      })),
    ...appliances.map(a => {
      const age = getAge(a);
      const { status, reason } = getStatus(a.name, age);
      return {
        id: `app-${a.id}`, name: a.name, make: a.make, model: a.model,
        age, area: getArea(a.name, a.location), status, statusReason: reason,
        replacementCost: getReplacementCost(a.name), notes: a.notes,
      };
    }),
  ];

  const byArea: Partial<Record<AreaKey, DotItem[]>> = {};
  dots.forEach(d => { (byArea[d.area] ??= []).push(d); });

  const placed: PlacedDot[] = [];
  (Object.keys(byArea) as AreaKey[]).forEach(area => {
    placeDots(byArea[area]!, ZONES[area]).forEach(p => placed.push(p));
  });

  const openDot = placed.find(d => d.id === openId);
  const isEmpty = systems.length === 0 && appliances.length === 0;

  return (
    <div className="mt-2">
      <div className="relative select-none" onClick={() => setOpenId(null)}>
        {/* House illustration */}
        <img src={houseGraphic} alt="Your home" className="w-full h-auto block" />

        {/* Interactive dots overlaid on the image */}
        {placed.map(dot => (
          <button
            key={dot.id}
            style={{
              position: "absolute",
              left: `${dot.cx}%`,
              top: `${dot.cy}%`,
              transform: "translate(-50%, -50%)",
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              backgroundColor: STATUS_FILL[dot.status],
              border: "2.5px solid white",
              boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
              cursor: "pointer",
              zIndex: 10,
              padding: 0,
            }}
            aria-label={dot.name}
            onClick={e => { e.stopPropagation(); setOpenId(openId === dot.id ? null : dot.id); }}
          />
        ))}

        {/* Empty state */}
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 rounded-xl px-5 py-3 text-center shadow border border-gray-200">
              <p className="text-sm font-semibold text-gray-600">No items tracked yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Add systems &amp; appliances to see them here</p>
            </div>
          </div>
        )}

        {/* Popover — flips above/below and left/right to stay on screen */}
        {openDot && (() => {
          const flipY = openDot.cy < 22;
          const flipX = openDot.cx > 68;
          return (
            <div
              className="absolute z-50 bg-white rounded-xl shadow-2xl border border-purple-200 p-4 w-64"
              style={{
                left: flipX ? "auto" : `${openDot.cx}%`,
                right: flipX ? `${100 - openDot.cx}%` : "auto",
                top: flipY ? `${openDot.cy}%` : "auto",
                bottom: flipY ? "auto" : `${100 - openDot.cy}%`,
                transform: flipY
                  ? `translate(${flipX ? "50%" : "-50%"}, 14px)`
                  : `translate(${flipX ? "50%" : "-50%"}, -14px)`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Caret */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-0 h-0"
                style={flipY
                  ? { top: 0, transform: "translateX(-50%) translateY(-100%)", borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid white" }
                  : { bottom: 0, transform: "translateX(-50%) translateY(100%)", borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid white" }
                }
              />
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                onClick={() => setOpenId(null)}
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-start gap-2 mb-3 pr-5">
                {openDot.status === "green"   && <CheckCircle  className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
                {openDot.status === "yellow"  && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
                {openDot.status === "red"     && <AlertCircle  className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
                {openDot.status === "unknown" && <AlertCircle  className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                <h4 className="font-bold text-gray-900 text-sm leading-tight">{openDot.name}</h4>
              </div>

              <div className="space-y-1.5 text-xs text-gray-700">
                {openDot.make  && <div><span className="font-semibold text-gray-500 w-24 inline-block">Make:</span>{openDot.make}</div>}
                {openDot.model && <div><span className="font-semibold text-gray-500 w-24 inline-block">Model:</span>{openDot.model}</div>}
                <div>
                  <span className="font-semibold text-gray-500 w-24 inline-block">Age:</span>
                  {openDot.age !== null ? `${openDot.age} yr${openDot.age !== 1 ? "s" : ""}` : "Unknown"}
                </div>
                <div>
                  <span className="font-semibold text-gray-500 w-24 inline-block">Est. Replace:</span>
                  {openDot.replacementCost}
                </div>
              </div>

              <div className={`mt-3 rounded-lg px-2.5 py-2 text-xs leading-relaxed ${
                openDot.status === "red"    ? "bg-red-50 text-red-700" :
                openDot.status === "yellow" ? "bg-yellow-50 text-yellow-700" :
                openDot.status === "green"  ? "bg-green-50 text-green-700" :
                "bg-gray-50 text-gray-600"
              }`}>
                {openDot.statusReason}
              </div>

              {openDot.notes && (
                <div className="mt-2 text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                  {openDot.notes}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#22c55e" }} />Good
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#eab308" }} />Aging
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#ef4444" }} />Replace Soon
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#9ca3af" }} />Date Unknown
        </span>
      </div>
      <p className="text-center text-xs text-gray-400 mt-1">
        Tap a dot to see details &nbsp;·&nbsp; {dots.length} item{dots.length !== 1 ? "s" : ""} tracked
      </p>
    </div>
  );
}
