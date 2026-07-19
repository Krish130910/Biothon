import { createLazyFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useHealthResult, useProfile, useHistory } from "@/lib/health-store";
import { useLanguage, tr } from "@/lib/i18n";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  Brain,
  Download,
  TrendingDown,
  Info,
  Stethoscope,
  RefreshCw,
  Loader2,
  Activity,
  ClipboardList,
  Upload,
  FileText,
  AlertTriangle,
  Star,
  CheckCircle2,
  RotateCcw,
  HeartPulse,
  Scale,
  Droplets,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api-client";
import { startMeasure, endMeasure } from "@/lib/timing";
import { EmptyState } from "./_app.dashboard";
import SplitText from "@/components/ui/split-text";
import { cn } from "@/lib/utils";

export const Route = createLazyFileRoute("/_app/dashboard")({
  component: Dashboard,
});

// ─── Animated counter ──────────────────────────────────────────────────────
function AnimatedScore({ score, suffix = "" }: { score: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let v = 0;
    const duration = 900;
    const step = Math.max(Math.floor(duration / score), 10);
    const t = setInterval(() => {
      v += 1;
      setCurrent(v);
      if (v >= score) clearInterval(t);
    }, step);
    return () => clearInterval(t);
  }, [score]);
  return <>{current}{suffix}</>;
}

// ─── Color helpers ────────────────────────────────────────────────────────
const CHART_GREEN = "#10b981";
const CHART_AMBER = "#f59e0b";
const CHART_RED   = "#ef4444";

function riskColor(score: number) {
  if (score < 33) return CHART_GREEN;
  if (score < 66) return CHART_AMBER;
  return CHART_RED;
}

function riskLabel(score: number) {
  if (score < 33) return "Low";
  if (score < 66) return "Moderate";
  return "High";
}

// ─── Star rating component ─────────────────────────────────────────────────
function Stars({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < count ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </span>
  );
}

// ─── Medical disclaimer card ──────────────────────────────────────────────
function MedicalDisclaimer() {
  return (
    <div className="rounded-2xl border border-amber-400/40 bg-amber-400/5 p-5 flex gap-4">
      <div className="shrink-0 mt-0.5">
        <div className="h-9 w-9 rounded-xl bg-amber-400/15 flex items-center justify-center">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-500" strokeWidth={2} />
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest mb-1.5">
          ⚕ Medical Disclaimer
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          HealthGuard provides <span className="font-semibold text-foreground">educational</span> risk
          assessments and preventive insights. It is{" "}
          <span className="font-semibold text-foreground">NOT</span> intended to diagnose, treat, or
          replace professional medical advice. Always consult a{" "}
          <span className="font-semibold text-foreground">licensed physician</span> for diagnosis and treatment.
        </p>
      </div>
    </div>
  );
}

// ─── Empty / onboarding hero shown before any assessment ─────────────────
function HeroOnboarding() {
  const navigate = useNavigate();
  return (
    <div className="w-full px-4 py-3 space-y-4">
      {/* Hero */}
      <div className="text-center space-y-3 pt-2">
        <Badge variant="secondary" className="rounded-full text-[11px] font-semibold">
          Clinical Risk Engine
        </Badge>
        <SplitText
          text="Risk Dashboard"
          className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
          delay={40}
          duration={0.65}
          ease="power3.out"
          splitType="chars"
          tag="h1"
          textAlign="center"
        />
        <p className="text-muted-foreground text-base max-w-sm mx-auto leading-relaxed">
          Understand your health.{" "}
          <span className="text-foreground font-medium">Detect risks early.</span>{" "}
          Take preventive action.
        </p>
      </div>

      {/* Two path cards */}
      <div>
        <p className="text-center text-sm font-semibold text-muted-foreground mb-5">
          How would you like to begin?
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Card 1 — Blood Report */}
          <button
            onClick={() => navigate({ to: "/report" })}
            className="group text-left rounded-2xl border border-border bg-surface p-6 hover:border-teal/40 hover:bg-teal/[0.03] transition-all duration-200 flex flex-col gap-4 shadow-sm hover:shadow-md"
          >
            <div className="h-11 w-11 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal">
              <Upload className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="font-display font-bold text-base text-foreground">Upload Blood Report</h2>
              <ul className="text-xs text-muted-foreground space-y-1 mt-2 leading-relaxed">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-teal shrink-0" /> AI extracts lab values automatically</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-teal shrink-0" /> Instant health analysis</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-teal shrink-0" /> OCR + value verification</li>
              </ul>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-teal group-hover:gap-3 transition-all duration-200">
              Upload Report <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Card 2 — Assessment */}
          <button
            onClick={() => navigate({ to: "/assessment" })}
            className="group text-left rounded-2xl border border-border bg-surface p-6 hover:border-primary/40 hover:bg-primary/[0.03] transition-all duration-200 flex flex-col gap-4 shadow-sm hover:shadow-md"
          >
            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-1">
              <h2 className="font-display font-bold text-base text-foreground">Complete Assessment</h2>
              <ul className="text-xs text-muted-foreground space-y-1 mt-2 leading-relaxed">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Lifestyle questionnaire</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Symptoms &amp; family history</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" /> Personalized risk score</li>
              </ul>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-primary group-hover:gap-3 transition-all duration-200">
              Start Assessment <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>

      {/* Combined option */}
      <div className="rounded-2xl border border-border bg-gradient-to-br from-teal/5 via-surface to-primary/5 p-6 text-center space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Want the most accurate result?
        </p>
        <div className="flex items-center justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-teal" /> Upload Blood Report
          </div>
          <span className="text-muted-foreground font-bold">+</span>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Complete Assessment
          </div>
        </div>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Combining both provides the most personalized health insights.
        </p>
        <Button
          onClick={() => navigate({ to: "/report" })}
          className="bg-teal text-white hover:bg-teal/90 font-semibold px-8 h-10 rounded-xl shadow-sm"
        >
          Get Complete Analysis
        </Button>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}

// ─── Main Dashboard with Results ─────────────────────────────────────────
function Dashboard() {
  const currentLang = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Risk Dashboard — HealthGuard";
  }, []);

  const [result, setResult] = useHealthResult();
  const [profile, setProfile] = useProfile();
  const [, setHistory] = useHistory();
  const { loading: authLoading, syncing: authSyncing } = useAuth();

  interface ActionImpact {
    id: string;
    title: string;
    category: string;
    icon: string;
    currentRisk: number;
    projectedRisk: number;
    absoluteReduction: number;
    relativeReduction: number;
    conditionImpact: { diabetes: number; heart: number; hypertension: number };
  }
  const [actionImpacts, setActionImpacts] = useState<ActionImpact[]>([]);

  interface CoachNudge {
    signalType: string;
    insight: string;
    message: string;
    nextAction: string;
    encouragement: string;
  }
  const [coachNudge, setCoachNudge] = useState<CoachNudge | null>(null);
  const [nudgeRefreshing, setNudgeRefreshing] = useState(false);

  interface RiskDriver {
    factor: string;
    contribution: number;
    modifiable: boolean;
  }
  const [riskDrivers, setRiskDrivers] = useState<RiskDriver[]>([]);
  const [expertReviewStatus, setExpertReviewStatus] = useState<string | null>(null);
  const [userStatus, setUserStatus] = useState<{
    hasCompletedAssessment: boolean;
    assessmentCompletedAt: string | null;
    lastAssessmentUpdate: string | null;
  } | null>(null);

  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isWaking, setIsWaking] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const hasValidHealthResult =
    Boolean(result) && typeof result?.overallRisk === "string" && Boolean(profile);

  // Bootstrap fetch
  useEffect(() => {
    let active = true;
    const initiatingUid = auth.currentUser?.uid;
    const checkState = () =>
      active && auth.currentUser && auth.currentUser.uid === initiatingUid;

    setBootstrapLoading(true);
    setBootstrapError(null);

    const wakingTimer = setTimeout(() => {
      if (checkState()) setIsWaking(true);
    }, 2500);

    const load = async () => {
      try {
        startMeasure("Dashboard Bootstrap");
        const data = await apiClient.get<any>("/api/dashboard/bootstrap", { timeoutMs: 35000 });
        endMeasure("Dashboard Bootstrap");
        clearTimeout(wakingTimer);
        if (!checkState()) return;
        setIsWaking(false);
        setBootstrapLoading(false);
        if (data.profile) setProfile(data.profile);
        if (data.result) setResult(data.result);
        if (data.history) setHistory(data.history);
        if (data.userStatus) setUserStatus(data.userStatus);
        if (data.riskDrivers) setRiskDrivers(data.riskDrivers);
        if (data.actionImpacts) setActionImpacts(data.actionImpacts);
        if (data.coachNudge) setCoachNudge(data.coachNudge);
        if (data.expertReview?.requests?.length > 0)
          setExpertReviewStatus(data.expertReview.requests[0].status);
      } catch (err: any) {
        clearTimeout(wakingTimer);
        if (!checkState()) return;
        setIsWaking(false);
        setBootstrapLoading(false);
        let msg = "Failed to load dashboard parameters.";
        if (err instanceof ApiError) {
          if (err.type === "cold_start") msg = "The health service is starting. Your dashboard will load shortly.";
          else if (err.type === "timeout") msg = "Dashboard request timed out. Retrying may help.";
          else if (err.type === "network") msg = "Network connection failed. Please check your internet connectivity.";
        }
        setBootstrapError(msg);
      }
    };
    load();
    return () => { active = false; };
  }, [retryKey, setProfile, setResult, setHistory]);

  const handleRetry = () => setRetryKey((p) => p + 1);

  const refreshCoachNudge = async () => {
    const uid = auth.currentUser?.uid;
    setNudgeRefreshing(true);
    try {
      startMeasure("AI Coach Nudge Refresh");
      const data = await apiClient.get<any>("/api/coach/behavior", { timeoutMs: 25000 });
      endMeasure("AI Coach Nudge Refresh");
      if (auth.currentUser?.uid === uid && data.success && data.nudge) {
        setCoachNudge(data.nudge);
        toast.success("Coach recommendations refreshed.");
      }
    } catch {
      toast.error("Unable to generate fresh AI advice at this time.");
    } finally {
      setNudgeRefreshing(false);
    }
  };

  // PDF download
  async function download() {
    if (!result || !profile) return;
    const toastId = toast.loading("Preparing health report PDF...");
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 48;
      const pageW = doc.internal.pageSize.getWidth();
      const cw = pageW - margin * 2;
      let y = margin;

      // Cover band
      doc.setFillColor(11, 30, 63);
      doc.rect(0, 0, pageW, 100, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("HealthGuard — Personalized Health Assessment", margin, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Preventive Health Screening Report", margin, 60);
      doc.text(new Date().toLocaleString(), pageW - margin, 60, { align: "right" });
      y = 128;
      doc.setTextColor(20);

      const ensureSpace = (h: number) => {
        if (y + h > 770) {
          doc.addPage();
          y = margin + 20;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(140);
          doc.text("HealthGuard Report (cont.)", margin, margin - 15);
          doc.setDrawColor(230);
          doc.line(margin, margin - 10, pageW - margin, margin - 10);
        }
      };

      const title = (t: string) => {
        ensureSpace(45);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(11, 30, 63);
        doc.text(t.toUpperCase(), margin, y);
        y += 6;
        doc.setDrawColor(220);
        doc.line(margin, y, pageW - margin, y);
        y += 14;
        doc.setTextColor(40);
      };

      const para = (t: string, size = 10) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(t, cw);
        lines.forEach((l: string) => {
          ensureSpace(size + 6);
          doc.text(l, margin, y);
          y += size + 4;
        });
      };

      // Profile
      title("Patient Profile");
      [
        `Age: ${profile.age}    Gender: ${profile.gender}`,
        `Height: ${profile.heightCm} cm    Weight: ${profile.weightKg} kg    BMI: ${result.bmi.toFixed(1)}`,
        `Smoking: ${profile.smoking}    Exercise: ${profile.exercise}`,
        `Family history: ${profile.familyHistory || "none reported"}`,
        `Reported symptoms: ${profile.symptoms || "none reported"}`,
      ].forEach((l) => para(l));
      y += 12;

      // Overall risk
      title("Overall Health Score");
      ensureSpace(60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      const c = result.overallRisk === "Low" ? [34, 139, 87] : result.overallRisk === "Moderate" ? [200, 130, 30] : [200, 60, 40];
      doc.setTextColor(c[0], c[1], c[2]);
      doc.text(`${result.overallScore}/80 — ${result.overallRisk} Risk`, margin, y);
      y += 30;
      doc.setTextColor(20);

      // Per-condition
      title("Risk Breakdown");
      ([ ["Diabetes", result.risk.diabetes, result.rationale.diabetes],
         ["Heart Disease", result.risk.heartDisease, result.rationale.heartDisease],
         ["Hypertension", result.risk.hypertension, result.rationale.hypertension],
      ] as const).forEach(([name, score, why]) => {
        ensureSpace(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`${name}: ${score}/100`, margin, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        para(why);
        y += 8;
      });

      // Plans
      [["Diet Plan", result.dietPlan || ""],
       ["Exercise Plan", result.exercisePlan || ""],
       ["Prevention Recommendations", result.preventionTips || ""]].forEach(([t, body]) => {
        y += 6;
        title(t);
        para((body || "").replace(/[#*_`>]/g, ""));
      });

      ensureSpace(50);
      y += 16;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(140);
      doc.text("MEDICAL DISCLAIMER", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      const disc = doc.splitTextToSize(
        "HealthGuard provides educational health screening indices based on self-reported parameters. It does not diagnose, treat, cure, or prevent any clinical condition. Users must consult qualified healthcare professionals for medical advice and clinical testing.",
        cw
      );
      doc.text(disc, margin, y);

      doc.save(`healthguard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded successfully.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  }

  // ── Skeleton ─────────────────────────────────────────────
  const isSyncing = (bootstrapLoading || authLoading || authSyncing) && !hasValidHealthResult;
  if (isSyncing) {
    return (
      <div className="w-full px-4 py-3 space-y-4 animate-pulse">
        <div className="h-10 bg-muted/40 w-1/3 rounded-xl mx-auto" />
        <div className="h-5 bg-muted/30 w-1/2 rounded-lg mx-auto" />
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="h-56 bg-muted/40 rounded-2xl" />
          <div className="h-56 bg-muted/40 rounded-2xl" />
        </div>
        {isWaking && (
          <div className="p-4 bg-teal/10 border border-teal/20 text-teal text-xs font-semibold rounded-xl flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>The health service is starting. Your dashboard will load shortly.</span>
          </div>
        )}
      </div>
    );
  }

  // ── No results → hero onboarding ─────────────────────────
  if (!hasValidHealthResult) return <HeroOnboarding />;

  // ── Results view ─────────────────────────────────────────
  const lastUpdateDateStr = userStatus?.lastAssessmentUpdate || result?.updatedAt || null;
  let profileAgeDays = 0;
  if (lastUpdateDateStr) {
    const diff = Math.abs(new Date().getTime() - new Date(lastUpdateDateStr).getTime());
    profileAgeDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const overallColor = riskColor(result.overallScore);

  // Radar chart data
  const radarData = [
    { subject: "Diabetes",      value: result.risk.diabetes,     fullMark: 100 },
    { subject: "Heart",         value: result.risk.heartDisease, fullMark: 100 },
    { subject: "Hypertension",  value: result.risk.hypertension, fullMark: 100 },
    { subject: "BMI",           value: Math.min(100, Math.max(0, (result.bmi - 18.5) * 4)), fullMark: 100 },
    { subject: "Lifestyle",     value: Math.min(100, (result.overallScore / 80) * 100),      fullMark: 100 },
  ];

  // Action priorities — prefer server data, fallback to result.actionPriorities
  const priorityActions: Array<{ title: string; stars: number; icon: React.ReactNode }> =
    actionImpacts.length > 0
      ? actionImpacts.slice(0, 3).map((a, i) => ({
          title: a.title,
          stars: 5 - i,
          icon: a.icon,
        }))
      : (result.actionPriorities || []).slice(0, 3).map((p: any, i: number) => ({
          title: p.action,
          stars: 5 - i,
          icon: ["🏃", "🥗", "😴"][i] ?? "💊",
        }));

  // Top contributors
  const contributors: string[] =
    riskDrivers.length > 0
      ? riskDrivers.slice(0, 4).map((d) => d.factor)
      : ["BMI", "Family History", "Physical Activity", "Diet"].slice(0, 4);

  return (
    <div className="w-full px-4 py-3 space-y-4">

      {/* ── Error / Wake banner ─────────────────────────── */}
      {isWaking && (
        <div className="p-4 bg-teal/10 border border-teal/20 text-teal text-xs font-semibold rounded-xl flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>The health service is starting. Your dashboard will load shortly.</span>
        </div>
      )}
      {bootstrapError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-xl flex items-center justify-between gap-4">
          <span>{bootstrapError}</span>
          <Button size="sm" variant="outline" className="border-red-500/30 text-red-500 font-bold" onClick={handleRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* ── Hero Header ────────────────────────────────────── */}
      <div className="text-center space-y-2 pt-2">
        <Badge variant="secondary" className="rounded-full text-[11px] font-semibold">
          {tr("clinicalEngine", currentLang)}
        </Badge>
        <SplitText
          text={tr("riskDashboard", currentLang)}
          className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground"
          delay={35}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          tag="h1"
          textAlign="center"
        />
        <p className="text-muted-foreground text-sm">
          Generated for a {profile.age}-year-old {profile.gender}, BMI {result.bmi.toFixed(1)}
          {profileAgeDays > 0 && ` · ${profileAgeDays}d ago`}
        </p>
      </div>

      {/* ── Blood-report-only nudge ─────────────────────────── */}
      {profile?.bloodReportOnly && (
        <div className="rounded-2xl border border-teal/20 bg-teal/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-teal shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-foreground">Blood Report Analyzed</h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Complete the full lifestyle assessment to get a more accurate risk prediction.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => navigate({ to: "/assessment", search: { mode: "retake" } })}
            className="bg-teal text-white hover:bg-teal/90 text-xs h-8 font-semibold rounded-lg shrink-0 cursor-pointer"
          >
            Complete Assessment
          </Button>
        </div>
      )}

      {/* ── Overall Health Score ────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Score card */}
        <div className="rounded-2xl border border-border bg-surface p-7 flex flex-col justify-between shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Overall Health Score
          </p>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="font-display text-7xl font-black" style={{ color: overallColor }}>
              <AnimatedScore score={result.overallScore} />
            </span>
            <span className="text-2xl text-muted-foreground font-semibold">/ 80</span>
          </div>
          <div
            className="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold border self-start"
            style={{ color: overallColor, borderColor: `${overallColor}30`, backgroundColor: `${overallColor}10` }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: overallColor }} />
            {result.overallRisk} Risk
          </div>
          <Separator className="my-4" />
          <div className="space-y-2.5">
            {[
              { name: "Diabetes",       value: result.risk.diabetes },
              { name: "Heart Disease",  value: result.risk.heartDisease },
              { name: "Hypertension",   value: result.risk.hypertension },
            ].map((r) => {
              const c = riskColor(r.value);
              return (
                <div key={r.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-muted-foreground">{r.name}</span>
                    <span style={{ color: c }}>{r.value}/100</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${r.value}%`, backgroundColor: c }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Radar chart */}
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm flex flex-col">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-4">
            Risk Radar
          </p>
          <div className="flex-1 min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)", fontWeight: 600 }}
                />
                <Radar
                  name="Risk"
                  dataKey="value"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.18}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top Contributors ────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="h-4 w-4 text-teal" />
          <h2 className="font-display font-bold text-base text-foreground">Top Risk Contributors</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          {contributors.map((c, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3">
              <span className="h-6 w-6 rounded-full bg-teal/10 text-teal text-[11px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-foreground">{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Priority Actions ────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <TrendingDown className="h-4 w-4 text-teal" />
          <h2 className="font-display font-bold text-base text-foreground">Priority Actions</h2>
        </div>
        <div className="space-y-3">
          {priorityActions.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-border px-4 py-3 bg-muted/10 hover:bg-teal/[0.03] transition-colors"
            >
              <span className="text-lg shrink-0">{typeof a.icon === "string" ? a.icon : a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span className="text-teal font-bold mr-1.5">{["①", "②", "③"][i]}</span>
                  {a.title}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Impact</span>
                  <Stars count={a.stars} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-border/40">
          <Button asChild variant="ghost" size="sm" className="text-teal hover:bg-teal/5 font-semibold">
            <Link to="/action-plan">View Full Action Plan <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link>
          </Button>
        </div>
      </div>

      {/* ── AI Health Coach ──────────────────────────────────── */}
      <div className="rounded-2xl border border-teal/20 bg-teal/[0.03] p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="font-display font-bold text-sm text-foreground">
                {tr("healthCoachCheckIn", currentLang)}
              </h2>
              <button
                onClick={refreshCoachNudge}
                disabled={nudgeRefreshing}
                className="p-1 rounded text-muted-foreground hover:text-teal hover:bg-teal/10 transition-colors disabled:opacity-50"
                title="Refresh AI advice"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${nudgeRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            {nudgeRefreshing ? (
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-muted/40 animate-pulse rounded" />
                <div className="h-4 w-1/2 bg-muted/40 animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="font-semibold text-foreground">Current Focus: </span>
                  <span className="text-muted-foreground">{coachNudge?.insight ?? "Reduce sedentary lifestyle."}</span>
                </p>
                <p>
                  <span className="font-semibold text-foreground">Next Action: </span>
                  <span className="text-muted-foreground">{coachNudge?.nextAction ?? "Take a 15-minute walk tomorrow morning."}</span>
                </p>
                {coachNudge?.message && (
                  <p className="text-xs text-muted-foreground italic border-t border-border/30 pt-1.5 mt-1.5">
                    {coachNudge.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Expert Review ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal shrink-0">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">{tr("expertClinicalReview", currentLang)}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed max-w-sm">
              {expertReviewStatus === "pending" && tr("expertReviewStatusPending", currentLang)}
              {expertReviewStatus === "accepted" && tr("expertReviewStatusAccepted", currentLang)}
              {expertReviewStatus === "completed" && tr("expertReviewStatusCompleted", currentLang)}
              {!expertReviewStatus && tr("expertReviewStatusNone", currentLang)}
            </p>
          </div>
        </div>
        <Button asChild className="bg-teal text-white hover:bg-teal/90 font-semibold text-xs h-9 rounded-xl shrink-0">
          <Link to="/expert-review">
            {expertReviewStatus ? tr("checkStatus", currentLang) : tr("requestReview", currentLang)}
          </Link>
        </Button>
      </div>

      {/* ── Medical Disclaimer ────────────────────────────────── */}
      <MedicalDisclaimer />

      {/* ── Download PDF ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-surface p-7 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-base text-foreground mb-1">Download Results</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Your complete PDF report includes:
            </p>
            <div className="grid sm:grid-cols-2 gap-1.5 text-xs text-muted-foreground mb-6">
              {["Risk Score & Lab Values", "AI Recommendations", "Lifestyle Advice", "Risk Breakdown", "Medical Disclaimer", "Report Date"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={download}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-10 rounded-xl shadow-sm"
            >
              <Download className="h-4 w-4" /> Download PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* ── Reassessment ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-muted/20 p-6 text-center space-y-3">
        <RotateCcw className="h-6 w-6 text-muted-foreground mx-auto" />
        <div>
          <p className="text-sm font-semibold text-foreground">Health changes over time.</p>
          <p className="text-xs text-muted-foreground mt-1">
            We recommend reassessment every <span className="font-bold text-foreground">30 days</span>.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          className="border-border hover:border-teal/40 hover:bg-teal/5 font-semibold h-10 rounded-xl"
        >
          <Link to="/assessment" search={{ mode: "retake" }}>
            Start New Assessment
          </Link>
        </Button>
      </div>
    </div>
  );
}
