import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useLanguage, tr } from "@/lib/i18n";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Trash2,
  Droplets,
  Phone,
  AlertCircle,
  Heart,
  Globe,
  Moon,
  Sun,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import SplitText from "@/components/ui/split-text";

export const Route = createFileRoute("/_app/profile")({
  component: ProfilePage,
});

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right flex items-center gap-1">
        {value}
      </span>
    </div>
  );
}

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
    hasBloodReport?: boolean;
    bloodReportDate?: string | null;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        let idToken = "mock-uid-guest";
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
        const res = await fetch(`${API_URL}/api/user/status`, {
          headers: { Authorization: `Bearer ${idToken}` },
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

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const toggleTheme = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      setIsDark(false);
    } else {
      html.classList.add("dark");
      setIsDark(true);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
      </div>
    );
  }

  const isGoogle = user.providerData.some((p) => p.providerId === "google.com");
  const hasCompleted = assessmentStatus?.hasCompletedAssessment;
  const hasBloodReport = assessmentStatus?.hasBloodReport ?? false;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() || "PT";

  const nextReviewDate = assessmentStatus?.lastAssessmentUpdate
    ? (() => {
        const d = new Date(assessmentStatus.lastAssessmentUpdate);
        d.setDate(d.getDate() + 30);
        return formatDate(d.toISOString());
      })()
    : "—";

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-5 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <SplitText
            text={tr("profile", currentLang)}
            className="font-display text-2xl font-bold tracking-tight text-foreground"
            delay={25}
            duration={0.5}
            ease="power3.out"
            splitType="chars"
            tag="h1"
            textAlign="left"
            threshold={0}
            rootMargin="0px"
          />
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage your account and health settings.
          </p>
        </div>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs border-border hover:bg-accent/40 shrink-0"
        >
          <Link to="/dashboard">
            <ArrowLeft className="h-3.5 w-3.5" />
            {tr("backToDashboard", currentLang)}
          </Link>
        </Button>
      </div>

      {/* Identity */}
      <Card className="border-border/80 bg-surface shadow-card-soft">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-2 border-border/60 shadow-sm shrink-0">
              <AvatarImage
                src={
                  user.providerData.find((p: { providerId: string }) => p.providerId === "google.com")?.photoURL ||
                  user.photoURL ||
                  undefined
                }
                alt={user.displayName || "User"}
              />
              <AvatarFallback className="bg-teal/10 text-teal text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-base font-bold text-foreground leading-tight truncate">
                {user.displayName || tr("patient", currentLang)}
              </h2>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge
                  variant="secondary"
                  className="bg-teal/8 text-teal border border-teal/20 font-medium text-[10px] px-2 py-0.5 rounded-full"
                >
                  <ShieldCheck className="h-2.5 w-2.5 mr-1 inline-block" />
                  {isGoogle ? "Google Account" : "Email Account"}
                </Badge>
                {hasCompleted && (
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium text-[10px] px-2 py-0.5 rounded-full"
                  >
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1 inline-block" />
                    Profile Complete
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-8 w-8 p-0 shrink-0 text-muted-foreground rounded-full"
              title="Edit profile (coming soon)"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Health Status */}
      <Card className="border-border/80 bg-surface shadow-card-soft">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <Heart className="h-4 w-4 text-teal" />
              Health Status
            </CardTitle>
            {loadingStatus ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-teal" />
            ) : (
              <Badge
                className={
                  hasCompleted
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-semibold rounded-full text-[10px] px-2.5"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold rounded-full text-[10px] px-2.5"
                }
              >
                {hasCompleted ? (
                  <><CheckCircle2 className="h-2.5 w-2.5 mr-1 inline-block" />Completed</>
                ) : (
                  <><Clock className="h-2.5 w-2.5 mr-1 inline-block" />Pending</>
                )}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 py-3">
          <InfoRow
            label="Assessment Status"
            value={
              hasCompleted ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Not started
                </span>
              )
            }
          />
          <InfoRow label="Last Assessment" value={formatDate(assessmentStatus?.lastAssessmentUpdate)} />
          <InfoRow
            label="Blood Report"
            value={
              hasBloodReport ? (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Uploaded
                </span>
              ) : (
                <span className="text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Not uploaded
                </span>
              )
            }
          />
          <InfoRow label="Next Review" value={nextReviewDate} />

          <div className="mt-3">
            <Button
              onClick={() => navigate({ to: "/assessment", search: { mode: "reassess" } })}
              className="bg-teal text-white hover:bg-teal/90 font-semibold text-xs h-8 px-4 cursor-pointer rounded-lg"
            >
              {hasCompleted ? "Reassess" : "Start Assessment"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Medical Documents */}
      <Card className="border-border/80 bg-surface shadow-card-soft">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal" />
            Medical Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 py-3">
          {hasBloodReport ? (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Blood Report</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Uploaded · {formatDate(assessmentStatus?.bloodReportDate)} · Verified
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] gap-1 border-border/60 hover:bg-accent/40"
                  onClick={() => navigate({ to: "/report" })}
                >
                  <Eye className="h-3 w-3" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 text-[10px] gap-1 border-border/60 hover:bg-accent/40"
                  onClick={() => navigate({ to: "/assessment", search: { mode: "retake", step: 5 } })}
                >
                  <RefreshCw className="h-3 w-3" /> Replace
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-red-500 hover:bg-red-500/8 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-border/40 flex items-center justify-center shrink-0">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Blood Report</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">No report uploaded yet</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[10px] border-teal/20 text-teal hover:bg-teal/5"
                onClick={() => navigate({ to: "/assessment", search: { mode: "retake", step: 5 } })}
              >
                Upload
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Emergency Information */}
      <Card className="border-border/80 bg-surface shadow-card-soft">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" />
              Emergency Information
            </CardTitle>
            <span className="text-[10px] text-muted-foreground bg-border/30 px-2 py-0.5 rounded-full font-medium">
              Coming soon
            </span>
          </div>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 py-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: <Droplets className="h-3.5 w-3.5 text-red-400" />, label: "Blood Group", placeholder: "e.g. B+" },
              { icon: <Phone className="h-3.5 w-3.5 text-teal" />, label: "Emergency Contact", placeholder: "Name & number" },
              { icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />, label: "Known Allergies", placeholder: "e.g. Penicillin" },
              { icon: <Heart className="h-3.5 w-3.5 text-rose-500" />, label: "Medical Conditions", placeholder: "e.g. Hypertension" },
            ].map(({ icon, label, placeholder }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-surface-muted/20 px-3 py-2.5 opacity-60"
              >
                {icon}
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/70 leading-none">
                    {label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{placeholder}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card className="border-border/80 bg-surface shadow-card-soft">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold text-foreground">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs font-semibold text-foreground">Language</p>
                <p className="text-[10px] text-muted-foreground">App display language</p>
              </div>
            </div>
            <Link to="/dashboard" className="text-[10px] text-teal font-semibold hover:underline">
              Change →
            </Link>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-2.5">
              {isDark ? (
                <Moon className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Sun className="h-4 w-4 text-muted-foreground" />
              )}
              <div>
                <p className="text-xs font-semibold text-foreground">Theme</p>
                <p className="text-[10px] text-muted-foreground">{isDark ? "Dark mode" : "Light mode"}</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                isDark ? "bg-teal" : "bg-border"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                  isDark ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Account / Danger Zone */}
      <Card className="border-red-500/20 bg-surface shadow-card-soft">
        <CardHeader className="px-4 sm:px-5 pt-4 pb-3 border-b border-red-500/10">
          <CardTitle className="text-sm font-bold text-red-600 dark:text-red-400">Account</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-5 py-1">
          <div className="flex items-center justify-between py-2.5 border-b border-border/40">
            <div>
              <p className="text-xs font-semibold text-foreground">Sign Out</p>
              <p className="text-[10px] text-muted-foreground">Sign out of your HealthGuard account</p>
            </div>
            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className="h-7 px-3 text-[10px] gap-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-500/8 border border-border/60 hover:border-red-500/30 font-medium transition-all duration-200 rounded-lg"
            >
              <LogOut className="h-3 w-3" />
              Sign Out
            </Button>
          </div>

          <div className="flex items-center justify-between py-2.5">
            <div>
              <p className="text-xs font-semibold text-red-600 dark:text-red-400">Delete Account</p>
              <p className="text-[10px] text-muted-foreground">Permanently delete all your data</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="h-7 px-3 text-[10px] gap-1.5 text-red-500/50 border border-red-500/20 rounded-lg cursor-not-allowed"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
