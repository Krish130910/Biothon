import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  useHealthResult,
  useProfile,
  useHistory,
  pushHistory,
  type Profile,
} from "@/lib/health-store";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Activity,
  ArrowRight,
  Brain,
  Download,
  HeartPulse,
  Sparkles,
  TrendingDown,
  Coffee,
  Cookie,
  Soup,
  UtensilsCrossed,
  Dumbbell,
  Flame,
  Timer,
  Calendar,
  ClipboardCheck,
  Droplet,
  Moon,
  Stethoscope,
  Plus,
  Target,
  TrendingUp,
  Weight,
  Salad,
  ScanLine,
  Loader2,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadialBar,
  RadialBarChart,
  PolarAngleAxis,
  Tooltip,
  CartesianGrid,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  LineChart,
  Line,
  Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search.tab as string) || undefined,
    };
  },
});

function AnimatedScore({ score }: { score: number }) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setCurrent(end);
      return;
    }
    const totalDuration = 800; // ms
    const incrementTime = Math.max(Math.floor(totalDuration / end), 12);
    const timer = setInterval(() => {
      start += 1;
      setCurrent(start);
      if (start >= end) clearInterval(timer);
    }, incrementTime);
    return () => clearInterval(timer);
  }, [score]);
  return <>{current}</>;
}

const CHART_NAVY = "oklch(0.27 0.07 258)";
const CHART_TEAL = "oklch(0.55 0.09 200)";
const CHART_AMBER = "oklch(0.74 0.15 70)";
const CHART_RED = "oklch(0.58 0.21 25)";
const CHART_GREEN = "oklch(0.62 0.13 155)";

function colorFor(score: number) {
  if (score < 33) return CHART_GREEN;
  if (score < 66) return CHART_AMBER;
  return CHART_RED;
}
function levelFor(score: number) {
  if (score < 33) return "Low";
  if (score < 66) return "Moderate";
  return "High";
}

interface ExtendedProfile {
  age: number;
  gender: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  smoking: "never" | "former" | "current";
  exercise: "none" | "light" | "moderate" | "active";
  familyHistory: string;
  symptoms: string;
  alcohol?: string;
  diseases?: string;
}

function simulateHealthScore(
  profile: ExtendedProfile,
  modifications: {
    weightKg?: number;
    exercise?: "none" | "light" | "moderate" | "active";
    smoking?: "never" | "former" | "current";
    sleepHours?: number;
  }
): number {
  const age = profile.age;
  const heightCm = profile.heightCm;
  const weightKg = modifications.weightKg !== undefined ? modifications.weightKg : profile.weightKg;
  const exercise = modifications.exercise !== undefined ? modifications.exercise : profile.exercise;
  const smoking = modifications.smoking !== undefined ? modifications.smoking : profile.smoking;
  const alcohol = profile.alcohol || "never";
  const sleepHours = modifications.sleepHours !== undefined ? modifications.sleepHours : 8;
  const familyHistory = profile.familyHistory || "";
  const symptoms = profile.symptoms || "";
  const diseases = profile.diseases || "";

  // 1. BMI
  const bmi = weightKg / Math.pow(heightCm / 100, 2);

  // 2. Diabetes
  let dbScore = 0;
  if (age >= 45 && age <= 54) dbScore += 2;
  else if (age >= 55 && age <= 64) dbScore += 3;
  else if (age > 64) dbScore += 4;

  if (bmi >= 25 && bmi < 30) dbScore += 2;
  else if (bmi >= 30) dbScore += 4;

  if (exercise === "none" || exercise === "light") dbScore += 3;

  const fhLower = familyHistory.toLowerCase();
  if (fhLower.includes("diabet") || fhLower.includes("sugar")) {
    if (/mother|father|parent|sibling|brother|sister|son|daughter/.test(fhLower)) {
      dbScore += 5;
    } else {
      dbScore += 3;
    }
  }

  const allText = (symptoms + " " + familyHistory).toLowerCase();
  if (/sweet|sugar|junk|soda|fast food/.test(allText)) {
    dbScore += 1;
  }

  const sxLower = symptoms.toLowerCase();
  if (/thirst|urination|fatigue|dry mouth|polyuria/.test(sxLower)) {
    dbScore += 2;
  }
  let diabetesRisk = Math.min(100, Math.round((dbScore / 15) * 100));

  // 3. Heart
  let hScore = 0;
  if (age >= 35 && age <= 39) hScore += 2;
  else if (age >= 40 && age <= 44) hScore += 5;
  else if (age >= 45 && age <= 49) hScore += 7;
  else if (age >= 50 && age <= 54) hScore += 8;
  else if (age >= 55 && age <= 59) hScore += 10;
  else if (age >= 60) hScore += 12;

  if (bmi >= 25 && bmi < 30) hScore += 2;
  else if (bmi >= 30) hScore += 3;

  if (smoking === "current") hScore += 4;
  else if (smoking === "former") hScore += 2;

  if (exercise === "none" || exercise === "light") hScore += 3;

  if (/heart|cardiac|stroke|bypass|infarct/.test(fhLower)) {
    hScore += 3;
  }

  const allTextDiseases = (symptoms + " " + familyHistory + " " + diseases).toLowerCase();
  if (/hypertension|bp|blood pressure|pressure/.test(allTextDiseases)) {
    hScore += 3;
  }
  let heartRisk = Math.min(100, Math.round((hScore / 20) * 100));

  // 4. Hypertension
  let htScore = 0;
  if (age > 45 && age <= 60) htScore += 2;
  else if (age > 60) htScore += 4;

  if (bmi >= 25 && bmi < 30) htScore += 2;
  else if (bmi >= 30) htScore += 4;

  if (exercise === "none" || exercise === "light") htScore += 3;

  if (smoking === "current") htScore += 2;
  else if (smoking === "former") htScore += 1;

  const alcVal = alcohol.toLowerCase();
  if (alcVal.includes("heavy") || alcVal.includes("frequent")) {
    htScore += 3;
  } else if (alcVal.includes("occasional") || alcVal.includes("moderate") || alcVal.includes("drink")) {
    htScore += 1;
  } else if (/alcohol|drinking|beer|wine|whiskey/.test(allText)) {
    htScore += 1;
  }

  if (/bp|hypertension|blood pressure|pressure/.test(fhLower)) {
    htScore += 3;
  }
  let hypertensionRisk = Math.min(100, Math.round((htScore / 14) * 100));

  // 5. Sleep simulation
  if (sleepHours < 6) {
    diabetesRisk = Math.min(100, diabetesRisk + 5);
    heartRisk = Math.min(100, heartRisk + 5);
    hypertensionRisk = Math.min(100, hypertensionRisk + 7);
  }

  return Math.round((diabetesRisk + heartRisk + hypertensionRisk) / 3);
}

// ----------------- DIET DATA & SAMPLES -----------------
const meals = {
  breakfast: { icon: Coffee, label: "Breakfast", kcal: "350-450" },
  lunch: { icon: UtensilsCrossed, label: "Lunch", kcal: "500-650" },
  snacks: { icon: Cookie, label: "Snacks", kcal: "150-250" },
  dinner: { icon: Soup, label: "Dinner", kcal: "450-600" },
} as const;

const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dietSamples = {
  "indian-veg": {
    breakfast: [
      "Vegetable poha + green chutney",
      "Moong dal chilla + curd",
      "Oats upma + flax seeds",
      "Multigrain paratha + dahi",
      "Idli + sambar (2 idlis)",
      "Besan cheela + mint chutney",
      "Daliya + mixed vegetables",
    ],
    lunch: [
      "Roti, dal tadka, lauki sabzi, salad",
      "Brown rice, rajma, beetroot raita",
      "2 jowar roti, paneer bhurji, palak",
      "Quinoa pulao, mixed dal",
      "Roti, chana masala, gobi sabzi",
      "Khichdi + papad + curd",
      "Roti, mixed dal, bhindi sabzi",
    ],
    snacks: [
      "Roasted chana + green tea",
      "Handful almonds + apple",
      "Fruit chaat + walnuts",
      "Sprouts salad",
      "Cucumber + hummus",
      "Greek yogurt + seeds",
      "Buttermilk + makhana",
    ],
    dinner: [
      "Vegetable soup + 2 multigrain roti + sabzi",
      "Light khichdi + salad",
      "Stir-fried tofu + brown rice",
      "Dal + roti + steamed veg",
      "Paneer tikka + salad",
      "Vegetable daliya + curd",
      "Mixed sabzi + roti + raita",
    ],
  },
  "indian-nonveg": {
    breakfast: [
      "Egg bhurji + 2 multigrain toast",
      "Boiled eggs + oats + fruit",
      "Chicken keema paratha + curd",
      "Egg omelette + brown bread",
      "Idli + sambar + boiled egg",
      "Egg white scramble + roti",
      "Greek yogurt + boiled egg",
    ],
    lunch: [
      "Roti, grilled chicken, salad",
      "Brown rice, fish curry, sautéed veg",
      "Chicken curry + 2 roti + raita",
      "Quinoa + grilled chicken + veg",
      "Fish tikka + roti + salad",
      "Egg curry + rice + sabzi",
      "Chicken stew + appam",
    ],
    snacks: [
      "Boiled egg + apple",
      "Roasted chana + nuts",
      "Greek yogurt + berries",
      "Chicken soup",
      "Hummus + carrots",
      "Buttermilk + nuts",
      "Fruit + protein shake",
    ],
    dinner: [
      "Grilled fish + steamed veg + roti",
      "Chicken broth + salad",
      "Tandoori chicken + grilled veg",
      "Egg curry + roti",
      "Fish curry + brown rice (small)",
      "Chicken keema + roti",
      "Mixed grill + salad",
    ],
  },
};

// ----------------- FITNESS DATA -----------------
type FitnessLevel = "beginner" | "intermediate" | "advanced";

const fitnessPlans: Record<
  FitnessLevel,
  {
    title: string;
    weekly: string;
    intensity: string;
    kcal: number;
    sessions: Array<{ day: string; focus: string; detail: string; min: number }>;
  }
> = {
  beginner: {
    title: "Foundation",
    weekly: "150 min low-impact",
    intensity: "RPE 4-5 / 10",
    kcal: 1400,
    sessions: [
      { day: "Mon", focus: "Walk", detail: "30 min brisk walk + 5 min cooldown stretch", min: 35 },
      { day: "Tue", focus: "Mobility", detail: "20 min full-body stretching + breathing", min: 20 },
      {
        day: "Wed",
        focus: "Strength",
        detail: "Bodyweight: 3×10 squats, push-ups (knee), rows, planks 30s",
        min: 30,
      },
      { day: "Thu", focus: "Rest / walk", detail: "20 min easy walk or rest", min: 20 },
      {
        day: "Fri",
        focus: "Walk",
        detail: "35 min brisk walk + hill intervals (4×1 min)",
        min: 35,
      },
      {
        day: "Sat",
        focus: "Strength",
        detail: "Bodyweight circuit: 3 rounds x 8 movements",
        min: 35,
      },
      { day: "Sun", focus: "Recovery", detail: "Yoga or stretching, 25 min", min: 25 },
    ],
  },
  intermediate: {
    title: "Progression",
    weekly: "210 min mixed",
    intensity: "RPE 6-7 / 10",
    kcal: 2200,
    sessions: [
      { day: "Mon", focus: "Cardio", detail: "30 min run/cycle Z2, 5 min Z4 finisher", min: 35 },
      { day: "Tue", focus: "Strength A", detail: "Squat 4×6, Bench 4×6, Row 4×8", min: 45 },
      { day: "Wed", focus: "Intervals", detail: "8×400m run or 30s/30s bike sprints", min: 30 },
      {
        day: "Thu",
        focus: "Strength B",
        detail: "Deadlift 4×5, Press 4×6, Pull-ups 4×AMRAP",
        min: 45,
      },
      { day: "Fri", focus: "Cardio", detail: "40 min steady Z2 + 10 min cooldown", min: 50 },
      { day: "Sat", focus: "Mobility", detail: "Yoga / mobility flow", min: 30 },
      { day: "Sun", focus: "Rest", detail: "Active recovery walk 25 min", min: 25 },
    ],
  },
  advanced: {
    title: "Performance",
    weekly: "300+ min periodized",
    intensity: "RPE 7-9 / 10",
    kcal: 3000,
    sessions: [
      { day: "Mon", focus: "Strength A", detail: "Squat 5×3 @85%, accessories", min: 60 },
      { day: "Tue", focus: "Threshold", detail: "20 min @ LT2 + 2×8 min Z4", min: 55 },
      { day: "Wed", focus: "Strength B", detail: "Deadlift 5×3, upper push/pull", min: 60 },
      { day: "Thu", focus: "VO2 intervals", detail: "5×4 min Z5 / 3 min easy", min: 45 },
      {
        day: "Fri",
        focus: "Strength C",
        detail: "Bench 5×3, posterior chain accessories",
        min: 55,
      },
      { day: "Sat", focus: "Long endurance", detail: "75-90 min Z2", min: 90 },
      { day: "Sun", focus: "Recovery", detail: "Mobility, sauna, full rest", min: 30 },
    ],
  },
};

function Dashboard() {
  useEffect(() => {
    document.title = "Risk Dashboard — HealthGuard";
  }, []);

  const [result, setResult] = useHealthResult();
  const [profile, setProfile] = useProfile();
  const [history, setHistory] = useHistory();

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Progress Review State
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewData, setReviewData] = useState<{
    review: string;
    coaching: string;
    milestones: any[];
    trends: {
      weightChange: number;
      overallRiskChange: number;
      diabetesRiskChange: number;
      heartRiskChange: number;
      hypertensionRiskChange: number;
    };
  } | null>(null);

  // Action Impact Engine State
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
  const [impactsLoading, setImpactsLoading] = useState(false);

  // Recent food scan states
  interface RecentScan {
    productName: string;
    personalizedScore: number;
    foodScore: number;
    riskLevel: string;
    createdAt: string;
    alternatives: string[];
    recommendation: string;
  }
  const [recentScan, setRecentScan] = useState<RecentScan | null>(null);
  const [scansLoading, setScansLoading] = useState(false);

  // Forecast states
  const [selectedForecastActions, setSelectedForecastActions] = useState<string[]>([]);
  const [forecastResult, setForecastResult] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const handleForecastActionToggle = (actionKey: string) => {
    setSelectedForecastActions((prev) =>
      prev.includes(actionKey)
        ? prev.filter((a) => a !== actionKey)
        : [...prev, actionKey]
    );
  };

  // Coach nudge states
  interface CoachNudge {
    signalType: string;
    insight: string;
    message: string;
    nextAction: string;
    encouragement: string;
  }
  const [coachNudge, setCoachNudge] = useState<CoachNudge | null>(null);
  const [nudgeLoading, setNudgeLoading] = useState(false);

  // Risk Drivers State
  interface RiskDriver {
    factor: string;
    contribution: number;
    modifiable: boolean;
  }
  const [riskDrivers, setRiskDrivers] = useState<RiskDriver[]>([]);
  const [modifiableRisk, setModifiableRisk] = useState<number>(0);
  const [nonModifiableRisk, setNonModifiableRisk] = useState<number>(0);
  const [driversLoading, setDriversLoading] = useState(false);

  // Fetch action impacts once result is available
  useEffect(() => {
    if (!result) return;
    const fetchImpacts = async () => {
      setImpactsLoading(true);
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_URL}/api/actions/impact`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success) setActionImpacts(data.data.recommendedActions.slice(0, 3));
        }
      } catch (err) {
        console.error("Failed to fetch action impacts:", err);
      } finally {
        setImpactsLoading(false);
      }
    };
    fetchImpacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Fetch risk drivers once result is available
  useEffect(() => {
    if (!result) return;
    const fetchDrivers = async () => {
      setDriversLoading(true);
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_URL}/api/risk/drivers`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success) {
            setRiskDrivers(data.data.topDrivers);
            setModifiableRisk(data.data.modifiableRisk);
            setNonModifiableRisk(data.data.nonModifiableRisk);
          }
        }
      } catch (err) {
        console.error("Failed to fetch risk drivers:", err);
      } finally {
        setDriversLoading(false);
      }
    };
    fetchDrivers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Fetch recent food scan once result is available
  useEffect(() => {
    if (!result) return;
    const fetchRecentScan = async () => {
      setScansLoading(true);
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_URL}/api/food/recent`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.scan) {
            setRecentScan(data.scan);
          }
        }
      } catch (err) {
        console.error("Failed to fetch recent scan:", err);
      } finally {
        setScansLoading(false);
      }
    };
    fetchRecentScan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Initialize selected actions from available profile conditions
  useEffect(() => {
    if (!profile) return;
    const initialActions: string[] = [];
    if (profile.exercise === "none" || profile.exercise === "light") {
      initialActions.push("exercise_30_min");
    }
    const bmi = profile.weightKg / Math.pow(profile.heightCm / 100, 2);
    if (bmi >= 25) {
      initialActions.push("lose_weight");
    }
    if (profile.smoking === "current") {
      initialActions.push("quit_smoking");
    }
    if (profile.alcohol && profile.alcohol !== "never") {
      initialActions.push("limit_alcohol");
    }
    setSelectedForecastActions(initialActions);
  }, [profile]);

  // Fetch forecast whenever selected actions change or result is loaded
  useEffect(() => {
    if (!profile) return;
    const fetchForecast = async () => {
      setForecastLoading(true);
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_URL}/api/predictions/forecast`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ actions: selectedForecastActions }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success) {
            setForecastResult(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch forecast:", err);
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecast();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedForecastActions, result]);

  // Fetch AI coach nudge once result is available
  useEffect(() => {
    if (!result) return;
    const fetchNudge = async () => {
      setNudgeLoading(true);
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) idToken = await auth.currentUser.getIdToken();
        const resp = await fetch(`${API_URL}/api/coach/behavior`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${idToken}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.success && data.nudge) {
            setCoachNudge(data.nudge);
          }
        }
      } catch (err) {
        console.error("Failed to fetch coach nudge:", err);
      } finally {
        setNudgeLoading(false);
      }
    };
    fetchNudge();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // Tab State parsed from TanStack Router search params
  const search = Route.useSearch();
  const activeTab = search.tab || "overview";
  const navigate = useNavigate();

  const setActiveTab = (newTab: string) => {
    navigate({
      to: "/dashboard",
      search: { tab: newTab === "overview" ? undefined : newTab },
    });
  };

  // Diet preference state
  const [dietPref, setDietPref] = useState<"indian-veg" | "indian-nonveg">("indian-veg");

  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Progress Logger State
  const [logWeightVal, setLogWeightVal] = useState("");

  // Fetch longitudinal review when switching to progress tab or history updates
  useEffect(() => {
    if (activeTab === "progress") {
      const fetchReview = async () => {
        setReviewLoading(true);
        try {
          let idToken = "mock-uid-guest";
          if (auth.currentUser) {
            idToken = await auth.currentUser.getIdToken();
          }
          const response = await fetch(`${API_URL}/api/progress/review`, {
            headers: {
              "Authorization": `Bearer ${idToken}`
            }
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setReviewData(data);
            }
          }
        } catch (err) {
          console.error("Failed to fetch progress review:", err);
        } finally {
          setReviewLoading(false);
        }
      };
      fetchReview();
    }
  }, [activeTab, history]);

  if (!result || !profile) return <EmptyState />;

  function download() {
    if (!result || !profile) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    const pageW = doc.internal.pageSize.getWidth();
    const cw = pageW - margin * 2;
    let y = margin;

    // Header band
    doc.setFillColor(11, 30, 63);
    doc.rect(0, 0, pageW, 88, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("HealthGuard Printable Report", margin, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("AI-assisted preventive health assessment", margin, 58);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString(), pageW - margin, 58, { align: "right" });
    y = 120;
    doc.setTextColor(20);

    const ensureSpace = (heightNeeded: number) => {
      if (y + heightNeeded > 770) {
        doc.addPage();
        y = margin + 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(140);
        doc.text("HealthGuard Printable Report (cont.)", margin, margin - 15);
        doc.setDrawColor(230);
        doc.line(margin, margin - 10, pageW - margin, margin - 10);
      }
    };

    // Section title helper
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
    title("Your Profile Parameters");
    [
      `Age: ${profile.age}    Gender: ${profile.gender}`,
      `Height: ${profile.heightCm} cm    Weight: ${profile.weightKg} kg    BMI: ${result.bmi}`,
      `Smoking: ${profile.smoking}    Exercise: ${profile.exercise}`,
      `Family history: ${profile.familyHistory || "none reported"}`,
      `Reported symptoms: ${profile.symptoms || "none reported"}`,
    ].forEach((l) => para(l));
    y += 10;

    // Overall risk
    title("Overall risk score");
    ensureSpace(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    const color =
      result.overallRisk === "Low"
        ? [34, 139, 87]
        : result.overallRisk === "Moderate"
          ? [200, 130, 30]
          : [200, 60, 40];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(`${result.overallScore}/80`, margin, y);
    y += 26;
    doc.setFontSize(11);
    doc.text(`${result.overallRisk} risk`, margin, y);
    y += 22;
    doc.setTextColor(40);

    // Per-condition
    title("Per-condition risk");
    (
      [
        ["Diabetes (Type 2)", result.risk.diabetes, result.rationale.diabetes],
        ["Heart Disease", result.risk.heartDisease, result.rationale.heartDisease],
        ["Hypertension", result.risk.hypertension, result.rationale.hypertension],
      ] as const
    ).forEach(([name, score, why]) => {
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
    const sections: Array<[string, string]> = [
      ["Diet plan", result.dietPlan],
      ["Exercise plan", result.exercisePlan],
      ["Prevention recommendations", result.preventionTips],
    ];
    sections.forEach(([t, body]) => {
      y += 6;
      title(t);
      para(body.replace(/[#*_`>]/g, ""));
    });

    ensureSpace(40);
    y += 12;
    doc.setFontSize(8);
    doc.setTextColor(120);
    const disc = doc.splitTextToSize(
      "Disclaimer: This report contains AI-generated estimates produced for educational and preventive purposes. It is not a clinical diagnosis and does not replace consultation with a qualified medical professional.",
      cw,
    );
    doc.text(disc, margin, y);

    doc.save(`healthguard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  const overall = result.overallScore;
  const overallPct = Math.min(100, (overall / 80) * 100);
  const overallColor =
    result.overallRisk === "Low"
      ? CHART_GREEN
      : result.overallRisk === "Moderate"
        ? CHART_AMBER
        : CHART_RED;

  const riskData = [
    { name: "Diabetes", value: result.risk.diabetes, fill: colorFor(result.risk.diabetes) },
    {
      name: "Heart Disease",
      value: result.risk.heartDisease,
      fill: colorFor(result.risk.heartDisease),
    },
    {
      name: "Hypertension",
      value: result.risk.hypertension,
      fill: colorFor(result.risk.hypertension),
    },
  ];

  // Projected risk trend (based on overall score projected over 5 years)
  const trendData = Array.from({ length: 6 }).map((_, i) => ({
    month: ["Now", "+1mo", "+3mo", "+6mo", "+1yr", "+2yr"][i],
    "With plan": Math.max(8, Math.round(overall * (1 - i * 0.09))),
    "No change": Math.round(overall * (1 + i * 0.05)),
  }));

  // Fitness level recommendation calculation
  const recFitness: FitnessLevel =
    profile.exercise === "none"
      ? "beginner"
      : profile.exercise === "active"
        ? "advanced"
        : "intermediate";

  // Prevention strategy data mapping
  const dailyPreventionGoals = [
    { icon: Droplet, label: "Drink 2.5 L of water", target: "2.5 L" },
    { icon: Activity, label: "Walk 8,000+ steps", target: "8,000" },
    { icon: Moon, label: "Sleep 7-8 hours", target: "7-8 hr" },
    { icon: Salad, label: "5 servings fruits & vegetables", target: "5 servings" },
    { icon: HeartPulse, label: "10 min of deep breathing", target: "10 min" },
  ];

  const lifestyleRecommendations = [
    {
      area: "Nutrition",
      action: "Reduce ultra-processed foods to <2 servings/week",
      priority: "High",
    },
    {
      area: "Movement",
      action: "150 min moderate aerobic + 2 strength sessions weekly",
      priority: "High",
    },
    {
      area: "Sleep",
      action: "Fixed sleep window, screens off 30 min before bed",
      priority: "Medium",
    },
    {
      area: "Stress",
      action: "Daily 10-min mindfulness or breath-work practice",
      priority: "Medium",
    },
    profile.smoking === "current"
      ? {
          area: "Tobacco",
          action: "Begin a structured cessation program this month",
          priority: "High",
        }
      : { area: "Tobacco", action: "Continue avoidance of all tobacco/nicotine", priority: "Low" },
  ];

  const medicalFollowups = [
    { test: "Fasting blood glucose / HbA1c", freq: "Every 6-12 months" },
    { test: "Lipid panel (LDL, HDL, TG)", freq: "Annually" },
    { test: "Blood pressure check", freq: "Monthly at home" },
    { test: "Body composition / waist circumference", freq: "Quarterly" },
    { test: "Annual physical exam", freq: "Yearly" },
  ];

  // Progress metrics calculation
  const progressChartData = history.map((h) => ({
    date: new Date(h.date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    score: h.overallScore,
    bmi: h.bmi ? Number(h.bmi.toFixed(1)) : 0,
    weight: h.weightKg,
    diabetes: h.risks?.diabetes || 0,
    heart: h.risks?.heartDisease || 0,
    hypertension: h.risks?.hypertension || 0,
  }));

  const goalWeight = Math.round(22 * Math.pow(profile.heightCm / 100, 2));
  const startWeight = history[0]?.weightKg ?? profile.weightKg;
  const currWeight = history[history.length - 1]?.weightKg ?? profile.weightKg;
  const weightLost = startWeight - currWeight;
  const toGoalWeight = currWeight - goalWeight;
  const goalProgressPercentage = Math.max(
    0,
    Math.min(100, ((startWeight - currWeight) / Math.max(1, startWeight - goalWeight)) * 100),
  );

  const bestPossibleScore = simulateHealthScore(profile, {
    weightKg: Math.round(22 * Math.pow(profile.heightCm / 100, 2)),
    exercise: "active",
    smoking: "never",
    sleepHours: 8
  });
  const maxReduction = Math.max(0, overall - bestPossibleScore);

  async function handleLogWeight() {
    if (!result || !profile) return;
    const w = parseFloat(logWeightVal);
    if (!w || isNaN(w)) return;

    try {
      let idToken = "mock-uid-guest";
      if (auth.currentUser) {
        idToken = await auth.currentUser.getIdToken();
      }

      const response = await fetch(`${API_URL}/api/progress/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({ weightKg: w })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setProfile(data.profile);
          setResult(data.result);
          setHistory(data.history);
          setLogWeightVal("");
        }
      }
    } catch (err) {
      console.error("Failed to log manual weight:", err);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10">
      {/* Dashboard Header Banner */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge variant="secondary" className="rounded-full">
            Clinical Assessment Portal
          </Badge>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your Health Summary
          </h1>
          <p className="mt-2 text-muted-foreground">
            Generated for a {profile.age}-year-old {profile.gender}, BMI {result.bmi}.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button asChild variant="outline" className="border-teal/30 hover:bg-teal/5 text-teal hover:text-teal font-semibold">
            <Link to="/simulator">What-If Simulator</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/assessment">Re-run Assessment</Link>
          </Button>
          <Button onClick={download} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
            <Download className="h-4 w-4" /> Download Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Main Navigation Tabs */}
        <TabsList className="grid w-full grid-cols-3 bg-muted p-1 mb-8 gap-1 max-w-2xl mx-auto rounded-lg">
          <TabsTrigger value="overview" className="py-2.5 cursor-pointer">
            Summary
          </TabsTrigger>
          <TabsTrigger value="ai-coach" className="py-2.5 cursor-pointer">
            AI Coach
          </TabsTrigger>
          <TabsTrigger value="progress" className="py-2.5 cursor-pointer">
            Progress
          </TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW/SUMMARY SUB-TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Health Coach Check-In Card */}
          <Card className="border-border bg-surface shadow-card-soft overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-primary to-accent" />
            <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-5 w-5 animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-bold text-foreground">
                    Health Coach Check-In
                  </h3>
                  {nudgeLoading ? (
                    <div className="h-4 w-32 bg-muted/40 animate-pulse rounded-lg mt-1" />
                  ) : coachNudge ? (
                    <>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {coachNudge.message} {coachNudge.encouragement}
                      </p>
                      <div className="mt-2.5 flex items-center gap-2 bg-teal/5 border border-teal/10 rounded-lg p-2 max-w-xl">
                        <span className="text-[9px] font-bold uppercase tracking-widest text-teal font-mono shrink-0">
                          Next Action:
                        </span>
                        <span className="text-xs font-semibold text-foreground leading-none">
                          {coachNudge.nextAction}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-1">
                      No active nudges. Keep recording parameters to receive personalized coaching logs.
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => setActiveTab("ai-coach")}
                className="bg-teal text-white hover:bg-teal/90 font-bold text-xs h-9 cursor-pointer self-stretch md:self-auto rounded-lg shrink-0"
              >
                Go to AI Coach
              </Button>
            </CardContent>
          </Card>
          {/* Top row: Health Score, Risk Breakdown, AI Insights */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Card 1: Health Score */}
            <Card className="border-border bg-surface shadow-card-soft">
              <CardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    Overall Risk
                  </div>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span
                      className="font-display text-6xl font-bold tracking-tight"
                      style={{ color: overallColor }}
                    >
                      <AnimatedScore score={overall} />%
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">/ 80</span>
                  </div>
                  <div
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border"
                    style={{
                      color: overallColor,
                      borderColor: `${overallColor}30`,
                      backgroundColor: `${overallColor}08`,
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: overallColor }}
                    />
                    {result.overallRisk} Risk
                  </div>
                </div>
                
                <div className="mt-6 border-t border-border/40 pt-4 space-y-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                    Condition Risks Breakdown
                  </div>
                  {[
                    { name: "Diabetes", value: result.risk.diabetes },
                    { name: "Heart Disease", value: result.risk.heartDisease },
                    { name: "Hypertension", value: result.risk.hypertension },
                  ].map((r) => {
                    const c = colorFor(r.value);
                    return (
                      <div key={r.name} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">{r.name}</span>
                          <span style={{ color: c }}>{r.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/60 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${r.value}%`, backgroundColor: c }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Primary Risk Drivers */}
            <Card className="border-border bg-surface shadow-card-soft">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-base text-foreground font-semibold">
                  <Brain className="h-4 w-4 text-teal animate-pulse-slow" /> Primary Risk Drivers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-1 flex flex-col justify-between h-[calc(100%-60px)]">
                {driversLoading ? (
                  <div className="flex flex-col gap-3.5 py-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-5 bg-muted/40 animate-pulse rounded-lg" />
                    ))}
                    <div className="mt-4 h-12 bg-muted/30 animate-pulse rounded-lg" />
                  </div>
                ) : riskDrivers.length > 0 ? (
                  <div className="flex flex-col justify-between h-full space-y-4">
                    {/* Top Drivers List */}
                    <div className="space-y-3">
                      {riskDrivers.slice(0, 3).map((driver, index) => (
                        <div key={index} className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-foreground flex items-center gap-2">
                            <span className="text-teal font-bold">{index + 1}.</span>
                            <span>{driver.factor}</span>
                          </span>
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            {driver.contribution}%
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Risk Composition Visual Indicators */}
                    <div className="border-t border-border/40 pt-3 space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Your Risk Composition
                      </div>
                      
                      {/* Modifiable Risk */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Lifestyle Factors (Modifiable)
                          </span>
                          <span className="text-teal font-mono font-bold">{modifiableRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/65 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal rounded-full transition-all duration-500"
                            style={{ width: `${modifiableRisk}%` }}
                          />
                        </div>
                      </div>

                      {/* Non-Modifiable Risk */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Fixed Factors (Age / History)
                          </span>
                          <span className="text-amber-500 font-mono font-bold">{nonModifiableRisk}%</span>
                        </div>
                        <div className="h-2 w-full bg-muted/65 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${nonModifiableRisk}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                    <Sparkles className="h-8 w-8 text-teal/40 mb-2" />
                    <span>No active risk drivers identified. Your health profile looks excellent!</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Highest Impact Actions */}
            <Card className="relative border-border bg-surface shadow-card-soft overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal to-primary opacity-60" />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 font-display text-base text-foreground font-semibold">
                  <TrendingDown className="h-4 w-4 text-teal" /> Highest Impact Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1">
                {impactsLoading ? (
                  <div className="flex flex-col gap-2.5">
                    {[1,2,3].map(i => (
                      <div key={i} className="h-16 rounded-lg bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : actionImpacts.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {actionImpacts.map((action, idx) => {
                      const rankColors = ["text-amber-500", "text-slate-400", "text-orange-700"];
                      const badgeColors = [
                        "bg-teal/10 text-teal border-teal/20",
                        "bg-blue-500/10 text-blue-400 border-blue-500/20",
                        "bg-purple-500/10 text-purple-400 border-purple-500/20",
                      ];
                      return (
                        <div
                          key={action.id}
                          className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/50 p-2.5 hover:bg-accent/20 transition-colors"
                        >
                          {/* Rank */}
                          <div className={`text-base font-bold w-5 shrink-0 ${rankColors[idx]}`}>
                            {idx + 1}
                          </div>
                          {/* Icon + Title */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">{action.icon}</span>
                              <p className="text-xs font-semibold text-foreground truncate">{action.title}</p>
                            </div>
                            {/* Risk arrow */}
                            <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground font-mono">
                              <span className="font-semibold" style={{ color: colorFor(action.currentRisk) }}>{action.currentRisk}%</span>
                              <span>→</span>
                              <span className="font-semibold text-teal">{action.projectedRisk}%</span>
                            </div>
                          </div>
                          {/* Reduction badge */}
                          <div className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${badgeColors[idx]}`}>
                            -{action.absoluteReduction} pts
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {/* Fallback to static actionPriorities from result */}
                    {result.actionPriorities && result.actionPriorities.length > 0 ? (
                      result.actionPriorities.slice(0, 3).map((p, i) => (
                        <div key={i} className="flex items-start gap-2.5 rounded-lg border border-border bg-surface-muted/65 p-2.5">
                          <TrendingDown className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-foreground">{p.action}</p>
                            <p className="text-[10px] text-teal mt-0.5">↓ {Math.abs(p.estimatedImpact)} pts estimated</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 rounded-lg border border-teal/20 bg-teal/5 p-3">
                        <Sparkles className="h-4 w-4 text-teal shrink-0" />
                        <p className="text-xs text-teal font-medium">Your profile is well-optimised. Keep up the healthy habits!</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grid for Simulator Preview & Recent Food Impact */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Simulator Preview Card */}
            <Card className="border-border bg-surface shadow-card-soft overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-primary to-accent" />
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal animate-pulse" /> What-If Simulator Preview
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Proactive simulation of lifestyle adjustments and their forecasted impact on your overall risk.
                    </p>
                  </div>
                  <Button asChild size="sm" className="bg-teal text-white hover:bg-teal/90 gap-1.5 text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto">
                    <Link to="/simulator">
                      <span>Open Simulator →</span>
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2 flex-1 flex flex-col justify-center">
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Current Risk Badge */}
                  <div className="flex flex-col justify-center rounded-lg border border-border bg-accent/10 p-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Current Risk</span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-extrabold text-foreground">{overall}%</span>
                      <span className="text-xs text-muted-foreground">/ 80</span>
                    </div>
                  </div>

                  {/* Best Possible Reduction simulation */}
                  <div className="flex flex-col justify-between rounded-lg border border-border bg-teal/5 p-4 border-teal/20">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono">Best Possible Reduction</span>
                    <div className="mt-2 flex items-baseline gap-1.5">
                      <span className="font-display text-4xl font-extrabold text-teal">
                        -{maxReduction}%
                      </span>
                      <span className="text-xs text-muted-foreground">risk score reduction</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Food Impact Card */}
            <Card className="border-border bg-surface shadow-card-soft overflow-hidden relative flex flex-col justify-between">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-primary to-accent" />
              <CardHeader className="pb-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                      <ScanLine className="h-4 w-4 text-teal animate-pulse" /> Recent Food Impact
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Last scanned food and its personalized impact on your clinical risk profile.
                    </p>
                  </div>
                  <Button asChild size="sm" className="bg-teal text-white hover:bg-teal/90 gap-1.5 text-xs font-semibold cursor-pointer shrink-0 self-start sm:self-auto">
                    <Link to="/scanner">
                      <span>Open Scanner →</span>
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-2 flex-1 flex flex-col justify-center">
                {scansLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-teal" />
                  </div>
                ) : recentScan ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-foreground truncate max-w-[200px]">
                          {recentScan.productName}
                        </h4>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Scanned on {new Date(recentScan.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Scores & Badge */}
                      <div className="flex items-center gap-3 bg-surface-muted/20 border border-border/40 p-2 rounded-xl">
                        <div className="text-right">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">Food/Pers.</span>
                          <span className="text-xs font-bold text-foreground">
                            {recentScan.foodScore}/10 → <span className={
                              recentScan.personalizedScore >= 8 ? "text-green-500" :
                              recentScan.personalizedScore >= 5 ? "text-yellow-500" :
                              "text-red-500"
                            }>{recentScan.personalizedScore}/10</span>
                          </span>
                        </div>
                        <Badge className={`text-[9px] font-bold ${
                          recentScan.personalizedScore >= 8 ? "bg-green-500/10 text-green-500 border-green-500/20" :
                          recentScan.personalizedScore >= 5 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        } border`}>
                          {recentScan.riskLevel}
                        </Badge>
                      </div>
                    </div>

                    {/* Recommendation Snippet */}
                    <div className="text-xs bg-surface-muted/40 p-2.5 rounded-lg border border-border/30">
                      <p className="line-clamp-2 italic text-muted-foreground leading-relaxed">
                        "{recentScan.recommendation}"
                      </p>
                    </div>

                    {/* Alternatives */}
                    {recentScan.alternatives && recentScan.alternatives.length > 0 && (
                      <div className="flex flex-wrap gap-2 items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal">Alternatives:</span>
                        {recentScan.alternatives.slice(0, 2).map((alt, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] py-0.5 px-2 bg-teal/5 text-teal border-teal/10 font-medium">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-6 text-xs text-muted-foreground border-2 border-dashed border-border/80 rounded-xl bg-surface-muted/10">
                    <ScanLine className="h-8 w-8 text-teal/40 mb-2" />
                    <span>No scanned items yet. Scan an ingredient list to see your personalized score.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Health Trajectory Forecast Card */}
          <Card className="border-border bg-surface shadow-card-soft overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-primary to-accent" />
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal animate-pulse" /> Health Trajectory Forecast
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Predict where your chronic health risk is heading based on your planned lifestyle improvements.
              </p>
            </CardHeader>
            <CardContent className="pt-2 space-y-6">
              {/* Scenario Modifiers Selector */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Compare Scenarios (Select lifestyle adjustments):
                </h4>
                <div className="flex flex-wrap gap-3">
                  {profile && (profile.exercise === "none" || profile.exercise === "light") && (
                    <button
                      onClick={() => handleForecastActionToggle("exercise_30_min")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                        selectedForecastActions.includes("exercise_30_min")
                          ? "bg-teal/15 text-teal border-teal/40 animate-pulse-slow"
                          : "border-border bg-surface hover:bg-accent/40"
                      }`}
                    >
                      <Dumbbell className="h-3.5 w-3.5" /> Exercise 30 min/day
                    </button>
                  )}
                  {profile && (profile.weightKg / Math.pow(profile.heightCm / 100, 2)) >= 25 && (
                    <button
                      onClick={() => handleForecastActionToggle("lose_weight")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                        selectedForecastActions.includes("lose_weight")
                          ? "bg-teal/15 text-teal border-teal/40 animate-pulse-slow"
                          : "border-border bg-surface hover:bg-accent/40"
                      }`}
                    >
                      <Weight className="h-3.5 w-3.5" /> Lose Weight
                    </button>
                  )}
                  {profile && profile.smoking === "current" && (
                    <button
                      onClick={() => handleForecastActionToggle("quit_smoking")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                        selectedForecastActions.includes("quit_smoking")
                          ? "bg-teal/15 text-teal border-teal/40 animate-pulse-slow"
                          : "border-border bg-surface hover:bg-accent/40"
                      }`}
                    >
                      <HeartPulse className="h-3.5 w-3.5" /> Quit Smoking
                    </button>
                  )}
                  {profile && profile.alcohol && profile.alcohol !== "never" && (
                    <button
                      onClick={() => handleForecastActionToggle("limit_alcohol")}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all ${
                        selectedForecastActions.includes("limit_alcohol")
                          ? "bg-teal/15 text-teal border-teal/40 animate-pulse-slow"
                          : "border-border bg-surface hover:bg-accent/40"
                      }`}
                    >
                      <Salad className="h-3.5 w-3.5" /> Limit Alcohol
                    </button>
                  )}
                </div>
              </div>

              {/* Trajectory visualization */}
              {forecastResult ? (
                <div className="grid gap-6 md:grid-cols-3 items-center border-t border-border/40 pt-4">
                  {/* Left Column: Trend Points */}
                  <div className="md:col-span-2 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                      Projected Chronic Risk (lower is better)
                    </h4>
                    
                    <div className="grid grid-cols-4 gap-2 text-center relative py-4">
                      {/* Connector Line */}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border/60 -translate-y-1/2 z-0" />
                      
                      {[
                        { label: "Today", value: forecastResult.currentRisk, confidence: "High" },
                        { label: "30 Days", value: forecastResult.days30.risk, confidence: forecastResult.days30.confidence },
                        { label: "90 Days", value: forecastResult.days90.risk, confidence: forecastResult.days90.confidence },
                        { label: "180 Days", value: forecastResult.days180.risk, confidence: forecastResult.days180.confidence }
                      ].map((pt, i) => (
                        <div key={i} className="flex flex-col items-center z-10 relative">
                          <div className={`h-10 w-10 rounded-full border-2 flex items-center justify-center font-display font-black text-xs shadow-md bg-surface ${
                            pt.value < 33 ? "border-green-500 text-green-500 animate-pulse-slow" :
                            pt.value < 66 ? "border-amber-500 text-amber-500" :
                            "border-red-500 text-red-500"
                          }`}>
                            {pt.value}%
                          </div>
                          <span className="text-[10px] font-bold text-foreground mt-2">{pt.label}</span>
                          <span className="text-[8px] font-medium text-muted-foreground mt-0.5">Conf: {pt.confidence}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Score Summary */}
                  <div className="bg-surface-muted/20 border border-border/40 p-4 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                        Future Health Score
                      </div>
                      <div className="mt-1 flex items-baseline gap-1.5 justify-center">
                        <span className="font-display text-3xl font-extrabold text-teal">
                          {Math.round(100 - forecastResult.days180.risk)}
                        </span>
                        <span className="text-xs text-muted-foreground">/ 100</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground block mt-0.5">
                        Current: {Math.round(100 - forecastResult.currentRisk)}/100
                      </span>
                    </div>

                    <div className="w-full bg-teal/10 rounded-lg p-2 border border-teal/20">
                      <span className="text-[10px] font-bold text-teal block leading-tight">
                        Projected Health Score: {Math.round(100 - forecastResult.days180.risk)}
                      </span>
                      <span className="text-[9px] text-teal/80 block mt-0.5 font-medium leading-normal">
                        if recommendations are followed.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-teal" />
                </div>
              )}

              {/* AI Coaching Explanation box */}
              {forecastResult && forecastResult.explanation && (
                <div className="rounded-xl border border-border bg-surface-muted/30 p-4 shadow-sm space-y-2 relative">
                  {forecastLoading && (
                    <div className="absolute inset-0 bg-surface/50 flex items-center justify-center backdrop-blur-[1px] rounded-xl z-20">
                      <Loader2 className="h-5 w-5 animate-spin text-teal" />
                    </div>
                  )}
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" /> AI Forecast Trajectory Insight
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90 font-medium">
                    "{forecastResult.explanation}"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Snapshot Area Chart */}
          <Card className="border-border shadow-card-soft">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Progress Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="h-[260px] pt-0">
              {progressChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={progressChartData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_NAVY} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART_NAVY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={CHART_NAVY}
                      strokeWidth={2}
                      fill="url(#gScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Log your weight or run multiple assessments to see your overall risk trend.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. AI COACH SUB-TAB */}
        <TabsContent value="ai-coach" className="space-y-6">
          {coachNudge ? (
            <Card className="border-border bg-surface shadow-card-soft overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal via-primary to-accent" />
              <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-teal/15 text-teal flex items-center justify-center shrink-0 mt-0.5">
                    <Target className="h-5 w-5 text-teal animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-display text-sm font-bold text-foreground">
                      This Week's Focus
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-semibold text-teal">
                      "{coachNudge.nextAction}" — {coachNudge.encouragement}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-xl border border-border/50 bg-surface-muted/20 p-4">
              <h2 className="text-sm font-bold text-foreground">AI Coach Recommendations</h2>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Explore your personalized risk analysis, regionally customized diet, physical fitness plans, and clinical screening directives.
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Suggested Screenings */}
            <Card className="border-border shadow-card-soft lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Stethoscope className="h-4 w-4 text-teal" /> Recommended Medical Screenings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {medicalFollowups.map((m) => (
                  <div
                    key={m.test}
                    className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{m.test}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {m.freq}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Condition-Specific Detailed Risks */}
            <div className="lg:col-span-2 space-y-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                Disease-Specific Insights (Click cards to expand clinical rationale)
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    k: "diabetes",
                    label: "Diabetes (Type 2)",
                    v: result.risk.diabetes,
                    why: result.rationale.diabetes,
                    tips: "Monitor daily sugar and glycemic index, adhere to the regional vegetable/fiber diet, perform 30+ minutes of aerobic training, and schedule quarterly fasting blood tests.",
                    factors: ["BMI", "Family History", "Physical Activity", "Age", "Lifestyle Habits"],
                  },
                  {
                    k: "heart",
                    label: "Heart Disease",
                    v: result.risk.heartDisease,
                    why: result.rationale.heartDisease,
                    tips: "Minimize sodium and trans-fat intake, integrate heart-rate-raising cardio exercises, track blood pressure, and review lipid markers annually.",
                    factors: ["Exercise Frequency", "Smoking Status", "Age", "Weight Profile"],
                  },
                  {
                    k: "htn",
                    label: "Hypertension",
                    v: result.risk.hypertension,
                    why: result.rationale.hypertension,
                    tips: "Reduce sodium load to <1,500mg, log blood pressure weekly, implement structured recovery breathing, and quit/avoid nicotine completely.",
                    factors: ["Weight", "Activity Level", "Family History", "Age"],
                  },
                ].map((r) => {
                  const c = colorFor(r.v);
                  const isExpanded = expandedCard === r.k;
                  return (
                    <Card
                      key={r.k}
                      className={`border border-border bg-surface shadow-card-soft transition-all duration-300 cursor-pointer hover:border-teal/30 hover:bg-accent/5 ${
                        isExpanded ? "ring-1 ring-primary/20 sm:col-span-3" : ""
                      }`}
                      onClick={() => setExpandedCard(isExpanded ? null : r.k)}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <span>{r.label}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className="font-medium text-xs"
                            style={{ color: c, borderColor: c }}
                          >
                            {levelFor(r.v)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                          <span className="font-display text-3xl font-bold" style={{ color: c }}>
                            {r.v}
                          </span>
                          <span className="text-xs text-muted-foreground">/ 100</span>
                        </div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${r.v}%`, background: c }}
                          />
                        </div>

                        {isExpanded && (
                          <div className="mt-4 border-t border-border pt-4 space-y-3">
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono">
                                AI Clinical Rationale
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-foreground">{r.why}</p>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-wider text-teal font-mono">
                                Modifiable Lifestyle Adjustments
                              </div>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                {r.tips}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Kitchen-Adapted Diet Plan */}
          <div className="space-y-4 border-t border-border/40 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Badge variant="secondary" className="rounded-full">
                  AI diet planner
                </Badge>
                <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                  Kitchen-Adapted Diet Plan
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Regionally-adapted meals built around your BMI ({result.bmi.toFixed(1)}) and risk profile.
                </p>
              </div>
              <div className="flex rounded-lg border border-border bg-surface p-1">
                {[
                  { v: "indian-veg" as const, label: "Vegetarian" },
                  { v: "indian-nonveg" as const, label: "Non-vegetarian" },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setDietPref(o.v)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                      dietPref === o.v
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            <Tabs defaultValue="breakfast" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-4 bg-muted p-1">
                {(Object.keys(meals) as Array<keyof typeof meals>).map((k) => {
                  const M = meals[k];
                  return (
                    <TabsTrigger key={k} value={k} className="gap-2 cursor-pointer">
                      <M.icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{M.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {(Object.keys(meals) as Array<keyof typeof meals>).map((k) => {
                const M = meals[k];
                const list = dietSamples[dietPref][k];
                return (
                  <TabsContent key={k} value={k} className="mt-4">
                    <Card className="border-border bg-surface shadow-card-soft">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 font-display text-base">
                            <M.icon className="h-4 w-4 text-teal" /> {M.label}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground">~{M.kcal} kcal</span>
                        </div>
                      </CardHeader>
                      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                        {list.map((dish, i) => (
                          <div
                            key={i}
                            className="rounded-lg border border-border bg-surface-muted/60 p-4"
                          >
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-teal font-mono">
                              {week[i]}
                            </div>
                            <div className="mt-1.5 text-sm font-medium leading-snug">{dish}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>

            <Card className="border-border shadow-card-soft">
              <CardHeader>
                <CardTitle className="font-display text-base">Nutrition Advice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight">
                  <ReactMarkdown>{result.dietPlan}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fitness Plan */}
          <div className="space-y-4 border-t border-border/40 pt-6">
            <div>
              <Badge variant="secondary" className="rounded-full">
                Exercise Plan
              </Badge>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">
                Your Weekly Workout Plan
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Calibrated training plans based on your exercise baseline profile:{" "}
                <span className="font-semibold capitalize text-foreground">{recFitness}</span>.
              </p>
            </div>

            <Tabs defaultValue={recFitness} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3 bg-muted p-1">
                <TabsTrigger value="beginner" className="cursor-pointer">
                  Beginner
                </TabsTrigger>
                <TabsTrigger value="intermediate" className="cursor-pointer">
                  Intermediate
                </TabsTrigger>
                <TabsTrigger value="advanced" className="cursor-pointer">
                  Advanced
                </TabsTrigger>
              </TabsList>

              {(Object.keys(fitnessPlans) as FitnessLevel[]).map((level) => {
                const p = fitnessPlans[level];
                return (
                  <TabsContent key={level} value={level} className="mt-4 space-y-4">
                    <div className="grid gap-3 grid-cols-3">
                      <MetricCard icon={Timer} label="Weekly volume" value={p.weekly} />
                      <MetricCard icon={Flame} label="Estimated burn" value={`${p.kcal} kcal / wk`} />
                      <MetricCard icon={Dumbbell} label="Intensity" value={p.intensity} />
                    </div>

                    <Card className="border-border shadow-card-soft">
                      <CardHeader>
                        <CardTitle className="font-display text-base">
                          Your Daily Activity Guide — {p.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                          {p.sessions.map((s) => (
                            <div
                              key={s.day}
                              className="rounded-lg border border-border bg-surface p-4"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-teal font-mono">
                                  {s.day}
                                </div>
                                <div className="text-[10px] text-muted-foreground">{s.min} min</div>
                              </div>
                              <div className="mt-2 font-display text-sm font-semibold">{s.focus}</div>
                              <div className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                                {s.detail}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                );
              })}
            </Tabs>

            <Card className="border-border shadow-card-soft">
              <CardHeader>
                <CardTitle className="font-display text-base">Fitness Advice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:tracking-tight">
                  <ReactMarkdown>{result.exercisePlan}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 3. PROGRESS TRACKING SUB-TAB */}
        <TabsContent value="progress" className="space-y-6">
          <div>
            <Badge variant="secondary" className="rounded-full">
              Progress tracking
            </Badge>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Log Your Weight & Track Progress
            </h2>
            <p className="mt-2 text-muted-foreground">
              Log your weight periodically to recalculate BMI thresholds and monitor overall health
              scores.
            </p>
          </div>

          <div className="rounded-xl border border-border/50 bg-surface-muted/20 p-4">
            <h2 className="text-sm font-bold text-foreground">Track Your Health Changes</h2>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Monitor your weight, body mass index, and overall health scores over time to see the
              direct benefits of your lifestyle changes. Log your current weight below to record
              your progress and keep your records updated.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Assessments completed" value={`${history.length}`} icon={Calendar} />
            <KpiCard
              label="Current weight"
              value={`${currWeight} kg`}
              icon={Weight}
              hint={
                weightLost > 0
                  ? `▼ ${weightLost.toFixed(1)} kg lost`
                  : weightLost < 0
                    ? `▲ ${Math.abs(weightLost).toFixed(1)} kg gained`
                    : "no change"
              }
              hintColor={
                weightLost > 0
                  ? "text-success"
                  : weightLost < 0
                    ? "text-danger"
                    : "text-muted-foreground"
              }
            />
            <KpiCard
              label="Goal weight"
              value={`${goalWeight} kg`}
              icon={Target}
              hint={toGoalWeight > 0 ? `${toGoalWeight.toFixed(1)} kg to go` : "goal reached"}
              hintColor={toGoalWeight > 0 ? "text-warning" : "text-success"}
            />
            <KpiCard
              label="Current overall score"
              value={`${result.overallScore}`}
              icon={TrendingDown}
              hint={`${result.overallRisk} risk`}
            />
          </div>

          {/* AI PROGRESS REVIEW & ADAPTED COACHING */}
          {reviewLoading && (
            <div className="flex items-center justify-center p-8 rounded-xl border border-border bg-surface-muted/20">
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground font-medium">Analyzing progress trends with AI Coach...</span>
              </div>
            </div>
          )}

          {!reviewLoading && reviewData && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* AI Narrative and Coaching */}
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-accent/5 to-surface shadow-card-soft overflow-hidden md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <CardTitle className="font-display text-base text-foreground font-bold">AI Progress Insights</CardTitle>
                      <p className="text-xs text-muted-foreground">Personalized longitudinal wellness assessment</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border border-border/40 bg-surface/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Trend Analysis Summary</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-foreground font-medium">
                      {reviewData.review}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 bg-surface/50 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent-foreground">Adapted Coaching & Strategy</h4>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground font-medium">
                      {reviewData.coaching}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Milestones Card */}
              {reviewData.milestones && reviewData.milestones.length > 0 && (
                <Card className="border-border shadow-card-soft md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="font-display text-base text-foreground font-bold">Unlocked Health Milestones</CardTitle>
                    <p className="text-xs text-muted-foreground">Celebrate your preventive health accomplishments</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {reviewData.milestones.map((m: any) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2.5 rounded-full border border-success/20 bg-success/5 px-4 py-2 text-success shadow-sm transition-all hover:scale-105 hover:bg-success/10"
                        >
                          <span className="text-lg">🎉</span>
                          <div className="text-left">
                            <p className="text-xs font-bold leading-none">{m.title}</p>
                            <p className="text-[10px] text-success/80 mt-0.5 font-medium">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-border shadow-card-soft">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Risk score over time</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={progressChartData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CHART_NAVY} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={CHART_NAVY} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke={CHART_NAVY}
                      strokeWidth={2}
                      fill="url(#gScore)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card-soft">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Weight tracking</CardTitle>
              </CardHeader>
              <CardContent className="h-[260px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressChartData}
                    margin={{ top: 10, right: 16, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis
                      fontSize={11}
                      stroke="var(--muted-foreground)"
                      domain={["auto", "auto"]}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="weight"
                      stroke={CHART_TEAL}
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card-soft lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Condition-Specific Risk Trends</CardTitle>
                <p className="text-xs text-muted-foreground">Diabetes, CVD, and Hypertension score trajectory</p>
              </CardHeader>
              <CardContent className="h-[280px] pt-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressChartData}
                    margin={{ top: 15, right: 16, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" fontSize={11} stroke="var(--muted-foreground)" />
                    <YAxis fontSize={11} stroke="var(--muted-foreground)" />
                    <Tooltip />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line
                      type="monotone"
                      name="Diabetes Risk %"
                      dataKey="diabetes"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      name="Heart/CVD Risk %"
                      dataKey="heart"
                      stroke="#f97316"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      name="Hypertension Risk %"
                      dataKey="hypertension"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="border-border shadow-card-soft lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Weight goal</CardTitle>
                <p className="text-xs text-muted-foreground">Targeting a healthy BMI of 22.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{startWeight} kg start</span>
                  <span className="font-medium">{currWeight} kg current</span>
                  <span>{goalWeight} kg goal</span>
                </div>
                <Progress value={goalProgressPercentage} className="h-3" />
                <div className="text-xs text-muted-foreground">
                  {goalProgressPercentage.toFixed(0)}% of the way to your healthy weight range.
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-card-soft">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-base">Record Weight</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="weight" className="text-xs text-muted-foreground">
                  Weight (kg)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="weight"
                    type="number"
                    min={20}
                    max={300}
                    value={logWeightVal}
                    onChange={(e) => setLogWeightVal(e.target.value)}
                    placeholder={`${currWeight}`}
                  />
                  <Button
                    onClick={handleLogWeight}
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" /> Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border shadow-card-soft">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Your Health Changes</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  l: "Weight delta",
                  v: `${weightLost >= 0 ? "−" : "+"}${Math.abs(weightLost).toFixed(1)} kg`,
                  c: weightLost >= 0 ? "text-success" : "text-danger",
                  t: TrendingDown,
                },
                { l: "BMI now", v: result.bmi.toFixed(1), c: "text-foreground", t: Target },
                {
                  l: "Risk delta vs baseline",
                  v:
                    history.length > 1
                      ? `${history[history.length - 1].overallScore - history[0].overallScore} pts`
                      : "—",
                  c:
                    history.length > 1 &&
                    history[history.length - 1].overallScore < history[0].overallScore
                      ? "text-success"
                      : "text-warning",
                  t: TrendingUp,
                },
              ].map((s) => (
                <div key={s.l} className="rounded-lg border border-border bg-surface-muted/60 p-4">
                  <div className="flex items-center gap-2">
                    <s.t className={`h-4 w-4 ${s.c}`} />
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.l}
                    </div>
                  </div>
                  <div className={`mt-2 font-display text-2xl font-bold ${s.c}`}>{s.v}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center flex flex-col items-center justify-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent text-teal shadow-card-soft">
        <HeartPulse className="h-7 w-7" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground">
        Welcome to HealthGuard AI Portal
      </h1>
      <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-md">
        Complete your health assessment to unlock your personalized dashboard.
      </p>

      <Button
        onClick={() => navigate({ to: "/assessment" })}
        className="mt-8 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all font-semibold px-6 py-2 h-11"
      >
        <span>Start Assessment</span>
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5 font-display text-base font-semibold">{value}</div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card className="border-border shadow-card-soft">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-teal">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="font-display text-base font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  hintColor = "text-muted-foreground",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  hintColor?: string;
}) {
  return (
    <Card className="border-border shadow-card-soft">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-teal">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          <div className="font-display text-lg font-bold">{value}</div>
          {hint && <div className={`text-[11px] font-medium ${hintColor}`}>{hint}</div>}
        </div>
      </CardContent>
    </Card>
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
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Parameter Description</th>
            <th className="px-4 py-3 text-right font-semibold">Result Value</th>
            <th className="px-4 py-3 font-semibold">Reference Interval</th>
            <th className="px-4 py-3 text-right font-semibold">Status</th>
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
                  {item.status || "Recorded"}
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
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <table className="w-full text-left text-xs font-mono">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <th className="px-4 py-3 font-semibold">Analyzed Condition</th>
            <th className="px-4 py-3 text-right font-semibold">Risk Index</th>
            <th className="px-4 py-3 font-semibold">Risk Level</th>
            <th className="px-4 py-3 font-semibold">Statistical Rationale Preview</th>
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
