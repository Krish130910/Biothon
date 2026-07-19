import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Sparkles,
  Check,
  HelpCircle,
  Camera,
  Upload,
  ScanLine,
  AlertTriangle,
  FileText,
  CheckCircle,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { isConfigured, db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { profileSyncService } from "@/lib/profile-sync";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

import { assessHealth, assessLabReportImage, type HealthResult } from "@/lib/health.functions";
import {
  useHealthResult,
  useProfile,
  pushHistory,
  useLangPref,
  type Profile,
  getScopedKey,
} from "@/lib/health-store";
import { tr } from "@/lib/i18n";
import { z } from "zod";
import SplitText from "@/components/ui/split-text";

export const Route = createLazyFileRoute("/_app/assessment")({
  component: AssessmentPage,
});

const steps = [
  { id: 1, labelKey: "s1Label" as const, descKey: "s1Desc" as const },
  { id: 2, labelKey: "s2Label" as const, descKey: "s2Desc" as const },
  { id: 3, labelKey: "s3Label" as const, descKey: "s3Desc" as const },
  { id: 4, labelKey: "s4Label" as const, descKey: "s4Desc" as const },
  { id: 5, labelKey: "s5Label" as const, descKey: "s5Desc" as const },
];

function AssessmentPage() {
  const { mode, step: initialStep } = Route.useSearch();
  const { hasCompletedAssessment, loading: authLoading, setHasCompletedAssessment } = useAuth();
  const navigate = useNavigate();

  const [lang] = useLangPref();
  const [profile, setProfile] = useProfile();
  const [, setResult] = useHealthResult();

  const [step, setStep] = useState(initialStep ?? 1);
  const [loading, setLoading] = useState(false);

  const form = useForm<Profile>({
    defaultValues: profile ?? {
      age: 35,
      gender: "male",
      heightCm: 170,
      weightKg: 72,
      smoking: "never",
      exercise: "light",
      familyHistory: "",
      symptoms: "",
      labObservations: [],
    },
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [extractedLabs, setExtractedLabs] = useState<Record<string, { value: number; unit: string; checked: boolean; error?: string }>>({});
  const [reportDate, setReportDate] = useState<string>("");
  const [useExistingReport, setUseExistingReport] = useState(true);

  const existingLabs = profile?.labObservations || [];
  const hasExistingReport = existingLabs.length > 0;

  useEffect(() => {
    if (step === 5 && hasExistingReport && useExistingReport) {
      form.setValue("labObservations", existingLabs);
    }
  }, [step, useExistingReport, hasExistingReport, existingLabs, form]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const bounds: Record<string, { min: number; max: number; unit: string; name: string }> = {
    fastingBloodSugar: { min: 50, max: 400, unit: "mg/dL", name: "Fasting Blood Sugar" },
    HbA1c: { min: 3, max: 18, unit: "%", name: "HbA1c" },
    totalCholesterol: { min: 50, max: 500, unit: "mg/dL", name: "Total Cholesterol" },
    ldl: { min: 20, max: 300, unit: "mg/dL", name: "LDL Cholesterol" },
    hdl: { min: 10, max: 150, unit: "mg/dL", name: "HDL Cholesterol" },
    triglycerides: { min: 30, max: 600, unit: "mg/dL", name: "Triglycerides" },
  };

  const initializeEmptyLabs = () => {
    const empty: Record<string, { value: number; unit: string; checked: boolean; error?: string }> = {};
    Object.entries(bounds).forEach(([key, rule]) => {
      empty[key] = {
        value: 0,
        unit: rule.unit,
        checked: false,
      };
    });
    setExtractedLabs(empty);
    setReportDate(new Date().toISOString().split("T")[0]);
  };

  useEffect(() => {
    initializeEmptyLabs();
  }, []);

  const startCamera = async () => {
    setSelectedFile(null);
    setExtractedLabs({});
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsCameraActive(true);
      toast.success("Camera activated successfully.");
    } catch (err) {
      console.error("Camera access error:", err);
      toast.error("Could not access camera. Please upload a file instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const processOCRResult = (result: any) => {
    const initialExtracted: Record<string, { value: number; unit: string; checked: boolean; error?: string }> = {};

    Object.entries(bounds).forEach(([key, rule]) => {
      const fieldData = result[key];
      if (fieldData && typeof fieldData.value === "number") {
        const val = fieldData.value;
        const u = fieldData.unit || rule.unit;
        const inBounds = val >= rule.min && val <= rule.max;
        initialExtracted[key] = {
          value: val,
          unit: u,
          checked: inBounds,
          error: inBounds ? undefined : `Value out of sane range (${rule.min}-${rule.max} ${rule.unit})`,
        };
      } else {
        initialExtracted[key] = {
          value: 0,
          unit: rule.unit,
          checked: false,
        };
      }
    });

    setExtractedLabs(initialExtracted);
    if (result.reportDate) {
      setReportDate(result.reportDate);
    } else {
      setReportDate(new Date().toISOString().split("T")[0]);
    }
  };

  const captureFrame = async () => {
    if (!videoRef.current) return;
    setIsScanning(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not construct 2D context");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg");
      const base64Data = dataUrl.split(",")[1];

      stopCamera();

      const result = await assessLabReportImage({
        base64Image: base64Data,
        mimeType: "image/jpeg",
      });

      processOCRResult(result);
      toast.success("Lab report scanned successfully!");
    } catch (err: any) {
      console.error("Vision API error:", err);
      toast.error("Failed to analyze lab report. Please enter manually.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsScanning(true);
    stopCamera();

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          resolve(base64);
        };
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const result = await assessLabReportImage({
        base64Image: base64Data,
        mimeType: file.type || "image/jpeg",
      });

      processOCRResult(result);
      toast.success("Lab report analyzed successfully!");
    } catch (err: any) {
      console.error("File upload OCR error:", err);
      toast.error("Failed to extract lab report. Please check the image and try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const saveLabObservations = () => {
    const obsList: any[] = [];
    Object.entries(extractedLabs).forEach(([code, info]) => {
      if (info.checked && info.value > 0) {
        const rule = bounds[code];
        const inBounds = info.value >= rule.min && info.value <= rule.max;
        obsList.push({
          code,
          value: Number(info.value),
          unit: info.unit,
          observedAt: reportDate ? new Date(reportDate).toISOString() : new Date().toISOString(),
          isVerified: inBounds,
          verifiedBy: "user",
        });
      }
    });

    form.setValue("labObservations", obsList);
  };

  const total = steps.length;
  const pct = (step / total) * 100;

  async function submit(values: Profile) {
    const initiatingUid = auth.currentUser?.uid || "guest";
    setLoading(true);
    try {
      const isBloodReportOnly = initialStep === 5;
      const updatedValues = {
        ...values,
        bloodReportOnly: isBloodReportOnly,
      };

      const res = (await assessHealth({
        data: {
          ...updatedValues,
          age: Number(values.age),
          heightCm: Number(values.heightCm),
          weightKg: Number(values.weightKg),
          language: lang,
          labObservations: values.labObservations || [],
        },
      })) as HealthResult & { bmi: number };

      const currentUid = auth.currentUser?.uid || "guest";
      if (currentUid !== initiatingUid) {
        console.warn("Assessment submit aborted: User switched accounts during calculation.");
        return;
      }

      // 1. Save profile, result, and history locally
      setProfile(updatedValues);
      setResult(res);

      const newHistoryEntry = {
        date: new Date().toISOString(),
        overallScore: res.overallScore,
        bmi: res.bmi,
        weightKg: values.weightKg,
        risks: res.risk,
      };
      pushHistory(newHistoryEntry);

      const historyKey = getScopedKey("hg.history.v1", currentUid === "guest" ? null : currentUid);
      const localHistoryRaw = localStorage.getItem(historyKey);
      const historyList = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];

      // 2. Update the auth context state and navigate to the dashboard instantly
      setHasCompletedAssessment(true);
      toast.success("Assessment complete");
      navigate({ to: "/dashboard" });

      // 3. Queue local-first background synchronization (non-blocking)
      profileSyncService.queueProfileSync(values, res, historyList);
    } catch (e: unknown) {
      console.error("Assessment submit flow failure:", e);
      toast.error("Assessment calculation failed. Please verify inputs.");
    } finally {
      setLoading(false);
    }
  }

  const onInvalid = (errors: unknown) => {
    console.error("Form validation errors:", errors);
    toast.error("Please fill in all fields correctly before generating your plan.");
  };

  async function next() {
    let fieldsToValidate: Array<keyof Profile> = [];
    if (step === 1) {
      fieldsToValidate = ["age", "gender", "heightCm", "weightKg"];
    } else if (step === 2) {
      fieldsToValidate = ["smoking", "exercise"];
    }

    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) {
        toast.error("Please fill in all required fields correctly before continuing.");
        return;
      }
    }

    if (step === 5) {
      saveLabObservations();
    }

    if (step < total) setStep(step + 1);
    else form.handleSubmit(submit, onInvalid)();
  }
  function back() {
    if (step > 1) setStep(step - 1);
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-10 lg:py-14">
      <div className="mb-8">
        <Badge
          variant="secondary"
          className="rounded-full bg-teal/10 text-teal border border-teal/20 hover:bg-teal/20"
        >
          {tr("assessment", lang)}
        </Badge>
        <SplitText
          text={tr("assessmentTitle", lang)}
          className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl"
          delay={35}
          duration={0.6}
          ease="power3.out"
          splitType="chars"
          tag="h1"
          textAlign="left"
        />
        <p className="mt-2 max-w-2xl text-muted-foreground">{tr("assessmentSubtitle", lang)}</p>
      </div>

      {/* Step bar */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">
            {tr("stepWord", lang)} {step} {tr("ofWord", lang)} {total}
          </span>
          <span className="font-semibold text-teal uppercase tracking-wider text-[10px]">
            {Math.round(pct)}% {tr("completeWord", lang)}
          </span>
        </div>
        <Progress value={pct} className="h-1 bg-muted [&>div]:bg-teal" />
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {steps.map((s) => {
            const active = s.id === step;
            const done = s.id < step;
            return (
              <div
                key={s.id}
                className={`rounded-lg border p-3 text-left transition-all duration-300 relative overflow-hidden ${
                  active
                    ? "border-teal/60 bg-surface shadow-[0_0_12px_rgba(20,184,166,0.08)]"
                    : done
                      ? "border-border/60 bg-accent/20"
                      : "border-border bg-surface-muted/30"
                }`}
              >
                {active && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal via-teal to-primary" />
                )}
                <div className="flex items-center gap-2">
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold transition-colors ${
                      active
                        ? "bg-teal text-white"
                        : done
                          ? "bg-teal/20 text-teal"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {done ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span
                    className={`text-sm font-semibold transition-colors ${active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {tr(s.labelKey, lang)}
                  </span>
                </div>
                <div className="mt-1.5 hidden text-xs text-muted-foreground sm:block">
                  {tr(s.descKey, lang)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="border-border bg-surface shadow-card-soft">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(submit, onInvalid)} className="space-y-6">
            {step === 1 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label={tr("age", lang)}
                  helperText={tr("helperDemographic", lang)}
                  error={form.formState.errors.age?.message}
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      className={`h-11 border-border/80 bg-surface/50 pr-10 transition-all duration-200 focus:border-teal focus:ring-teal ${
                        form.formState.errors.age
                          ? "border-red-500 focus-visible:ring-red-500 bg-red-500/5"
                          : ""
                      }`}
                      {...form.register("age", {
                        valueAsNumber: true,
                        required: "Age is required",
                        min: { value: 1, message: "Age must be at least 1" },
                        max: { value: 120, message: "Age cannot exceed 120" },
                      })}
                    />
                    <span className="absolute right-3 top-3 text-xs text-muted-foreground font-mono">
                      {tr("yrs", lang)}
                    </span>
                  </div>
                </Field>

                <Field
                  label={tr("gender", lang)}
                  helperText={tr("helperMetabolic", lang)}
                  error={form.formState.errors.gender?.message}
                >
                  <Select
                    value={form.watch("gender")}
                    onValueChange={(v) => form.setValue("gender", v as Profile["gender"])}
                  >
                    <SelectTrigger
                      className={`h-11 border-border/80 bg-surface/50 transition-all duration-200 focus:border-teal focus:ring-teal ${
                        form.formState.errors.gender ? "border-red-500 focus:ring-red-500" : ""
                      }`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">{tr("male", lang)}</SelectItem>
                      <SelectItem value="female">{tr("female", lang)}</SelectItem>
                      <SelectItem value="other">{tr("other", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label={tr("height", lang)}
                  tooltip={tr("tooltipHeight", lang)}
                  helperText={tr("helperHeight", lang)}
                  error={form.formState.errors.heightCm?.message}
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={50}
                      max={260}
                      className={`h-11 border-border/80 bg-surface/50 pr-10 transition-all duration-200 focus:border-teal focus:ring-teal ${
                        form.formState.errors.heightCm
                          ? "border-red-500 focus-visible:ring-red-500 bg-red-500/5"
                          : ""
                      }`}
                      {...form.register("heightCm", {
                        valueAsNumber: true,
                        required: "Height is required",
                        min: { value: 50, message: "Height must be at least 50 cm" },
                        max: { value: 260, message: "Height cannot exceed 260 cm" },
                      })}
                    />
                    <span className="absolute right-3 top-3 text-xs text-muted-foreground font-mono">
                      {tr("cm", lang)}
                    </span>
                  </div>
                </Field>

                <Field
                  label={tr("weight", lang)}
                  tooltip={tr("tooltipWeight", lang)}
                  helperText={tr("helperWeight", lang)}
                  error={form.formState.errors.weightKg?.message}
                >
                  <div className="relative">
                    <Input
                      type="number"
                      min={10}
                      max={400}
                      className={`h-11 border-border/80 bg-surface/50 pr-10 transition-all duration-200 focus:border-teal focus:ring-teal ${
                        form.formState.errors.weightKg
                          ? "border-red-500 focus-visible:ring-red-500 bg-red-500/5"
                          : ""
                      }`}
                      {...form.register("weightKg", {
                        valueAsNumber: true,
                        required: "Weight is required",
                        min: { value: 10, message: "Weight must be at least 10 kg" },
                        max: { value: 400, message: "Weight cannot exceed 400 kg" },
                      })}
                    />
                    <span className="absolute right-3 top-3 text-xs text-muted-foreground font-mono">
                      {tr("kg", lang)}
                    </span>
                  </div>
                </Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-6 sm:grid-cols-2">
                <Field
                  label={tr("smoking", lang)}
                  helperText={tr("helperSmoking", lang)}
                  error={form.formState.errors.smoking?.message}
                >
                  <Select
                    value={form.watch("smoking")}
                    onValueChange={(v) => form.setValue("smoking", v as Profile["smoking"])}
                  >
                    <SelectTrigger className="h-11 border-border/80 bg-surface/50 transition-all duration-200 focus:border-teal focus:ring-teal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">{tr("neverSmoked", lang)}</SelectItem>
                      <SelectItem value="former">{tr("formerSmoker", lang)}</SelectItem>
                      <SelectItem value="current">{tr("currentSmoker", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field
                  label={tr("exercise", lang)}
                  helperText={tr("helperExercise", lang)}
                  error={form.formState.errors.exercise?.message}
                >
                  <Select
                    value={form.watch("exercise")}
                    onValueChange={(v) => form.setValue("exercise", v as Profile["exercise"])}
                  >
                    <SelectTrigger className="h-11 border-border/80 bg-surface/50 transition-all duration-200 focus:border-teal focus:ring-teal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tr("exerciseNone", lang)}</SelectItem>
                      <SelectItem value="light">{tr("exerciseLight", lang)}</SelectItem>
                      <SelectItem value="moderate">{tr("exerciseModerate", lang)}</SelectItem>
                      <SelectItem value="active">{tr("exerciseActive", lang)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}

            {step === 3 && (
              <Field
                label={tr("familyHistory", lang)}
                tooltip={tr("tooltipFamilyHistory", lang)}
                helperText={tr("helperFamilyHistory", lang)}
                error={form.formState.errors.familyHistory?.message}
              >
                <Textarea
                  rows={4}
                  placeholder={tr("familyHistoryPlaceholder", lang)}
                  className="border-border/80 bg-surface/50 transition-all duration-200 focus:border-teal focus:ring-teal focus-visible:ring-teal"
                  {...form.register("familyHistory")}
                />
              </Field>
            )}

            {step === 4 && (
              <Field
                label={tr("symptoms", lang)}
                tooltip={tr("symptomsTooltip", lang)}
                helperText={tr("symptomsHelper", lang)}
                error={form.formState.errors.symptoms?.message}
              >
                <Textarea
                  rows={4}
                  placeholder={tr("symptomsPlaceholder", lang)}
                  className="border-border/80 bg-surface/50 transition-all duration-200 focus:border-teal focus:ring-teal focus-visible:ring-teal"
                  {...form.register("symptoms")}
                />
              </Field>
            )}

            {step === 5 && (
                <div className="space-y-6 animate-fade-in">
                  <div className="text-center max-w-md mx-auto space-y-2 mb-6">
                    <h3 className="font-display text-lg font-bold text-foreground">
                      Do you have a recent blood test report?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Upload a photo, PDF, or capture it with your camera to extract key health markers automatically. You can also skip this step.
                    </p>
                  </div>

                  {hasExistingReport && (
                    <div className="max-w-md mx-auto rounded-2xl border border-teal/20 bg-teal/5 p-5 shadow-sm space-y-4 mb-6">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-teal shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-bold text-foreground">Verified Blood Report Found</h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            We found a verified blood report uploaded {(() => {
                              if (!profile?.updatedAt) return "recently";
                              const days = Math.floor(Math.abs(new Date().getTime() - new Date(profile.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
                              return days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
                            })()}.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUseExistingReport(true);
                            form.setValue("labObservations", existingLabs);
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                            useExistingReport
                              ? "bg-teal text-white border-teal shadow-md"
                              : "bg-surface text-foreground border-border/80 hover:bg-surface-muted/30"
                          }`}
                        >
                          <Check className="h-4 w-4 shrink-0" />
                          Use existing values
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            setUseExistingReport(false);
                            form.setValue("labObservations", []);
                            initializeEmptyLabs();
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold text-left transition-all cursor-pointer ${
                            !useExistingReport
                              ? "bg-teal text-white border-teal shadow-md"
                              : "bg-surface text-foreground border-border/80 hover:bg-surface-muted/30"
                          }`}
                        >
                          <Upload className="h-4 w-4 shrink-0" />
                          Upload another report
                        </button>
                      </div>
                    </div>
                  )}

                  {!(hasExistingReport && useExistingReport) ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Upload/Camera Column */}
                  <div className="space-y-4">
                    <Card className="border-border bg-surface-muted/10 shadow-sm">
                      <CardContent className="p-6">
                        {isCameraActive ? (
                          <div className="space-y-4">
                            <div className="relative overflow-hidden rounded-xl bg-black aspect-video border border-border">
                              <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                onClick={captureFrame}
                                disabled={isScanning}
                                className="flex-1 h-10 bg-teal text-white hover:bg-teal/90 gap-2 font-semibold text-xs rounded-lg cursor-pointer"
                              >
                                <Camera className="h-4 w-4" /> Capture Photo
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={stopCamera}
                                className="h-10 text-xs text-red-500 hover:bg-red-55 cursor-pointer font-semibold"
                              >
                                Close
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border/80 rounded-xl p-6 bg-surface hover:bg-surface-muted/20 transition-colors relative group cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,application/pdf"
                                  onChange={handleFileUpload}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  disabled={isScanning}
                                />
                                <Upload className="h-5 w-5 text-teal mb-2 group-hover:scale-105 transition-transform duration-300" />
                                <p className="text-[11px] font-semibold text-foreground text-center">
                                  {selectedFile ? selectedFile.name : "Click or drag report photo"}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={startCamera}
                                disabled={isScanning}
                                className="h-auto flex flex-col items-center justify-center gap-2 border-teal/20 text-teal hover:bg-teal/5 cursor-pointer font-semibold rounded-xl px-4"
                              >
                                <Camera className="h-5 w-5" />
                                <span className="text-[10px]">Use Camera</span>
                              </Button>
                            </div>
                          </div>
                        )}

                        {isScanning && (
                          <div className="mt-4 flex items-center justify-center gap-2.5 text-xs text-muted-foreground p-3 border border-border bg-surface rounded-xl">
                            <Loader2 className="h-4 w-4 animate-spin text-teal" />
                            <span>AI is extracting biomarkers from your report...</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-[11px] text-muted-foreground">
                        Report Date (optional):
                      </span>
                      <Input
                        type="date"
                        value={reportDate}
                        onChange={(e) => setReportDate(e.target.value)}
                        className="h-8 text-xs max-w-[150px] border-border bg-surface"
                      />
                    </div>
                  </div>

                  {/* Confirmation / Entry Column */}
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm space-y-4">
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Verify & Edit Extracted Values
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={initializeEmptyLabs}
                          className="h-6 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Reset
                        </Button>
                      </div>

                      <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                        {Object.entries(extractedLabs).map(([code, info]) => {
                          const rule = bounds[code];
                          return (
                            <div
                              key={code}
                              className={`p-3 rounded-lg border transition-all ${
                                info.checked
                                  ? "border-teal/30 bg-teal/5 shadow-[inset_0_1px_1px_rgba(20,184,166,0.02)]"
                                  : "border-border/60 bg-surface-muted/20"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={info.checked}
                                    onChange={() => handleToggleChecked(code)}
                                    className="rounded border-border text-teal focus:ring-teal h-3.5 w-3.5 cursor-pointer"
                                  />
                                  <span className="text-xs font-semibold text-foreground">
                                    {rule.name}
                                  </span>
                                </label>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                  Range: {rule.min}-{rule.max} {rule.unit}
                                </span>
                              </div>

                              <div className="mt-2 flex items-center gap-2">
                                <div className="relative flex-1">
                                  <Input
                                    type="number"
                                    step={code === "HbA1c" ? "0.1" : "1"}
                                    value={info.value || ""}
                                    onChange={(e) => handleExtractedValChange(code, e.target.value)}
                                    className="h-8 text-xs border-border bg-surface pr-12 focus:border-teal focus:ring-teal"
                                    placeholder="Enter value"
                                  />
                                  <span className="absolute right-3 top-2 text-[10px] text-muted-foreground font-mono">
                                    {rule.unit}
                                  </span>
                                </div>
                              </div>

                              {info.error && (
                                <p className="text-[10px] font-medium text-red-500 mt-1 flex items-center gap-1.5 leading-normal">
                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                  {info.error}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

                {/* Pre-submission Review Card (Styled like a clean clinical record sheet) */}
                <div className="rounded-xl border border-border/70 bg-surface-muted/30 p-6 shadow-sm mt-6">
                  <div className="flex items-center gap-2 mb-4 border-b border-border/60 pb-3">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-teal/10 text-teal">
                      <Check className="h-3 w-3" />
                    </span>
                    <div>
                      <h3 className="font-display text-sm font-bold text-foreground">
                        {tr("profileSummaryTitle", lang)}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tr("profileSummarySubtitle", lang)}
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("ageGenderLabel", lang)}
                      </span>
                      <span className="font-medium text-foreground">
                        {form.watch("age")} {tr("yrs", lang)} /{" "}
                        <span className="capitalize">{tr(form.watch("gender"), lang)}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("heightWeightLabel", lang)}
                      </span>
                      <span className="font-medium text-foreground">
                        {form.watch("heightCm")} {tr("cm", lang)} / {form.watch("weightKg")}{" "}
                        {tr("kg", lang)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("smokingStatusLabel", lang)}
                      </span>
                      <span className="font-medium text-foreground capitalize">
                        {tr(form.watch("smoking"), lang)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("exerciseFrequencyLabel", lang)}
                      </span>
                      <span className="font-medium text-foreground capitalize">
                        {tr(form.watch("exercise"), lang)}
                      </span>
                    </div>
                    
                    {form.watch("labObservations") && (form.watch("labObservations")?.length ?? 0) > 0 && (
                      <div className="sm:col-span-2 flex flex-col gap-1.5 border-b border-border/40 pb-2.5">
                        <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                          Verified Lab Observations
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                          {form.watch("labObservations")?.map((obs: any) => {
                            const name = bounds[obs.code]?.name || obs.code;
                            return (
                              <div key={obs.code} className="flex justify-between items-center text-xs bg-surface-muted/50 p-2 rounded border border-border/30">
                                <span className="font-medium text-foreground">{name}</span>
                                <span className="font-bold text-teal font-mono">{obs.value} {obs.unit}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="sm:col-span-2 flex flex-col gap-1.5 border-b border-border/40 pb-2.5">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("familyHistory", lang)}
                      </span>
                      <span className="text-xs italic text-foreground/90 bg-surface-muted/50 p-2 rounded border border-border/30">
                        {form.watch("familyHistory") || tr("noHistoryReported", lang)}
                      </span>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1.5 pb-1">
                      <span className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        {tr("symptoms", lang)}
                      </span>
                      <span className="text-xs italic text-foreground/90 bg-surface-muted/50 p-2 rounded border border-border/30">
                        {form.watch("symptoms") || tr("noSymptomsReported", lang)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-accent/40 p-4 mt-6">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal" />
                  <p className="text-xs leading-relaxed text-accent-foreground">
                    {tr("assessmentDisclaimer", lang)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={back}
                disabled={step === 1 || loading}
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" /> {tr("back", lang)}
              </Button>
              <Button
                type="button"
                onClick={next}
                disabled={loading}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm hover:shadow transition-all font-semibold"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> {tr("analyzing", lang)}
                  </>
                ) : step === total ? (
                  <>
                    <Sparkles className="h-4 w-4" /> {tr("generatePlan", lang)}
                  </>
                ) : (
                  <>
                    {tr("continueWord", lang)} <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  helperText,
  tooltip,
  error,
  children,
}: {
  label: string;
  helperText?: string;
  tooltip?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {tooltip && (
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-help focus:outline-none"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-[240px] text-xs leading-normal bg-primary text-primary-foreground border-none">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {children}
      {error && <p className="text-xs font-semibold text-red-500 leading-normal">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground leading-normal">{helperText}</p>
      )}
    </div>
  );
}
