import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage, tr } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({});

export function EmptyState() {
  const navigate = useNavigate();
  const currentLang = useLanguage();
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center flex flex-col items-center justify-center animate-fade-in">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-teal shadow-card-soft">
        <ArrowRight className="h-7 w-7 text-teal" />
      </div>
      <h1 className="mt-6 font-display text-2xl font-bold tracking-tight text-foreground">
        {tr("emptyStateTitle", currentLang)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-md">
        {tr("emptyStateDesc", currentLang)}
      </p>

      <Button
        type="button"
        onClick={() => {
          console.log("Start Assessment clicked");
          navigate({ to: "/assessment" });
        }}
        className="mt-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all font-semibold px-6 py-2 h-11 cursor-pointer"
      >
        <span>{tr("startAssessment", currentLang)}</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function LedgerTable({
  items,
}: {
  items: Array<{
    parameter: string;
    value: string;
    reference: string;
    status?: string;
    statusColor?: string;
  }>;
}) {
  const currentLang = useLanguage();
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{tr("parameterDesc", currentLang)}</th>
            <th className="px-4 py-3 text-right font-semibold">{tr("resultValue", currentLang)}</th>
            <th className="px-4 py-3 font-semibold">{tr("referenceInterval", currentLang)}</th>
            <th className="px-4 py-3 text-right font-semibold">{tr("status", currentLang)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-surface">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-accent/5 transition-colors">
              <td className="px-4 py-3 font-semibold text-foreground">{item.parameter}</td>
              <td className="px-4 py-3 text-right font-bold text-teal font-mono">{item.value}</td>
              <td className="px-4 py-3 text-muted-foreground">{item.reference}</td>
              <td className="px-4 py-3 text-right">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                    item.statusColor || "bg-accent text-accent-foreground border border-border/50"
                  }`}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {item.status || tr("recordedStatus", currentLang)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RiskLedgerTable({
  items,
}: {
  items: Array<{
    condition: string;
    score: number;
    classification: string;
    color: string;
    rationale: string;
  }>;
}) {
  const currentLang = useLanguage();
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">{tr("analyzedCondition", currentLang)}</th>
            <th className="px-4 py-3 text-right font-semibold">{tr("riskIndex", currentLang)}</th>
            <th className="px-4 py-3 font-semibold">{tr("riskLevel", currentLang)}</th>
            <th className="px-4 py-3 font-semibold">{tr("statisticalRationale", currentLang)}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40 bg-surface">
          {items.map((item, idx) => (
            <tr key={idx} className="hover:bg-accent/5 transition-colors">
              <td className="px-4 py-3 font-semibold text-foreground">{item.condition}</td>
              <td
                className="px-4 py-3 text-right font-bold font-mono"
                style={{ color: item.color }}
              >
                {item.score}/100
              </td>
              <td className="px-4 py-3">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                  style={{
                    color: item.color,
                    backgroundColor: `${item.color}08`,
                    border: `1px solid ${item.color}20`,
                  }}
                >
                  <span className="h-1 w-1 rounded-full bg-current" />
                  {item.classification}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground max-w-sm truncate">
                {item.rationale}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
