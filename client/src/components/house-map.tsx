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

type AreaKey = "roof" | "attic" | "bedroom" | "bathroom" | "living" | "kitchen" | "basement" | "garage";
type StatusType = "green" | "yellow" | "red" | "unknown";

const AREAS: Record<AreaKey, { label: string; x: number; y: number }> = {
  roof:     { label: "Roof",        x: 200, y: 48  },
  attic:    { label: "Attic",       x: 200, y: 105 },
  bedroom:  { label: "Bedroom",     x: 105, y: 158 },
  bathroom: { label: "Bathroom",    x: 300, y: 158 },
  living:   { label: "Living Room", x: 105, y: 238 },
  kitchen:  { label: "Kitchen",     x: 300, y: 238 },
  basement: { label: "Basement",    x: 200, y: 308 },
  garage:   { label: "Garage",      x: 402, y: 278 },
};

const LIFESPANS: Record<string, number> = {
  "central air": 15, "central ac": 15, "hvac": 15, "air conditioner": 15, "ac unit": 15,
  "gas heat": 20, "gas furnace": 20, "electric heat": 15, "furnace": 20, "boiler": 20,
  "heat pump": 15,
  "water heater": 12, "gas water heater": 12, "electric water heater": 10,
  "electrical": 30, "electrical panel": 30,
  "plumbing": 40,
  "roof": 25,
  "security": 10, "alarm": 10,
  "solar": 25,
  "dishwasher": 10,
  "refrigerator": 13,
  "washer": 12, "dryer": 12,
  "garbage disposal": 12,
  "range": 15, "oven": 15, "stove": 15,
  "microwave": 9,
  "freezer": 16,
  "water softener": 12,
};

const REPLACEMENT_COSTS: Record<string, string> = {
  "central air": "$4,000–$8,000", "central ac": "$4,000–$8,000", "hvac": "$4,000–$8,000", "air conditioner": "$4,000–$8,000",
  "gas heat": "$2,500–$5,000", "gas furnace": "$2,500–$5,000", "furnace": "$2,500–$5,000", "boiler": "$3,000–$6,000",
  "heat pump": "$3,500–$7,500",
  "electric heat": "$1,500–$4,000",
  "water heater": "$800–$1,500", "gas water heater": "$800–$1,500", "electric water heater": "$700–$1,200",
  "electrical": "$1,500–$3,500", "electrical panel": "$1,500–$3,500",
  "plumbing": "$2,000–$15,000",
  "roof": "$7,000–$15,000",
  "security": "$300–$1,500",
  "solar": "$10,000–$25,000",
  "dishwasher": "$500–$1,200",
  "refrigerator": "$800–$2,000",
  "washer": "$500–$1,000", "dryer": "$400–$900",
  "garbage disposal": "$150–$400",
  "range": "$600–$2,000", "oven": "$600–$2,000", "stove": "$600–$2,000",
  "microwave": "$150–$600",
  "water softener": "$800–$2,500",
};

function getArea(name: string, location?: string): AreaKey {
  const n = name.toLowerCase();
  const l = (location || "").toLowerCase();

  if (n.includes("roof") || n.includes("solar")) return "roof";
  if (n.includes("central air") || n.includes("hvac") || n.includes("air condition") || n.includes("heat pump") || n.includes("ac unit")) return "attic";
  if (n.includes("water heater") || n.includes("furnace") || n.includes("gas heat") || n.includes("electric heat") ||
      n.includes("electrical") || n.includes("plumbing") || n.includes("boiler") || n.includes("washer") ||
      n.includes("dryer") || l.includes("basement") || l.includes("utility") || l.includes("laundry")) return "basement";
  if (n.includes("security") || n.includes("alarm")) return "living";
  if (n.includes("dishwasher") || n.includes("refrigerator") || n.includes("fridge") ||
      n.includes("range") || n.includes("oven") || n.includes("stove") || n.includes("microwave") ||
      n.includes("garbage disposal") || l.includes("kitchen")) return "kitchen";
  if (l.includes("bathroom") || n.includes("water softener")) return "bathroom";
  if (l.includes("garage")) return "garage";
  if (l.includes("bedroom")) return "bedroom";

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
  green: "#22c55e",
  yellow: "#eab308",
  red:    "#ef4444",
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

interface HouseMapProps {
  houseId: string;
  homeownerId: string;
  houseName?: string;
}

export default function HouseMap({ houseId, homeownerId, houseName }: HouseMapProps) {
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
      return { id: `sys-${s.id}`, name: s.systemType, make: s.brand, model: s.model, age, area: getArea(s.systemType), status, statusReason: reason, replacementCost: getReplacementCost(s.systemType), notes: s.notes };
    }),
    ...appliances.map(a => {
      const age = getAge(a);
      const { status, reason } = getStatus(a.name, age);
      return { id: `app-${a.id}`, name: a.name, make: a.make, model: a.model, age, area: getArea(a.name, a.location), status, statusReason: reason, replacementCost: getReplacementCost(a.name), notes: a.notes };
    }),
  ];

  // Group by area and offset overlapping dots
  const byArea: Partial<Record<AreaKey, DotItem[]>> = {};
  dots.forEach(d => { (byArea[d.area] ??= []).push(d); });

  const placed: PlacedDot[] = [];
  Object.entries(byArea).forEach(([area, items]) => {
    const base = AREAS[area as AreaKey];
    items!.forEach((item, i) => {
      const cols = Math.ceil(Math.sqrt(items!.length));
      const row = Math.floor(i / cols);
      const col = i % cols;
      const sp = 20;
      const totalCols = Math.min(cols, items!.length - row * cols);
      const offsetX = (col - (totalCols - 1) / 2) * sp;
      const offsetY = (row - (Math.ceil(items!.length / cols) - 1) / 2) * sp;
      placed.push({ ...item, cx: base.x + offsetX, cy: base.y + offsetY });
    });
  });

  const openDot = placed.find(d => d.id === openId);

  // If no systems or appliances, render nothing
  if (systems.length === 0 && appliances.length === 0) return null;

  return (
    <div className="mt-2">
      <div
        className="relative select-none"
        onClick={() => setOpenId(null)}
      >
        <svg
          viewBox="0 0 450 360"
          className="w-full h-auto"
          style={{ maxHeight: 340 }}
        >
          {/* ── Basement ── */}
          <rect x="25" y="275" width="340" height="70" rx="3" fill="#e8e0f0" stroke="#7c6ab5" strokeWidth="1.5" />
          <text x="195" y="294" textAnchor="middle" fill="#5b4d8a" fontSize="10" fontWeight="600">Basement / Utility</text>

          {/* ── Main floor ── */}
          <rect x="25" y="195" width="340" height="80" fill="#f0edf8" stroke="#7c6ab5" strokeWidth="1.5" />
          <line x1="195" y1="195" x2="195" y2="275" stroke="#7c6ab5" strokeWidth="1" strokeDasharray="4 3" />
          <text x="108" y="210" textAnchor="middle" fill="#5b4d8a" fontSize="9">Living Room</text>
          <text x="300" y="210" textAnchor="middle" fill="#5b4d8a" fontSize="9">Kitchen</text>

          {/* ── Upper floor ── */}
          <rect x="25" y="130" width="340" height="65" fill="#ede8f8" stroke="#7c6ab5" strokeWidth="1.5" />
          <line x1="195" y1="130" x2="195" y2="195" stroke="#7c6ab5" strokeWidth="1" strokeDasharray="4 3" />
          <text x="108" y="145" textAnchor="middle" fill="#5b4d8a" fontSize="9">Bedroom</text>
          <text x="300" y="145" textAnchor="middle" fill="#5b4d8a" fontSize="9">Bathroom</text>

          {/* ── Roof / Attic triangle ── */}
          <polygon points="195,10 370,130 20,130" fill="#ddd6f3" stroke="#7c6ab5" strokeWidth="1.5" />
          <text x="195" y="115" textAnchor="middle" fill="#5b4d8a" fontSize="9">Attic</text>
          <text x="195" y="72" textAnchor="middle" fill="#5b4d8a" fontSize="9">Roof</text>

          {/* ── Garage ── */}
          <rect x="365" y="225" width="72" height="120" rx="3" fill="#e8e0f0" stroke="#7c6ab5" strokeWidth="1.5" />
          <text x="401" y="286" textAnchor="middle" fill="#5b4d8a" fontSize="9">Garage</text>

          {/* ── Legend ── */}
          <circle cx="28" cy="342" r="5" fill="#22c55e" />
          <text x="37" y="346" fill="#4b5563" fontSize="8.5">Good</text>
          <circle cx="70" cy="342" r="5" fill="#eab308" />
          <text x="79" y="346" fill="#4b5563" fontSize="8.5">Aging</text>
          <circle cx="113" cy="342" r="5" fill="#ef4444" />
          <text x="122" y="346" fill="#4b5563" fontSize="8.5">Replace</text>
          <circle cx="163" cy="342" r="5" fill="#9ca3af" />
          <text x="172" y="346" fill="#4b5563" fontSize="8.5">Unknown</text>

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
              style={{ cursor: "pointer", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.35))" }}
              onClick={e => { e.stopPropagation(); setOpenId(openId === dot.id ? null : dot.id); }}
            />
          ))}
        </svg>

        {/* ── Popover panel (positioned over SVG) ── */}
        {openDot && (
          <div
            className="absolute z-50 bg-white rounded-xl shadow-2xl border border-purple-200 p-4 w-64"
            style={{
              left: `${(openDot.cx / 450) * 100}%`,
              top: `${(openDot.cy / 360) * 100}%`,
              transform: "translate(-50%, calc(-100% - 14px))",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Arrow */}
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
              {openDot.status === "green"   && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />}
              {openDot.status === "yellow"  && <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />}
              {openDot.status === "red"     && <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />}
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
              openDot.status === "red"     ? "bg-red-50 text-red-700" :
              openDot.status === "yellow"  ? "bg-yellow-50 text-yellow-700" :
              openDot.status === "green"   ? "bg-green-50 text-green-700" :
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
        Tap a dot to see system details &nbsp;·&nbsp; {dots.length} item{dots.length !== 1 ? "s" : ""} tracked
      </p>
    </div>
  );
}
