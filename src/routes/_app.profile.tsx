import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLanguage, tr } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  ArrowLeft,
  LogOut,
  Mail,
  User as UserIcon,
  ShieldCheck,
  BookOpen,
  Activity,
  ClipboardList,
  CheckCircle2,
  Clock,
  Upload,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import SplitText from "@/components/ui/split-text";
import { GlassIconBox } from "@/components/ui/glass-icons";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function ProfilePage() {
  const currentLang = useLanguage();
  useEffect(() => {
    document.title = `${tr("profile", currentLang)} — HealthGuard`;
  }, [currentLang]);

  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [assessmentStatus, setAssessmentStatus] = useState<{
    hasCompletedAssessment: boolean;
    lastAssessmentUpdate: string | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
        const res = await fetch(`${API_URL}/api/user/status`, {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          setAssessmentStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch assessment status in profile:", err);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  useEffect(() => {
    if (user) {
      console.log("Firebase Auth User PhotoURL:", user.photoURL);
      console.log("Firebase Auth User DisplayName:", user.displayName);
      console.log("Firebase Auth User Email:", user.email);
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || "PT";

  const hasCompleted = assessmentStatus?.hasCompletedAssessment;

  return (
    <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-10 lg:py-14">

      {/* ── Page Header ── */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <SplitText
            text={tr("profile", currentLang)}
            className="font-display text-3xl font-bold tracking-tight text-foreground"
            delay={30}
            duration={0.55}
            ease="power3.out"
            splitType="chars"
            tag="h1"
            textAlign="left"
            threshold={0}
            rootMargin="0px"
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account and health profile settings.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs border-border hover:bg-accent/40 shrink-0"
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr("backToDashboard", currentLang)}
          </Link>
        </Button>
      </div>

      <div className="space-y-5">

        {/* ── Profile Header Card ── */}
        <Card className="border-border/80 bg-surface shadow-card-soft">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

              {/* Avatar */}
              <div className="shrink-0">
                <Avatar className="h-24 w-24 border-2 border-border/60 shadow-md">
                  <AvatarImage
                    src={
                      user.providerData.find((p) => p.providerId === "google.com")?.photoURL ||
                      user.photoURL ||
                      undefined
                    }
                    alt={user.displayName || tr("patient", currentLang)}
                  />
                  <AvatarFallback className="bg-teal/10 text-teal text-2xl font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Identity */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <h2 className="font-display text-xl font-bold text-foreground leading-tight">
                  {user.displayName || tr("patient", currentLang)}
                </h2>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Badge
                    variant="secondary"
                    className="bg-teal/8 text-teal border border-teal/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                  >
                    <ShieldCheck className="h-3 w-3 mr-1 inline-block" />
                    {isGoogle ? tr("googleAccount", currentLang) : tr("emailAccount", currentLang)}
                  </Badge>
                  {hasCompleted && !loadingStatus && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-xs px-2.5 py-0.5 rounded-full"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1 inline-block" />
                      Profile Complete
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* ── Info Rows ── */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-muted/30 px-4 py-3">
                <GlassIconBox color="teal" size="sm">
                  <UserIcon className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {tr("fullName", currentLang)}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user.displayName || tr("patient", currentLang)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-muted/30 px-4 py-3">
                <GlassIconBox color="teal" size="sm">
                  <Mail className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {tr("email", currentLang)}
                  </p>
                  <p className="text-sm font-semibold text-foreground truncate" title={user.email || ""}>
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-muted/30 px-4 py-3">
                <GlassIconBox color="indigo" size="sm">
                  <ShieldCheck className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {tr("accountType", currentLang)}
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {isGoogle ? tr("googleAccount", currentLang) : tr("emailAccount", currentLang)}
                  </p>
                </div>
              </div>

              {assessmentStatus?.lastAssessmentUpdate && (
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-muted/30 px-4 py-3">
                  <GlassIconBox color="blue" size="sm">
                    <Clock className="h-4 w-4 text-foreground" />
                  </GlassIconBox>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {tr("lastUpdated", currentLang)}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {formatDate(assessmentStatus.lastAssessmentUpdate)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Health Profile Onboarding ── */}
        <Card className="border-border/80 bg-surface shadow-card-soft">
          <CardHeader className="px-6 sm:px-8 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GlassIconBox color="teal" size="sm">
                  <ClipboardList className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div>
                  <CardTitle className="text-base font-bold text-foreground leading-snug">
                    {tr("healthProfileOnboarding", currentLang)}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {tr("onboardingStatus", currentLang)}
                  </p>
                </div>
              </div>

              {loadingStatus ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal shrink-0" />
              ) : (
                <Badge
                  className={
                    hasCompleted
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold rounded-full text-xs px-3"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold rounded-full text-xs px-3"
                  }
                >
                  {hasCompleted ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1 inline-block" />{tr("completed", currentLang)}</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1 inline-block" />{tr("pending", currentLang)}</>
                  )}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pb-2">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {tr("onboardingStatusDesc", currentLang)}
            </p>

            {/* Progress indicator placeholder */}
            <div className="mt-4 h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal transition-all duration-700"
                style={{ width: hasCompleted ? "100%" : "0%" }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">
              {hasCompleted ? "Health profile complete" : "Complete your assessment to get started"}
            </p>
          </CardContent>

          <CardFooter className="px-6 sm:px-8 pt-4 pb-6">
            <Button
              onClick={() => navigate({ to: "/assessment", search: { mode: "reassess" } })}
              className="w-full sm:w-auto bg-teal text-white hover:bg-teal/90 font-semibold text-sm h-10 px-6 cursor-pointer"
            >
              {hasCompleted
                ? tr("reassessHealthProfile", currentLang)
                : tr("startInitialAssessment", currentLang)}
            </Button>
          </CardFooter>
        </Card>

        {/* ── Quick Actions ── */}
        <div>
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 px-0.5">
            {tr("quickActions", currentLang)}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button
              asChild
              variant="outline"
              className="h-14 text-sm border-border/80 hover:bg-teal/5 hover:border-teal/40 hover:text-teal font-medium flex items-center justify-start gap-3 px-5 transition-all duration-200 cursor-pointer rounded-xl group"
            >
              <Link to="/report">
                <GlassIconBox color="teal" size="sm">
                  <BookOpen className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="text-left">
                  <div className="font-semibold text-foreground group-hover:text-teal transition-colors">
                    {tr("viewReport", currentLang)}
                  </div>
                  <div className="text-xs text-muted-foreground">View your health report</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-14 text-sm border-border/80 hover:bg-teal/5 hover:border-teal/40 hover:text-teal font-medium flex items-center justify-start gap-3 px-5 transition-all duration-200 cursor-pointer rounded-xl group"
            >
              <Link to="/assessment" search={{ mode: "retake", step: 5 }}>
                <GlassIconBox color="emerald" size="sm">
                  <Upload className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="text-left">
                  <div className="font-semibold text-foreground group-hover:text-teal transition-colors">
                    Upload Lab Report
                  </div>
                  <div className="text-xs text-muted-foreground">Scan PDF/image report</div>
                </div>
              </Link>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-14 text-sm border-border/80 hover:bg-teal/5 hover:border-teal/40 hover:text-teal font-medium flex items-center justify-start gap-3 px-5 transition-all duration-200 cursor-pointer rounded-xl group"
            >
              <Link to="/dashboard">
                <GlassIconBox color="petrol" size="sm">
                  <Activity className="h-4 w-4 text-foreground" />
                </GlassIconBox>
                <div className="text-left">
                  <div className="font-semibold text-foreground group-hover:text-teal transition-colors">
                    {tr("riskDashboard", currentLang)}
                  </div>
                  <div className="text-xs text-muted-foreground">See risk indicators</div>
                </div>
              </Link>
            </Button>
          </div>
        </div>

        {/* ── Sign Out ── */}
        <div className="flex justify-end pt-2 pb-6">
          <Button
            onClick={logout}
            variant="ghost"
            className="h-9 gap-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 border border-border/60 hover:border-destructive/30 font-medium transition-all duration-200 px-4 rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            {tr("signOut", currentLang)}
          </Button>
        </div>

      </div>
    </div>
  );
}
