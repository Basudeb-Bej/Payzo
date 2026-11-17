// frontend/src/components/sidebar/analytics.jsx
import { useMemo, useState } from "react";
import { compactInr, inr } from "./Formatters.js";
import { useTheme } from "../theme/ThemeProvider.jsx";

export function MoneyFlowCard({ txs, range, onRangeChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [flowType, setFlowType] = useState("all"); // all | in | out
  const { isDark } = useTheme();

  const filteredTxs = useMemo(() => {
    if (flowType === "all") return txs;
    if (flowType === "out") return txs.filter((t) => t.direction === "out");
    return txs.filter((t) => t.direction !== "out");
  }, [txs, flowType]);

  const series = useMemo(() => {
    if (range === "recent") {
      const items = [...filteredTxs].slice(0, 7).reverse();
      if (items.length === 0) return [{ label: "Today", value: 0 }];
      return items.map((t, idx) => ({
        label:
          new Date(t.created_at + "Z").toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }) || `#${idx + 1}`,
        value: Number(t.amount || 0),
      }));
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const buckets = new Map();
    for (const t of filteredTxs) {
      const d = new Date(t.created_at + "Z");
      const m = Number.isNaN(d.getTime()) ? "Now" : months[d.getMonth()];
      buckets.set(m, (buckets.get(m) || 0) + Number(t.amount || 0));
    }

    if (buckets.size === 0) {
      return months.slice(0, 6).map((m) => ({ label: m, value: 0 }));
    }

    return Array.from(buckets.entries()).map(([label, value]) => ({ label, value }));
  }, [filteredTxs, range]);

  const totalVolume = useMemo(() => series.reduce((sum, s) => sum + s.value, 0), [series]);

  const width = 660;
  const height = 225;
  const padLeft = 56;
  const padRight = 24;
  const padTop = 40;
  const padBottom = 28;
  const maxVal = Math.max(...series.map((s) => s.value), 100);

  const points = series.map((item, idx) => {
    const x =
      series.length === 1
        ? (padLeft + width - padRight) / 2
        : padLeft + (idx / (series.length - 1)) * (width - padLeft - padRight);
    const y = height - padBottom - (item.value / maxVal) * (height - padTop - padBottom);
    return { ...item, x, y };
  });

  const linePath = points.reduce((acc, pt, idx) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, "");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padBottom} L ${points[0].x} ${height - padBottom} Z`
      : "";

  const activeIdx = hoveredIdx !== null ? hoveredIdx : points.length - 1;
  const activePoint = points[activeIdx];

  const strokeColor =
    flowType === "out"
      ? isDark ? "#FB7185" : "#E11D48"
      : flowType === "in"
        ? isDark ? "#34D399" : "#059669"
        : isDark ? "#F1F5F9" : "#0F172A";

  const gradColor =
    flowType === "out"
      ? isDark ? "#FB7185" : "#E11D48"
      : flowType === "in"
        ? isDark ? "#34D399" : "#059669"
        : isDark ? "#818CF8" : "#4F46E5";

  const gridColor = isDark ? "#334155" : "#E2E8F0";
  const crosshairColor = isDark ? "#475569" : "#CBD5E1";
  const tooltipFill = isDark ? "#334155" : "#0B1246";
  const dotRing = isDark ? "#0F172A" : "#FFFFFF";

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Money Flow</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {inr(totalVolume)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Volume across your wallet activity
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Flow Type Filter */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            {[
              { id: "all", label: "All" },
              { id: "in", label: "Inflow" },
              { id: "out", label: "Outflow" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFlowType(item.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${flowType === item.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Range Switcher */}
          <div className="flex rounded-xl bg-slate-100 p-0.5 dark:bg-slate-800">
            {[
              { id: "monthly", label: "Monthly" },
              { id: "recent", label: "Recent 7" },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onRangeChange(r.id)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${range === r.id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full select-none">
          <defs>
            <linearGradient id="payzoFlowGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradColor} stopOpacity="0.22" />
              <stop offset="100%" stopColor={gradColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines + Y-Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = height - padBottom - ratio * (height - padTop - padBottom);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={width - padRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] tabular-nums"
                >
                  {compactInr(maxVal * ratio)}
                </text>
              </g>
            );
          })}

          {areaPath && <path d={areaPath} fill="url(#payzoFlowGrad)" />}

          {/* Vertical Crosshair on Active Point */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={padTop}
              x2={activePoint.x}
              y2={height - padBottom}
              stroke="#CBD5E1"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
          )}

          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          )}

          {/* Floating Dark Tooltip Pill */}
          {activePoint && (
            <g
              transform={`translate(${Math.min(
                Math.max(activePoint.x, padLeft + 54),
                width - padRight - 54
              )}, ${Math.max(activePoint.y - 12, 28)})`}
              className="pointer-events-none"
            >
              <rect x="-54" y="-26" width="108" height="23" rx="7" fill="#0B1246" />
              <polygon points="-4,-3 4,-3 0,2" fill="#0B1246" />
              <text
                x="0"
                y="-11"
                textAnchor="middle"
                className="fill-white text-[10px] font-semibold tabular-nums"
              >
                {`${activePoint.label} · ${compactInr(activePoint.value)}`}
              </text>
            </g>
          )}

          {points.map((pt, idx) => (
            <g
              key={`${pt.label}-${idx}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="cursor-pointer"
            >
              <circle cx={pt.x} cy={pt.y} r="16" fill="transparent" />
              {activeIdx === idx && (
                <circle cx={pt.x} cy={pt.y} r="9" fill={gradColor} fillOpacity="0.16" />
              )}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={activeIdx === idx ? 5 : 3.5}
                fill={activeIdx === idx ? gradColor : strokeColor}
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              <text
                x={pt.x}
                y={height - 6}
                textAnchor="middle"
                className={`text-[11px] ${activeIdx === idx ? "fill-slate-900 font-semibold dark:fill-slate-100" : "fill-slate-400"
                  }`}
              >
                {pt.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

export function StatisticsCard({ stats }) {
  const net = Number(stats.totalIn || 0) - Number(stats.totalOut || 0);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Statistics</h2>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${net >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300"
            }`}
        >
          Net flow: {net >= 0 ? "+" : "−"}
          {compactInr(Math.abs(net))}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <StatItem
          label="Total Inflow"
          value={compactInr(stats.totalIn)}
          color="bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
          icon="in"
        />
        <StatItem
          label="Total Sent"
          value={compactInr(stats.totalOut)}
          color="bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400"
          icon="out"
        />
        <StatItem
          label="Top-ups"
          value={compactInr(stats.totalTopup)}
          color="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
          icon="topup"
        />
        <StatItem
          label="Transactions"
          value={String(stats.count)}
          color="bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
          icon="count"
        />
      </div>
    </section>
  );
}

function StatItem({ label, value, color, icon }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:border-slate-200 hover:bg-white dark:border-slate-800 dark:bg-slate-800/60 dark:hover:border-slate-600 dark:hover:bg-slate-800">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color}`}>
        {icon === "in" && (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        )}
        {icon === "out" && (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
            <polyline points="17 18 23 18 23 12" />
          </svg>
        )}
        {icon === "topup" && (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
        {icon === "count" && (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="7" y1="9" x2="17" y2="9" />
            <line x1="7" y1="13" x2="13" y2="13" />
          </svg>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-bold tabular-nums text-slate-900 dark:text-slate-100">{value}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}