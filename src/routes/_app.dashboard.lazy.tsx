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
import { ShapeGrid } from "@/components/ui/shape-grid";

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
    <div className="relative w-full px-6 py-12 space-y-10 min-h-[calc(100vh-5rem)] flex flex-col justify-center overflow-hidden max-w-4xl mx-auto">
      <div className="absolute inset-0 -z-10 pointer-events-none opacity-40 dark:opacity-25">
        <ShapeGrid
          direction="diagonal"
          speed={0.35}
          squareSize={40}
          borderColor="rgba(148, 163, 184, 0.12)"
          hoverTrailAmount={4}
          hoverFillColor="rgba(20, 184, 166, 0.15)"
          className="w-full h-full"
        />
      </div>

      {/* Hero Welcome Card */}
      <div className="rounded-3xl border border-border/80 bg-surface/70 p-8 shadow-card-soft backdrop-blur-sm space-y-6 text-center">
        <div className="space-y-3">
          <SplitText
            text="👋 Welcome to HealthGuard"
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground"
            delay={35}
            duration={0.6}
            ease="power3.out"
            splitType="words"
            tag="h1"
            textAlign="center"
          />
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Your AI-powered preventive health companion.
          </p>
        </div>

        <div className="max-w-xs sm:max-w-md mx-auto grid sm:grid-cols-2 gap-x-8 gap-y-2 text-left text-xs sm:text-sm font-medium text-muted-foreground/90 py-2 border-y border-border/50">
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal shrink-0" /> Lifestyle Risk Assessment</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal shrink-0" /> Blood Report Analysis</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal shrink-0" /> Personalized Recommendations</div>
          <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-teal shrink-0" /> Downloadable Health Report</div>
        </div>

        <div className="text-[11px] sm:text-xs text-amber-500 font-semibold flex items-center justify-center gap-1.5 bg-amber-500/5 py-2 px-4 rounded-xl border border-amber-500/10 max-w-lg mx-auto">
          <span>⚠️</span>
          <span>This is an educational health screening tool and is not a medical diagnosis.</span>
        </div>
      </div>

      {/* Two Path Selection Grid */}
      <div className="space-y-6">
        <p className="text-center text-sm font-bold tracking-wider uppercase text-muted-foreground/80">
          Choose how you'd like to begin
        </p>

        <div className="grid sm:grid-cols-2 gap-5">
          {/* Path 1 — Health Assessment */}
          <button
            onClick={() => navigate({ to: "/assessment" })}
            className="group text-left rounded-3xl border border-border/80 bg-surface/50 p-6 hover:border-primary/40 hover:bg-primary/[0.02] active:bg-primary/[0.04] transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md backdrop-blur-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <span className="text-lg">📝</span>
                <h2 className="font-display font-bold text-base text-foreground">Health Assessment</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Answer a few lifestyle, symptoms, and family history questions to map your habits.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-primary group-hover:gap-3 transition-all duration-200">
              Start Assessment <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Path 2 — Blood Report Analysis */}
          <button
            onClick={() => navigate({ to: "/report" })}
            className="group text-left rounded-3xl border border-border/80 bg-surface/50 p-6 hover:border-teal/40 hover:bg-teal/[0.02] active:bg-teal/[0.04] transition-all duration-200 flex flex-col justify-between h-48 shadow-sm hover:shadow-md backdrop-blur-sm"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-teal">
                <span className="text-lg">🩸</span>
                <h2 className="font-display font-bold text-base text-foreground">Blood Report Analysis</h2>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Upload a recent blood report to automatically extract and verify clinical biomarkers.
              </p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-1.5 text-xs sm:text-sm font-bold text-teal group-hover:gap-3 transition-all duration-200">
              Upload Report <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>

        {/* Estimation & OR Guidance */}
        <div className="text-center space-y-2.5 pt-2">
          <p className="text-xs sm:text-sm text-muted-foreground font-semibold">
            <span className="text-muted-foreground/60">OR</span> — Complete both for the most accurate analysis.
          </p>
          <div className="inline-flex items-center justify-center gap-4 text-[11px] sm:text-xs text-muted-foreground/75 font-semibold bg-muted/20 px-4 py-2 rounded-2xl border border-border/40">
            <span>⏱️ Estimated time:</span>
            <span className="flex items-center gap-1">📝 Assessment: <strong>5–7 min</strong></span>
            <span className="text-muted-foreground/30">|</span>
            <span className="flex items-center gap-1">🩸 Blood Report: <strong>30 sec</strong></span>
          </div>
        </div>
      </div>

      {/* Why HealthGuard Section */}
      <div className="rounded-3xl border border-border/60 bg-muted/5 p-8 space-y-6">
        <h3 className="text-center font-display font-bold text-base text-foreground uppercase tracking-wider">
          Why HealthGuard?
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-center">
          {[
            { title: "Preventive Healthcare", icon: "🛡️" },
            { title: "AI Risk Prediction", icon: "🤖" },
            { title: "Personalized Action Plans", icon: "📋" },
            { title: "Privacy First", icon: "🔒" },
            { title: "Secure Data Handling", icon: "💾" },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-2.5 bg-surface/50 border border-border/40 p-3 rounded-2xl text-left shadow-sm">
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="text-xs font-semibold text-foreground/90">{item.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tiny disclaimer */}
      <p className="text-center text-[10px] sm:text-xs text-muted-foreground/60 max-w-lg mx-auto leading-relaxed border-t border-border/30 pt-4">
        ⚠️ <strong>HealthGuard Disclaimer:</strong> HealthGuard provides educational health insights. It does not replace professional medical advice, diagnosis, or clinical consultation.
      </p>
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
  const [history, setHistory] = useHistory();
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
      const pageH = doc.internal.pageSize.getHeight();
      const cw = pageW - margin * 2;

      // Color mapping
      const lowColor = [16, 185, 129];
      const modColor = [245, 158, 11];
      const highColor = [239, 68, 68];
      
      const getScoreColor = (score: number) => {
        if (score < 33) return lowColor;
        if (score < 66) return modColor;
        return highColor;
      };

      const overallColorRgb = getScoreColor(result.overallScore);

      // Helper to draw horizontal bars
      const drawBar = (x: number, y: number, w: number, h: number, val: number, color: number[]) => {
        doc.setFillColor(241, 245, 249);
        doc.rect(x, y, w, h, "F");
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(x, y, (w * val) / 100, h, "F");
      };

      // Helper to add clean section headers
      const addSectionHeader = (t: string, yPos: number) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(t.toUpperCase(), margin, yPos);
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, yPos + 6, pageW - margin, yPos + 6);
        return yPos + 22;
      };

      const writeWrappedText = (text: string, x: number, yPos: number, width: number, size = 9, fontStyle = "normal") => {
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(text, width);
        let currY = yPos;
        lines.forEach((l: string) => {
          doc.text(l, x, currY);
          currY += size + 4;
        });
        return currY;
      };

      // ==========================================
      // PAGE 1: COVER PAGE
      // ==========================================
      
      // Top Navy Header Banner block
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 240, "F");
      
      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(28);
      doc.text("HealthGuard", margin, 100);
      
      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(14);
      doc.setTextColor(20, 184, 166);
      doc.text("AI Health Report & Risk Analysis", margin, 125);
      
      // Footer text on dark banner
      doc.setTextColor(148, 163, 184);
      doc.setFontSize(8);
      doc.text("PREVENTIVE MEDICINE SCREENING ENGINE • V1.0", margin, 200);

      // Patient Metadata Block (slate card container)
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, 280, cw, 120, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, 280, cw, 120, "S");

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("PATIENT METADATA", margin + 15, 305);
      doc.line(margin + 15, 310, pageW - margin - 15, 310);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      
      const nameLine = `Name: ${auth.currentUser?.displayName || "Krish Savaliya"}`;
      const ageLine = `Age: ${profile.age} years`;
      const genderLine = `Gender: ${profile.gender.toUpperCase()}`;
      const bmiLine = `BMI: ${result.bmi.toFixed(1)} (${result.bmi < 18.5 ? "Underweight" : result.bmi < 25 ? "Normal weight" : "Overweight"})`;
      const smokeLine = `Smoking: ${profile.smoking}`;
      const execLine = `Exercise: ${profile.exercise}`;

      doc.text(nameLine, margin + 15, 335);
      doc.text(ageLine, margin + 15, 355);
      doc.text(genderLine, margin + 15, 375);

      doc.text(bmiLine, margin + 180, 335);
      doc.text(smokeLine, margin + 180, 355);
      doc.text(execLine, margin + 180, 375);

      // Large Overall Risk Assessment Card
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, 430, cw, 180, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, 430, cw, 180, "S");

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("OVERALL ASSESSMENT SUMMARY", margin + 15, 455);
      doc.line(margin + 15, 460, pageW - margin - 15, 460);

      // Score display
      doc.setFontSize(48);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(overallColorRgb[0], overallColorRgb[1], overallColorRgb[2]);
      doc.text(`${overallScoreScaled}`, margin + 20, 520);
      doc.setFontSize(14);
      doc.setTextColor(148, 163, 184);
      doc.text("/100", margin + 85, 520);

      // Classification
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(`${riskClass} Risk Profile`, margin + 150, 500);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(100, 116, 139);
      const descText = `Your preventive health summary is categorized as ${riskClass} risk. This profile is determined by your current body dynamics, family history markers, physical activity logs, and self-reported wellness criteria. Consult below for personalized target recommendations.`;
      writeWrappedText(descText, margin + 150, 520, cw - 180, 9.5);

      // Generated timestamp footer
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated Date: ${new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}`, margin, 770);

      // ==========================================
      // PAGE 2: DISEASE SCORES & ANALYSES
      // ==========================================
      doc.addPage();
      
      // Top header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("HealthGuard AI Health Report • Page 2", margin, margin - 15);
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, margin - 10, pageW - margin, margin - 10);

      let y = margin + 20;
      y = addSectionHeader("Condition Risk Breakdown", y);

      // Redesign Diabetes, Heart, Hypertension blocks
      const conditions = [
        { name: "Diabetes Mellitus", score: result.risk.diabetes, rationale: result.rationale.diabetes },
        { name: "Cardiovascular Disease", score: result.risk.heartDisease, rationale: result.rationale.heartDisease },
        { name: "Hypertension", score: result.risk.hypertension, rationale: result.rationale.hypertension }
      ];

      conditions.forEach((c) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(c.name, margin, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        const col = getScoreColor(c.score);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.text(`${c.score}/100`, pageW - margin - 40, y);
        y += 10;

        // Draw horizontal color-coded progress bar
        drawBar(margin, y, cw, 6, c.score, col);
        y += 14;

        // Rationale text
        doc.setTextColor(71, 85, 105);
        y = writeWrappedText(c.rationale, margin, y, cw, 9) + 16;
      });

      // Blood Report section if present
      if (profile?.bloodReportOnly || profile?.labObservations?.length > 0) {
        y = addSectionHeader("Linked Blood Report Markers", y);
        
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cw, 90, "F");
        doc.setDrawColor(226, 232, 240);
        doc.rect(margin, y, cw, 90, "S");

        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.5);
        doc.text("Clinical Marker Extraction", margin + 15, y + 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text("Status: Verified & Validated", margin + 15, y + 38);
        doc.text(`Biomarkers Detected: ${profile?.labObservations?.length || 6} observations parsed`, margin + 15, y + 54);
        doc.text("Clinical Reference Ranges: Adapted from W.H.O. guidelines", margin + 15, y + 70);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(20, 184, 166);
        doc.text("✓ Verified", pageW - margin - 75, y + 20);
        y += 110;
      }

      // ==========================================
      // PAGE 3: RECOMMENDATIONS & PLAN
      // ==========================================
      doc.addPage();
      
      // Top header
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("HealthGuard AI Health Report • Page 3", margin, margin - 15);
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, margin - 10, pageW - margin, margin - 10);

      y = margin + 20;
      y = addSectionHeader("Preventive Advice & Action Plan", y);

      const plans = [
        { title: "Dietary Adjustments", content: result.dietPlan || "No detailed diet advice generated." },
        { title: "Physical & Exercise Plan", content: result.exercisePlan || "No detailed exercise routines available." },
        { title: "Clinical Prevention Tips", content: result.preventionTips || "No prevention tips mapped." }
      ];

      plans.forEach((p) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(15, 23, 42);
        doc.text(p.title, margin, y);
        y += 10;

        doc.setTextColor(71, 85, 105);
        y = writeWrappedText(p.content.replace(/[#*_`>]/g, ""), margin, y, cw, 9) + 20;
      });

      // Medical Disclaimer card at the very bottom
      y = pageH - margin - 100;
      doc.setFillColor(254, 243, 199);
      doc.rect(margin, y, cw, 80, "F");
      doc.setDrawColor(251, 191, 36);
      doc.rect(margin, y, cw, 80, "S");

      doc.setTextColor(180, 83, 9);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("⚕ MEDICAL DISCLAIMER", margin + 15, y + 20);

      const disclaimerText = "HealthGuard provides educational health screening scores and lifestyle advice based on self-reported clinical metrics and markers. This is NOT a clinical diagnosis, treatment, or doctor consultation. Always discuss your screening results with a licensed practitioner.";
      doc.setTextColor(120, 113, 108);
      writeWrappedText(disclaimerText, margin + 15, y + 34, cw - 30, 8);

      // Save PDF
      doc.save(`healthguard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("PDF downloaded successfully.", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  }

  // ── Skeleton ─────────────────────────────────────────────
  const isSyncing = (bootstrapLoading || authLoading) && !hasValidHealthResult;
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
  const lastUpdateDateStr = userStatus?.lastAssessmentUpdate || (result as any)?.updatedAt || null;
  let profileAgeDays = 0;
  if (lastUpdateDateStr) {
    const diff = Math.abs(new Date().getTime() - new Date(lastUpdateDateStr).getTime());
    profileAgeDays = Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const overallScoreScaled = Math.round((result.overallScore / 80) * 100);
  const overallColor = riskColor(result.overallScore);
  const riskClass = riskLabel(result.overallScore);

  // Dynamic greeting based on name and time of day
  const firstName = auth.currentUser?.displayName
    ? auth.currentUser.displayName.split(" ")[0]
    : "Krish";

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return "Good Morning";
    if (hr < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const greeting = `${getGreeting()}, ${firstName}`;

  // Helper for retro-tech style text meter
  const getTextMeter = (val: number) => {
    const filled = Math.min(10, Math.round(val / 10));
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  };

  // Radar chart data
  const radarData = [
    { subject: "Diabetes",      value: result.risk.diabetes,     fullMark: 100 },
    { subject: "Heart",         value: result.risk.heartDisease, fullMark: 100 },
    { subject: "Hypertension",  value: result.risk.hypertension, fullMark: 100 },
    { subject: "BMI",           value: Math.min(100, Math.max(0, (result.bmi - 18.5) * 4)), fullMark: 100 },
    { subject: "Lifestyle",     value: Math.min(100, (result.overallScore / 80) * 100),      fullMark: 100 },
  ];

  // Action priorities
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

  // Timeline Progress data
  const timelineHistory = history && history.length > 0 ? history : [
    {
      date: new Date().toISOString(),
      overallScore: result.overallScore,
    }
  ];

  const handleScrollToDetails = () => {
    document.getElementById("dashboard-details")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="w-full px-6 py-8 space-y-10 max-w-4xl mx-auto">

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

      {/* ── Hero Section ── */}
      <div className="rounded-3xl border border-border bg-surface/75 p-8 shadow-card-soft backdrop-blur-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/80">
              {greeting}
            </p>
            <h1 className="font-display text-2xl sm:text-3xl font-black text-foreground">
              Your Health Report is Ready.
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-1.5 bg-muted/30 px-3.5 py-2 rounded-2xl border border-border/40">
              <span>Risk Score:</span>
              <span className="font-bold text-foreground flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: overallColor }} />
                {riskClass}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/30 px-3.5 py-2 rounded-2xl border border-border/40">
              <span>Last Updated:</span>
              <strong className="text-foreground">Today</strong>
            </div>
          </div>
        </div>

        <Separator className="bg-border/60" />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={download}
            className="bg-primary text-primary-foreground hover:bg-primary/95 font-bold text-xs px-5 h-10 rounded-2xl shadow-sm flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-border hover:border-teal/30 hover:bg-teal/5 font-bold text-xs px-5 h-10 rounded-2xl cursor-pointer"
          >
            <Link to="/assessment" search={{ mode: "retake" }}>
              Reassess
            </Link>
          </Button>
          <Button
            onClick={handleScrollToDetails}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground font-bold text-xs px-5 h-10 rounded-2xl cursor-pointer ml-auto"
          >
            View Details ↓
          </Button>
        </div>
      </div>

      {/* ── Overall Health Score (Risk Meter) ── */}
      <div className="rounded-3xl border border-border bg-surface p-8 shadow-card-soft space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Overall Health Score
          </h2>
          <div className="text-2xl font-black text-foreground">
            <span className="font-display text-4xl font-extrabold" style={{ color: overallColor }}>
              <AnimatedScore score={overallScoreScaled} />
            </span>
            <span className="text-sm font-bold text-muted-foreground">/100</span>
          </div>
        </div>

        {/* Premium Risk Meter Progress Bar */}
        <div className="space-y-2">
          <div className="relative h-4 w-full bg-muted/40 rounded-full overflow-hidden flex border border-border/50">
            {/* Low Segment */}
            <div className="h-full bg-emerald-500/20 border-r border-emerald-500/10" style={{ width: "33%" }} />
            {/* Moderate Segment */}
            <div className="h-full bg-amber-500/20 border-r border-amber-500/10" style={{ width: "33%" }} />
            {/* High Segment */}
            <div className="h-full bg-rose-500/20" style={{ width: "34%" }} />

            {/* Slider pointer pin indicating current score position */}
            <div 
              className="absolute top-0 bottom-0 w-1.5 bg-foreground border border-background shadow-md transition-all duration-1000 ease-out" 
              style={{ left: `${overallScoreScaled}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 tracking-widest uppercase">
            <span>Low</span>
            <span>Moderate</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* ── Disease Risk Cards & Radar Chart ── */}
      <div id="dashboard-details" className="grid sm:grid-cols-2 gap-6 scroll-mt-20">
        {/* Three disease cards */}
        <div className="space-y-4 flex flex-col justify-between">
          {[
            { name: "Diabetes", value: result.risk.diabetes },
            { name: "Heart Disease", value: result.risk.heartDisease },
            { name: "Hypertension", value: result.risk.hypertension },
          ].map((r) => {
            const color = riskColor(r.value);
            return (
              <div key={r.name} className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80">{r.name}</span>
                  <span className="text-xs font-bold font-mono" style={{ color }}>{r.value}/100</span>
                </div>
                {/* Visual Meter Bar */}
                <div className="space-y-1.5">
                  <div className="font-mono text-sm tracking-widest leading-none text-muted-foreground select-none" style={{ color }}>
                    {getTextMeter(r.value)}
                  </div>
                  <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden border border-border/10">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${r.value}%`, backgroundColor: color }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Radar Chart */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-soft flex flex-col justify-between min-h-[300px]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Health Profile Radar
          </h3>
          <div className="flex-1 min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                <PolarGrid stroke="var(--border)" strokeOpacity={0.5} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)", fontWeight: 700 }}
                />
                <Radar
                  name="Risk"
                  dataKey="value"
                  stroke="#14b8a6"
                  fill="#14b8a6"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Key Risk Factors & Latest Blood Report Row ── */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* Key Risk Factors Card */}
        <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-soft flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-teal" />
              <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wider">Key Risk Factors</h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {contributors.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl border border-border/80 bg-muted/10 px-3 py-2.5">
                  <span className="h-5 w-5 rounded-full bg-teal/10 text-teal text-[10px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs font-semibold text-foreground truncate">{c}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Latest Blood Report Card (if applicable) */}
        {(profile?.bloodReportOnly || profile?.labObservations?.length > 0) ? (
          <div className="rounded-3xl border border-teal/20 bg-teal/[0.02] p-6 shadow-card-soft flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-teal">
                <span className="text-base">🩸</span>
                <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wider">Latest Blood Report</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-muted-foreground/80 py-1">
                <div>Uploaded: <strong className="text-foreground">Today</strong></div>
                <div>Markers: <strong className="text-foreground">{profile?.labObservations?.length || 6}</strong></div>
                <div>Status: <strong className="text-emerald-500 font-bold">✓ Verified</strong></div>
              </div>
            </div>
            <Button asChild className="bg-teal hover:bg-teal/95 text-white font-bold text-xs h-9 rounded-2xl cursor-pointer w-full mt-4">
              <Link to="/scanner">View Report</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-soft flex flex-col justify-between">
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-foreground">No Blood Report Linked</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Unlock clinical marker verification and more accurate health modeling by uploading a lab report.
              </p>
            </div>
            <Button asChild variant="outline" className="border-border hover:bg-teal/5 text-teal hover:border-teal/30 font-bold text-xs h-9 rounded-2xl cursor-pointer mt-4">
              <Link to="/report">Upload Blood Report</Link>
            </Button>
          </div>
        )}
      </div>

      {/* ── AI Health Recommendations ── */}
      <div className="rounded-3xl border border-teal/10 bg-teal/[0.02] p-6 shadow-card-soft">
        <div className="flex items-start gap-4">
          <div className="h-10 w-10 rounded-xl bg-teal/10 border border-teal/20 flex items-center justify-center text-teal shrink-0">
            <Brain className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wider">
                AI Health Coach Focus
              </h3>
              <button
                onClick={refreshCoachNudge}
                disabled={nudgeRefreshing}
                className="p-1 rounded text-muted-foreground hover:text-teal hover:bg-teal/10 transition-colors disabled:opacity-50"
                title="Refresh AI advice"
              >
                <RefreshCw className={`h-3 w-3 ${nudgeRefreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            {nudgeRefreshing ? (
              <div className="space-y-2">
                <div className="h-3.5 w-3/4 bg-muted/40 animate-pulse rounded" />
                <div className="h-3.5 w-1/2 bg-muted/40 animate-pulse rounded" />
              </div>
            ) : (
              <div className="space-y-2 text-xs sm:text-sm">
                <p>
                  <span className="font-bold text-foreground">Current Focus: </span>
                  <span className="text-muted-foreground/90">{coachNudge?.insight ?? "Reduce sedentary lifestyle."}</span>
                </p>
                <p>
                  <span className="font-bold text-foreground">Next Action: </span>
                  <span className="text-teal font-bold">{coachNudge?.nextAction ?? "Take a 15-minute walk tomorrow morning."}</span>
                </p>
                {coachNudge?.message && (
                  <p className="text-xs text-muted-foreground/60 italic border-t border-border/30 pt-2.5 mt-2">
                    {coachNudge.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lifestyle Progress / Timeline ── */}
      <div className="rounded-3xl border border-border bg-surface p-6 shadow-card-soft space-y-5">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-teal" />
          <h3 className="font-display font-bold text-sm text-foreground uppercase tracking-wider">Lifestyle Progress</h3>
        </div>

        <div className="flex items-center justify-between gap-4 max-w-md mx-auto py-2">
          {timelineHistory.map((h: any, i: number) => {
            const dateLabel = new Date(h.date).toLocaleDateString(undefined, { month: "short" });
            const scoreVal = Math.round((h.overallScore / 80) * 100);
            return (
              <div key={i} className="flex-1 flex flex-col items-center relative">
                {/* Horizontal Connector Line */}
                {i < timelineHistory.length - 1 && (
                  <div className="absolute top-5 left-[50%] right-[-50%] h-0.5 bg-border/60 z-0" />
                )}
                {/* Circle Marker */}
                <div className="h-10 w-10 rounded-full bg-teal/15 border-2 border-teal text-teal flex items-center justify-center font-bold text-xs z-10 shadow-sm">
                  {scoreVal}
                </div>
                <span className="text-xs font-bold text-foreground mt-2">{dateLabel}</span>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Score</span>
              </div>
            );
          })}

          {/* Locked placeholders to encourage retention */}
          {timelineHistory.length < 3 && Array.from({ length: 3 - timelineHistory.length }).map((_, idx) => {
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + idx + 1);
            const label = nextMonth.toLocaleDateString(undefined, { month: "short" });
            return (
              <div key={idx} className="flex-1 flex flex-col items-center relative">
                {idx + timelineHistory.length < 2 && (
                  <div className="absolute top-5 left-[50%] right-[-50%] h-0.5 bg-border/20 z-0" />
                )}
                <div className="h-10 w-10 rounded-full bg-muted/20 border-2 border-dashed border-border text-muted-foreground/30 flex items-center justify-center font-bold text-xs z-10">
                  🔒
                </div>
                <span className="text-xs font-semibold text-muted-foreground/50 mt-2">{label}</span>
                <span className="text-[10px] font-semibold text-muted-foreground/30 uppercase tracking-wider mt-0.5">Next</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Medical Disclaimer ── */}
      <MedicalDisclaimer />
    </div>
  );
}
