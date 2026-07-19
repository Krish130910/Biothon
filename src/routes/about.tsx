import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Brain,
  Heart,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Activity,
  BookOpen,
  Github,
  Linkedin,
} from "lucide-react";
import { useLanguage, tr } from "@/lib/i18n";
import SplitText from "@/components/ui/split-text";

export const Route = createFileRoute("/about")({
  component: AboutPage,
});

function AboutPage() {
  const currentLang = useLanguage();

  useEffect(() => {
    document.title = `${tr("about", currentLang)} HealthGuard — Educational Assessment Portal`;
  }, [currentLang]);

  return (
    <div className="min-h-screen bg-background font-sans antialiased text-foreground">
      <SiteHeader />

      <div className="pt-12 pb-10">
        {/* 1. Header Banner */}
        <section className="mx-auto max-w-7xl px-6 pt-6 pb-6">
          <div className="text-center max-w-4xl mx-auto">
            <Badge
              variant="secondary"
              className="rounded-full bg-teal/10 text-teal border border-teal/20"
            >
              {tr("projectOverview", currentLang)}
            </Badge>
            <SplitText
              text="HealthGuard"
              className="mt-5 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground"
              delay={35}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              tag="h1"
              textAlign="center"
            />
            <p className="mt-5 mx-auto max-w-3xl text-base sm:text-lg leading-relaxed text-muted-foreground">
              {tr("aboutSub", currentLang)}
            </p>
          </div>
        </section>

        {/* 2. Core Domains & Focus Areas */}
        <section className="border-b border-border bg-surface-muted/10 py-8">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <Badge
                variant="secondary"
                className="rounded-full bg-teal/10 text-teal border border-teal/20"
              >
                {tr("coreDomains", currentLang)}
              </Badge>
              <SplitText
                text={tr("focusAreas", currentLang)}
                className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground"
                delay={35}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                tag="h2"
                textAlign="center"
              />
              <p className="mt-2 text-sm text-muted-foreground">
                {tr("coreDomainsSub", currentLang)}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  icon: Brain,
                  title: tr("diabetesRisk", currentLang),
                  desc: tr("diabetesRiskDesc", currentLang),
                },
                {
                  icon: Activity,
                  title: tr("hypertensionRisk", currentLang),
                  desc: tr("hypertensionRiskDesc", currentLang),
                },
                {
                  icon: Heart,
                  title: tr("heartDiseaseRisk", currentLang),
                  desc: tr("heartDiseaseRiskDesc", currentLang),
                },
              ].map((f, idx) => (
                <Card
                  key={idx}
                  className="border-border/80 bg-surface shadow-card-soft hover:shadow-elevated hover:border-teal/30 hover:-translate-y-0.5 transition-all duration-300"
                >
                  <CardContent className="p-8">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-teal/10 text-teal">
                      <f.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 font-display text-lg font-bold text-foreground">
                      {f.title}
                    </h3>
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Framework & Ethics (Educational Project Information) */}
        <section className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <Badge
              variant="secondary"
              className="rounded-full bg-teal/10 text-teal border border-teal/20"
            >
              {tr("frameworkEthics", currentLang)}
            </Badge>
            <SplitText
              text={tr("eduProjectLinks", currentLang)}
              className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground"
              delay={35}
              duration={0.6}
              ease="power3.out"
              splitType="chars"
              tag="h2"
              textAlign="center"
            />
            <p className="mt-2 text-sm text-muted-foreground">
              {tr("frameworkEthicsSub", currentLang)}
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
            {/* Privacy Card */}
            <Link to="/privacy" className="group block">
              <Card className="border-border bg-surface shadow-card-soft group-hover:border-teal/50 group-hover:shadow-md transition-all duration-300 h-full">
                <CardContent className="p-8 flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                    <ShieldCheck className="h-5.5 w-5.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-teal transition-colors flex items-center gap-1.5">
                      {tr("privacyPolicy", currentLang)}{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {tr("privacyPolicyDesc", currentLang)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Clinical Sources Card */}
            <Link to="/clinical-sources" className="group block">
              <Card className="border-border bg-surface shadow-card-soft group-hover:border-teal/50 group-hover:shadow-md transition-all duration-300 h-full">
                <CardContent className="p-8 flex items-start gap-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-teal/10 text-teal">
                    <BookOpen className="h-5.5 w-5.5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-lg font-bold text-foreground group-hover:text-teal transition-colors flex items-center gap-1.5">
                      {tr("clinicalSources", currentLang)}{" "}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </h3>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {tr("clinicalSourcesDesc", currentLang)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </section>

        {/* 4. Strict Medical Disclaimer */}
        <section className="mx-auto max-w-4xl px-6 pb-10">
          <Card className="border-red-500/20 bg-red-500/5 dark:bg-red-500/10">
            <CardContent className="p-6 sm:p-8 flex gap-4">
              <ShieldAlert className="h-6 w-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display font-bold text-red-600 dark:text-red-400 text-[15px] tracking-wide">
                  {tr("medicalDisclaimer", currentLang)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {tr("medicalDisclaimerDesc", currentLang)}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* 5. About the Developers */}
        <section className="border-t border-border bg-surface-muted/10 py-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge
                variant="secondary"
                className="rounded-full bg-teal/10 text-teal border border-teal/20"
              >
                {tr("devInfoTitle", currentLang) || "Meet the Developers"}
              </Badge>
              <SplitText
                text="Meet the Developers"
                className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground"
                delay={35}
                duration={0.6}
                ease="power3.out"
                splitType="chars"
                tag="h2"
                textAlign="center"
              />
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto py-4">
              {[
                {
                  name: "Krish Savaliya",
                  github: "https://github.com/Krish130910",
                  linkedin: "https://www.linkedin.com/in/krish-savaliya-5a139a31a/",
                },
                {
                  name: "Krishna Vyas",
                  github: "https://github.com/krishnaaaavyas",
                  linkedin: "https://www.linkedin.com/in/krishna-vyas-7bba15319/",
                },
                {
                  name: "Jiya Singh",
                  github: "https://github.com/jiya2401",
                  linkedin: "https://www.linkedin.com/in/jiya-singh24",
                },
              ].map((d, idx) => (
                <Card
                  key={idx}
                  className="group border border-border/80 bg-surface rounded-2xl p-6 flex flex-col items-center justify-between text-center shadow-card-soft hover:shadow-elevated hover:border-teal/30 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden min-h-[140px]"
                >
                  {/* Subtle top decoration */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal/20 via-teal/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="my-auto">
                    <h3 className="font-display font-bold text-foreground text-base tracking-wide group-hover:text-teal transition-colors">
                      {d.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 mt-4 w-full justify-center">
                    <a
                      href={d.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-secondary/80 text-secondary-foreground hover:bg-secondary border border-border transition-all duration-200"
                    >
                      <Github className="h-3.5 w-3.5" />
                      GitHub
                    </a>
                    <a
                      href={d.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-teal/10 text-teal hover:bg-teal/20 border border-teal/20 transition-all duration-200"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </div>

      <SiteFooter hideDisclaimer={true} />
    </div>
  );
}
