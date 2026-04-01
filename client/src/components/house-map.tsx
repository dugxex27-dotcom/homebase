import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, AlertTriangle, AlertCircle, X } from "lucide-react";

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

const VB_W = 800;
const VB_H = 486;

type ZoneDef = { label: string; cx: number; cy: number; w: number; h: number };

const ZONES: Record<AreaKey, ZoneDef> = {
  exterior:   { label: "Exterior Systems",  cx: 404, cy: 30,  w: 784, h: 48  },
  attic:      { label: "Attic",             cx: 285, cy: 101, w: 220, h: 28  },
  bedroom:    { label: "Bedroom(s)",        cx: 145, cy: 200, w: 270, h: 128 },
  bathroom:   { label: "Bathroom(s)",       cx: 415, cy: 200, w: 270, h: 128 },
  living:     { label: "Living / Dining",   cx: 145, cy: 300, w: 270, h: 84  },
  kitchen:    { label: "Kitchen",           cx: 415, cy: 300, w: 270, h: 84  },
  mechanical: { label: "Mechanical Room",   cx: 145, cy: 386, w: 270, h: 68  },
  laundry:    { label: "Laundry Room",      cx: 415, cy: 386, w: 270, h: 68  },
  foundation: { label: "Foundation",        cx: 285, cy: 438, w: 540, h: 44  },
  garage:     { label: "Garage",            cx: 670, cy: 340, w: 220, h: 152 },
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
  const n = name.toLowerCase();
  const l = (location || "").toLowerCase();

  if (l.includes("attic")) return "attic";
  if (l.includes("garage")) return "garage";
  if (l.includes("laundry")) return "laundry";
  if (l.includes("kitchen")) return "kitchen";
  if (l.includes("bathroom") || l.includes("bath")) return "bathroom";
  if (l.includes("bedroom") || l.includes("master")) return "bedroom";
  if (l.includes("basement") || l.includes("utility") || l.includes("mechanical")) return "mechanical";
  if (l.includes("exterior") || l.includes("outside")) return "exterior";
  if (l.includes("crawl") || l.includes("foundation")) return "foundation";

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
      n.includes("air condition") || n.includes("heat pump") || n.includes("ac unit") ||
      n.includes("mini split") || n.includes("ductwork")) return "attic";

  if (n.includes("furnace") || n.includes("gas heat") || n.includes("electric heat") ||
      n.includes("boiler") || n.includes("water heater") || n.includes("electrical") ||
      n.includes("plumbing") || n.includes("copper pipe") || n.includes("pvc pipe")) return "mechanical";

  if (n.includes("washer") || n.includes("dryer")) return "laundry";

  if (n.includes("dishwasher") || n.includes("refrigerator") || n.includes("fridge") ||
      n.includes("range") || n.includes("oven") || n.includes("stove") || n.includes("microwave") ||
      n.includes("garbage disposal") || n.includes("disposal") || n.includes("freezer")) return "kitchen";

  if (n.includes("water softener") || n.includes("water filter") || n.includes("water treatment")) return "bathroom";

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
  const n = name.toLowerCase();
  for (const [key, val] of Object.entries(LIFESPANS)) {
    if (n.includes(key)) return val;
  }
  return 15;
}

function getReplacementCost(name: string): string {
  const n = name.toLowerCase();
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

const DOT_R = 8;

function placeDots(items: DotItem[], zone: ZoneDef): PlacedDot[] {
  if (items.length === 0) return [];

  const usableW = Math.max(DOT_R * 2, zone.w - DOT_R * 2);
  const usableH = Math.max(DOT_R * 2, zone.h - DOT_R * 2);

  // Reduce spacing until all rows fit within usableH.
  // Columns are always capped by usableW (never push cols beyond what fits).
  let spacing = 20;
  let cols: number;
  let rows: number;

  do {
    const maxColsByWidth = Math.max(1, Math.floor((usableW + spacing) / spacing));
    cols = Math.min(items.length, maxColsByWidth);
    rows = Math.ceil(items.length / cols);
    if (rows <= 1 || (rows - 1) * spacing <= usableH) break;
    spacing -= 2;
  } while (spacing >= 14);

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

    // Clamp to zone bounding box as a final safety net
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
}

export default function HouseMap({ houseId, homeownerId }: HouseMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: systems = [] } = useQuery<HomeSystem[]>({
    queryKey: ["/api/home-systems", houseId],
    queryFn: () => fetch(`/api/home-systems?houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

  const { data: appliances = [] } = useQuery<HomeAppliance[]>({
    queryKey: ["/api/appliances", homeownerId, houseId],
    queryFn: () => fetch(`/api/appliances?homeownerId=${encodeURIComponent(homeownerId)}&houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

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
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="w-full h-auto" style={{ maxHeight: 440 }}>

          {/* ── Exterior Systems Banner ── */}
          <rect x="8" y="6" width="784" height="48" rx="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5" />
          <text x="404" y="24" textAnchor="middle" fill="#1e3a8a" fontSize="10" fontWeight="700" letterSpacing="0.5">EXTERIOR SYSTEMS</text>
          <text x="404" y="40" textAnchor="middle" fill="#2563eb" fontSize="8">Roof · Gutters · Siding · Windows · Doors · Deck · Driveway · Solar · Fence</text>

          {/* ── Attic / Roof Triangle ── */}
          <polygon points="285,66 555,136 15,136" fill="#ddd6f3" stroke="#7c6ab5" strokeWidth="1.5" />
          <text x="285" y="124" textAnchor="middle" fill="#5b4d8a" fontSize="9.5" fontWeight="600">Attic</text>

          {/* ── Story 2 (upper floor) ── */}
          <rect x="15" y="136" width="540" height="128" fill="#ede8f8" stroke="#7c6ab5" strokeWidth="1.5" />
          <line x1="285" y1="136" x2="285" y2="264" stroke="#7c6ab5" strokeWidth="1" strokeDasharray="4 3" />

          {/* ── Story 1 (main floor) ── */}
          <rect x="15" y="264" width="540" height="152" fill="#f0edf8" stroke="#7c6ab5" strokeWidth="1.5" />
          <line x1="285" y1="264" x2="285" y2="416" stroke="#7c6ab5" strokeWidth="1" strokeDasharray="4 3" />
          {/* subtle internal divider between living and mechanical areas */}
          <line x1="15" y1="352" x2="555" y2="352" stroke="#7c6ab5" strokeWidth="0.5" strokeDasharray="2 4" opacity="0.4" />

          {/* ── Foundation strip ── */}
          <rect x="15" y="416" width="540" height="44" fill="#d1c8e8" stroke="#6b5ca0" strokeWidth="1.5" />
          <text x="285" y="441" textAnchor="middle" fill="#4a3d7a" fontSize="8.5" fontWeight="600">Foundation · Crawl Space · Sump Pump · Septic · Radon</text>

          {/* ── Garage (1 story — aligns with main floor only) ── */}
          <rect x="560" y="264" width="220" height="152" rx="4" fill="#e8e0f0" stroke="#7c6ab5" strokeWidth="1.5" />
          {/* Garage door sketch */}
          <rect x="592" y="348" width="156" height="62" rx="3" fill="none" stroke="#9480c4" strokeWidth="1.5" strokeDasharray="3 2" />
          <line x1="592" y1="369" x2="748" y2="369" stroke="#9480c4" strokeWidth="0.75" strokeDasharray="3 2" />
          <line x1="592" y1="390" x2="748" y2="390" stroke="#9480c4" strokeWidth="0.75" strokeDasharray="3 2" />
          <line x1="670" y1="348" x2="670" y2="410" stroke="#9480c4" strokeWidth="0.75" strokeDasharray="3 2" />

          {/* ── Legend ── */}
          <circle cx="18" cy="472" r="5" fill="#22c55e" />
          <text x="27" y="476" fill="#4b5563" fontSize="8.5">Good</text>
          <circle cx="62" cy="472" r="5" fill="#eab308" />
          <text x="71" y="476" fill="#4b5563" fontSize="8.5">Aging</text>
          <circle cx="107" cy="472" r="5" fill="#ef4444" />
          <text x="116" y="476" fill="#4b5563" fontSize="8.5">Replace Soon</text>
          <circle cx="175" cy="472" r="5" fill="#9ca3af" />
          <text x="184" y="476" fill="#4b5563" fontSize="8.5">Date Unknown</text>

          {/* ── Empty state ── */}
          {isEmpty && (
            <>
              <rect x="210" y="272" width="300" height="52" rx="8" fill="white" stroke="#d1d5db" strokeWidth="1.5" />
              <text x="360" y="293" textAnchor="middle" fill="#6b7280" fontSize="10" fontWeight="600">No items tracked yet</text>
              <text x="360" y="312" textAnchor="middle" fill="#9ca3af" fontSize="8.5">Add systems &amp; appliances to see them here</text>
            </>
          )}

          {/* ── Dots ── */}
          {placed.map(dot => (
            <circle
              key={dot.id}
              cx={dot.cx}
              cy={dot.cy}
              r="8"
              fill={STATUS_FILL[dot.status]}
              stroke="white"
              strokeWidth="2"
              style={{ cursor: "pointer", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.3))" }}
              onClick={e => { e.stopPropagation(); setOpenId(openId === dot.id ? null : dot.id); }}
            />
          ))}
        </svg>

        {/* ── Popover ── */}
        {openDot && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-purple-200 p-4 w-64"
            style={{
              left: `${(openDot.cx / VB_W) * 100}%`,
              top: `${(openDot.cy / VB_H) * 100}%`,
              transform: "translate(-50%, calc(-100% - 14px))",
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0"
              style={{ borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid white" }}
            />
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={() => setOpenId(null)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-2 mb-3 pr-5">
              {openDot.status === "green"  && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
              {openDot.status === "yellow" && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
              {openDot.status === "red"    && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
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
        )}
      </div>

      <p className="text-center text-xs text-gray-400 mt-1">
        Tap a dot to see details &nbsp;·&nbsp; {dots.length} item{dots.length !== 1 ? "s" : ""} tracked
      </p>
    </div>
  );
}
