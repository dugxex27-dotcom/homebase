import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Thermometer, Zap, Droplets, Shield, Sun, Home, Wrench, Wind, Flame, Snowflake, Waves, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  | "exterior" | "attic" | "bedroom" | "bathroom"
  | "living" | "kitchen" | "mechanical" | "laundry"
  | "foundation" | "garage";

type ZoneKey = "roof" | "attic" | "bedroom" | "bathroom" | "kitchen" | "living" | "utility" | "garage" | "basement";

type StatusType = "green" | "yellow" | "red" | "unknown";

// ─── Zone config ──────────────────────────────────────────────────────────────

const ZONE_LABELS: Record<ZoneKey, string> = {
  roof: "Roof",
  attic: "Attic",
  bedroom: "Bedrooms",
  bathroom: "Bathrooms",
  kitchen: "Kitchen",
  living: "Living Room",
  utility: "Utility",
  garage: "Garage",
  basement: "Basement",
};

const UPPER_ZONES: ZoneKey[] = ["roof", "attic", "bedroom", "bathroom"];
const LOWER_ZONES: ZoneKey[] = ["kitchen", "living", "utility", "garage", "basement"];

function areaToZone(area: AreaKey): ZoneKey {
  const map: Record<AreaKey, ZoneKey> = {
    exterior: "roof",
    attic: "attic",
    bedroom: "bedroom",
    bathroom: "bathroom",
    living: "living",
    kitchen: "kitchen",
    mechanical: "utility",
    laundry: "utility",
    foundation: "basement",
    garage: "garage",
  };
  return map[area];
}

// ─── Status / color maps ──────────────────────────────────────────────────────

const DOT_COLORS: Record<StatusType, string> = {
  green: "#4a9e2f",
  yellow: "#e8a020",
  red: "#e03e3e",
  unknown: "#c4c1e0",
};

const BADGE: Record<StatusType, { bg: string; color: string; label: string }> = {
  green:   { bg: "#e8f5e0", color: "#2d7a10", label: "Good" },
  yellow:  { bg: "#fdf3e0", color: "#b07010", label: "Aging" },
  red:     { bg: "#fde8e8", color: "#c02020", label: "Replace soon" },
  unknown: { bg: "#EEEDFE", color: "#534AB7", label: "Unknown" },
};

const ICON_BG: Record<StatusType, string> = {
  green:   "#e8f5e0",
  yellow:  "#fdf3e0",
  red:     "#fde8e8",
  unknown: "#EEEDFE",
};

const ALERT_TEXT: Record<StatusType, string> = {
  green:   "#2d7a10",
  yellow:  "#b07010",
  red:     "#c02020",
  unknown: "#534AB7",
};

const ALERT_BG: Record<StatusType, string> = {
  green:   "#e8f5e0",
  yellow:  "#fdf3e0",
  red:     "#fde8e8",
  unknown: "#EEEDFE",
};

// ─── Lifespans & replacement costs ───────────────────────────────────────────

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

// ─── Helper functions ─────────────────────────────────────────────────────────

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

function computeScoreImpact(status: StatusType, age: number | null, name: string): string {
  if (age === null) return "—";
  const lifespan = getLifespan(name);
  const pct = age / lifespan;
  if (status === "red") {
    const pts = Math.round(Math.min(80, Math.max(20, (pct - 0.8) * 250 + 20)));
    return `−${pts} pts`;
  }
  if (status === "yellow") {
    const pts = Math.round(Math.min(40, Math.max(8, (pct - 0.5) * 100 + 8)));
    return `−${pts} pts`;
  }
  if (status === "green") {
    const pts = Math.round(Math.min(50, ((lifespan - age) / lifespan) * 50));
    return pts > 0 ? `+${pts} pts` : "0 pts";
  }
  return "—";
}

function getSystemIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("heat") || n.includes("furnace") || n.includes("boiler") || n.includes("radiant") || n.includes("fireplace")) return Flame;
  if (n.includes("cool") || n.includes("ac unit") || n.includes("air condition")) return Snowflake;
  if (n.includes("hvac") || n.includes("mini split") || n.includes("ductless") || n.includes("ductwork") || n.includes("air handler")) return Wind;
  if (n.includes("solar")) return Sun;
  if (n.includes("water") || n.includes("plumb") || n.includes("sump") || n.includes("well") || n.includes("septic") || n.includes("pool")) return Droplets;
  if (n.includes("electric") || n.includes("panel") || n.includes("generator")) return Zap;
  if (n.includes("security") || n.includes("alarm") || n.includes("smoke") || n.includes("carbon") || n.includes("radon")) return Shield;
  if (n.includes("roof") || n.includes("siding") || n.includes("window") || n.includes("door") || n.includes("gutter") || n.includes("fence") || n.includes("deck") || n.includes("driveway")) return Home;
  if (n.includes("therm") || n.includes("heat pump")) return Thermometer;
  if (n.includes("wash") || n.includes("dryer") || n.includes("dishwasher")) return Waves;
  return Wrench;
}

// ─── DotItem ──────────────────────────────────────────────────────────────────

type DotItem = {
  id: string;
  name: string;
  make?: string | null;
  model?: string | null;
  age: number | null;
  area: AreaKey;
  zone: ZoneKey;
  status: StatusType;
  statusReason: string;
  replacementCost: string;
  notes?: string | null;
};

interface HealthScoreData {
  score: number;
  completedTasks: number;
  missedTasks: number;
  totalExpectedTasks: number;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface HouseMapProps {
  houseId: string;
  homeownerId: string;
  houseName?: string;
  houseAddress?: string;
  checkedSystems?: string[];
  strictChecked?: boolean;
  compact?: boolean;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ZoneCard({ zone, items, selected, onClick }: {
  zone: ZoneKey;
  items: DotItem[];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 0",
        minWidth: 0,
        width: "100%",
        background: selected ? "#EEEDFE" : "#fff",
        borderRadius: "10px",
        border: selected ? "1.5px solid #534AB7" : "1px solid rgba(83,74,183,0.1)",
        padding: "9px 8px 8px",
        cursor: "pointer",
        minHeight: "54px",
        textAlign: "left",
        transition: "border-color 0.15s, background 0.15s",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.35)";
      }}
      onMouseLeave={e => {
        if (!selected) (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.1)";
      }}
    >
      <div style={{
        fontSize: "9px",
        fontWeight: 700,
        color: "#9b97c4",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: "6px",
      }}>
        {ZONE_LABELS[zone]}
      </div>
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
        {items.length === 0 ? (
          <div style={{
            width: "9px", height: "9px", borderRadius: "50%",
            background: "#e5e3f0", opacity: 0.5,
          }} />
        ) : (
          items.map(item => (
            <div
              key={item.id}
              title={item.name}
              style={{
                width: "9px", height: "9px", borderRadius: "50%",
                background: DOT_COLORS[item.status],
                cursor: "pointer",
                transition: "transform 0.1s",
              }}
            />
          ))
        )}
      </div>
    </button>
  );
}

function SystemRow({ dot, onClick }: { dot: DotItem; onClick: () => void }) {
  const Icon = getSystemIcon(dot.name);
  const b = BADGE[dot.status];
  const ageLabel = dot.age !== null ? `${dot.age} yr${dot.age !== 1 ? "s" : ""} old` : "Age unknown";
  const detail = [dot.make, dot.model, ageLabel].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#f8f7fd",
        borderRadius: "12px",
        border: "1px solid rgba(83,74,183,0.08)",
        padding: "10px 12px",
        cursor: "pointer",
        transition: "border-color 0.15s",
        width: "100%",
        textAlign: "left",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.25)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(83,74,183,0.08)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{
          width: "34px", height: "34px", borderRadius: "10px",
          background: ICON_BG[dot.status],
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={BADGE[dot.status].color} />
        </div>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#2d1f6e" }}>{dot.name}</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#9b97c4", marginTop: "1px" }}>{detail}</div>
        </div>
      </div>
      <div style={{
        fontSize: "10px", fontWeight: 700,
        padding: "4px 9px", borderRadius: "8px",
        background: b.bg, color: b.color,
        letterSpacing: "0.02em", flexShrink: 0,
      }}>
        {b.label}
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HouseMap({
  houseId,
  homeownerId,
  houseName,
  houseAddress,
  checkedSystems = [],
  strictChecked = false,
  compact = false,
}: HouseMapProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedZone, setSelectedZone] = useState<ZoneKey | null>(null);

  const { data: systems = [] } = useQuery<HomeSystem[]>({
    queryKey: ["/api/home-systems", houseId],
    queryFn: () => fetch(`/api/home-systems?houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

  const { data: appliances = [] } = useQuery<HomeAppliance[]>({
    queryKey: ["/api/appliances", homeownerId, houseId],
    queryFn: () => fetch(`/api/appliances?homeownerId=${encodeURIComponent(homeownerId)}&houseId=${encodeURIComponent(houseId)}`).then(r => r.json()),
  });

  const { data: scoreData } = useQuery<HealthScoreData>({
    queryKey: ["/api/houses", houseId, "health-score"],
    enabled: !!houseId && !compact,
  });

  const normalize = (s: string) => s.toLowerCase().replace(/[-_\s/\\()&,]+/g, "");

  let dots: DotItem[];

  if (strictChecked || checkedSystems.length > 0) {
    dots = checkedSystems.map(v => {
      const dbRecord = systems.find(s => normalize(s.systemType) === normalize(v));
      if (dbRecord) {
        const age = getAge(dbRecord);
        const { status, reason } = getStatus(dbRecord.systemType, age);
        const area = getArea(dbRecord.systemType);
        return {
          id: `sys-${dbRecord.id}`, name: dbRecord.systemType, make: dbRecord.brand, model: dbRecord.model,
          age, area, zone: areaToZone(area), status, statusReason: reason,
          replacementCost: getReplacementCost(dbRecord.systemType), notes: dbRecord.notes,
        };
      }
      const area = getArea(v);
      return {
        id: `chk-${v}`, name: v, make: null, model: null,
        age: null, area, zone: areaToZone(area), status: "unknown" as StatusType,
        statusReason: "Installation date not recorded — add it in your home record for accurate tracking.",
        replacementCost: getReplacementCost(v), notes: null,
      };
    });
  } else {
    dots = [
      ...systems.map(s => {
        const age = getAge(s);
        const { status, reason } = getStatus(s.systemType, age);
        const area = getArea(s.systemType);
        return {
          id: `sys-${s.id}`, name: s.systemType, make: s.brand, model: s.model,
          age, area, zone: areaToZone(area), status, statusReason: reason,
          replacementCost: getReplacementCost(s.systemType), notes: s.notes,
        };
      }),
      ...appliances.map(a => {
        const age = getAge(a);
        const { status, reason } = getStatus(a.name, age);
        const area = getArea(a.name, a.location);
        return {
          id: `app-${a.id}`, name: a.name, make: a.make, model: a.model,
          age, area, zone: areaToZone(area), status, statusReason: reason,
          replacementCost: getReplacementCost(a.name), notes: a.notes,
        };
      }),
    ];
  }

  // Group by zone
  const byZone: Partial<Record<ZoneKey, DotItem[]>> = {};
  dots.forEach(d => { (byZone[d.zone] ??= []).push(d); });

  // Which zones have items (show all zones always per spec, even if empty)
  const showUpperZones = UPPER_ZONES;
  const showLowerZones = LOWER_ZONES;

  // Filter dots for systems list based on selected zone
  const visibleDots = selectedZone ? (byZone[selectedZone] ?? []) : dots;

  const openDot = dots.find(d => d.id === openId);

  const [showHwsInfo, setShowHwsInfo] = useState(false);

  // Score ring
  const rawScore = scoreData ? Math.max(0, scoreData.score) : 0;
  const scoreColor = rawScore > 750 ? "#4a9e2f" : rawScore > 500 ? "#e8a020" : "#e03e3e";
  const circumference = 2 * Math.PI * 22; // r=22 in 52×52 SVG
  const scoreOffset = circumference - (Math.min(rawScore, 1000) / 1000) * circumference;

  const sectionLabel: React.CSSProperties = {
    fontSize: "10px", fontWeight: 700, color: "#9b97c4",
    letterSpacing: "0.1em", textTransform: "uppercase",
    marginBottom: "8px", marginTop: "2px",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Property Card Header (full mode only) ─────────────────────── */}
      {!compact && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
        }}>
          <div>
            {houseName && (
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#2d1f6e", marginBottom: "3px" }}>
                {houseName}
              </div>
            )}
            <div style={{ fontSize: "12px", color: "#9b97c4" }}>
              {houseAddress ? `${houseAddress} · ` : ""}{dots.length} system{dots.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* HWS Score Ring */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <svg width="52" height="52" viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="22" fill="none" stroke="#EEEDFE" strokeWidth="4" />
              <circle
                cx="26" cy="26" r="22" fill="none"
                stroke={scoreColor} strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={scoreOffset}
                strokeLinecap="round"
                transform="rotate(-90 26 26)"
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
              <text x="26" y="31" textAnchor="middle" fontSize="12" fontWeight="700"
                fill="#2d1f6e" fontFamily="Inter,system-ui,sans-serif">
                {rawScore}
              </text>
            </svg>
            <button
              onClick={() => setShowHwsInfo(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: "3px",
                background: "none", border: "none", cursor: "pointer",
                padding: "2px 4px", marginTop: "2px",
              }}
              title="Home Wellness Score™ — tap to learn more"
            >
              <span style={{
                fontSize: "9px", color: "#9b97c4",
                letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700,
              }}>HWS</span>
              <Info size={10} color="#b6a6f4" />
            </button>

            {/* HWS full-screen modal overlay */}
            {showHwsInfo && (
              <div
                onClick={() => setShowHwsInfo(false)}
                style={{
                  position: "fixed", inset: 0, zIndex: 2000,
                  background: "rgba(45,31,110,0.55)",
                  display: "flex", alignItems: "flex-end", justifyContent: "center",
                  padding: "0",
                }}
              >
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: "100%", maxWidth: "480px",
                    height: "90vh",
                    borderRadius: "20px 20px 0 0",
                    overflow: "hidden",
                    boxShadow: "0 -8px 40px rgba(45,31,110,0.25)",
                    position: "relative",
                    background: "#fff",
                  }}
                >
                  <button
                    onClick={() => setShowHwsInfo(false)}
                    style={{
                      position: "absolute", top: 12, right: 12, zIndex: 10,
                      width: 28, height: 28, borderRadius: "50%",
                      background: "rgba(83,74,183,0.1)", border: "none",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#534AB7",
                    }}
                  >
                    <X size={14} />
                  </button>
                  <iframe
                    src="/hws-modal.html"
                    title="Home Wellness Score™"
                    style={{ width: "100%", height: "100%", border: "none", display: "block" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Floor Plan Zone Grid ──────────────────────────────────────── */}
      <div style={{
        background: "#f0eef8", borderRadius: "12px",
        padding: "12px", marginBottom: "12px",
      }}>
        {/* Upper floor */}
        <div style={{
          fontSize: "9px", fontWeight: 700, color: "#9b97c4",
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: "8px",
        }}>
          Upper floor
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: "6px", marginBottom: "8px" }}>
          {showUpperZones.map(zone => (
            <ZoneCard
              key={zone}
              zone={zone}
              items={byZone[zone] ?? []}
              selected={selectedZone === zone}
              onClick={() => setSelectedZone(prev => prev === zone ? null : zone)}
            />
          ))}
        </div>

        {/* Lower floor */}
        <div style={{
          fontSize: "9px", fontWeight: 700, color: "#9b97c4",
          letterSpacing: "0.1em", textTransform: "uppercase",
          marginBottom: "8px", marginTop: "2px",
        }}>
          Lower floor
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))", gap: "6px" }}>
          {showLowerZones.map(zone => (
            <ZoneCard
              key={zone}
              zone={zone}
              items={byZone[zone] ?? []}
              selected={selectedZone === zone}
              onClick={() => setSelectedZone(prev => prev === zone ? null : zone)}
            />
          ))}
        </div>
      </div>

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "12px",
        marginBottom: "12px", flexWrap: "wrap",
      }}>
        {([
          { color: "#4a9e2f", label: "Good" },
          { color: "#e8a020", label: "Aging" },
          { color: "#e03e3e", label: "Replace soon" },
          { color: "#c4c1e0", label: "Unknown" },
        ] as const).map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: color }} />
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#9b97c4" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── Systems List (full mode only) ────────────────────────────── */}
      {!compact && (
        <>
          <div style={sectionLabel}>
            {selectedZone ? `${ZONE_LABELS[selectedZone]} Systems` : "Systems"}
            {selectedZone && (
              <button
                onClick={() => setSelectedZone(null)}
                style={{
                  marginLeft: "8px", fontSize: "9px", fontWeight: 700,
                  color: "#534AB7", background: "none", border: "none",
                  cursor: "pointer", textTransform: "lowercase", letterSpacing: 0,
                }}
              >
                (show all)
              </button>
            )}
          </div>

          {visibleDots.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "20px",
              background: "#f8f7fd", borderRadius: "12px",
              border: "1px solid rgba(83,74,183,0.08)",
            }}>
              <p style={{ fontSize: "13px", fontWeight: 600, color: "#9b97c4" }}>
                {selectedZone ? `No systems tracked in ${ZONE_LABELS[selectedZone]}` : "No systems tracked yet"}
              </p>
              <p style={{ fontSize: "11px", color: "#c4c1e0", marginTop: "4px" }}>
                Add systems in your Home Record to see them here
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {visibleDots.map(dot => (
                <SystemRow key={dot.id} dot={dot} onClick={() => setOpenId(dot.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── System Detail Modal ──────────────────────────────────────── */}
      {openDot && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(45,31,110,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setOpenId(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: "16px",
              padding: "18px", width: "100%", maxWidth: "380px",
              position: "relative",
              maxHeight: "90dvh", overflowY: "auto",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px", height: "36px", borderRadius: "10px",
                  background: ICON_BG[openDot.status],
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  {(() => { const Icon = getSystemIcon(openDot.name); return <Icon size={18} color={BADGE[openDot.status].color} />; })()}
                </div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#2d1f6e" }}>
                  {openDot.name}
                </div>
              </div>
              <button
                onClick={() => setOpenId(null)}
                style={{
                  width: "26px", height: "26px", background: "#f0eef8",
                  borderRadius: "50%", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#9b97c4", fontWeight: 700, fontSize: "11px",
                  flexShrink: 0,
                }}
              >
                <X size={12} />
              </button>
            </div>

            {/* HWS impact badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "#EEEDFE", borderRadius: "10px",
              padding: "6px 10px", marginBottom: "12px",
            }}>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "#534AB7", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                HWS Impact
              </span>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#2d1f6e" }}>
                {computeScoreImpact(openDot.status, openDot.age, openDot.name)}
              </span>
            </div>

            {/* 2×2 stat grid */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: "8px", marginBottom: "12px",
            }}>
              {([
                { label: "Make",             value: openDot.make  || "—" },
                { label: "Model",            value: openDot.model || "—" },
                { label: "Age",              value: openDot.age !== null ? `${openDot.age} yr${openDot.age !== 1 ? "s" : ""}` : "Unknown" },
                { label: "Est. Replace Cost", value: openDot.replacementCost },
              ] as const).map(({ label, value }) => (
                <div key={label} style={{ background: "#f0eef8", borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "9px", color: "#9b97c4", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#2d1f6e" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Alert / status message */}
            <div style={{
              background: ALERT_BG[openDot.status],
              borderRadius: "10px", padding: "10px 13px",
              fontSize: "12px", color: ALERT_TEXT[openDot.status],
              lineHeight: "1.55", fontWeight: 600,
            }}>
              {openDot.statusReason}
            </div>

            {/* Notes */}
            {openDot.notes && (
              <div style={{
                marginTop: "10px", fontSize: "11px", color: "#9b97c4",
                fontStyle: "italic", borderTop: "1px solid rgba(83,74,183,0.08)",
                paddingTop: "10px",
              }}>
                {openDot.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
