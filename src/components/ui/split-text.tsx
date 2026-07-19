import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: "chars" | "words" | "lines" | "words, chars";
  from?: gsap.TweenVars;
  to?: gsap.TweenVars;
  threshold?: number;
  rootMargin?: string;
  textAlign?: "left" | "center" | "right" | "justify" | "inherit";
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div";
  onLetterAnimationComplete?: () => void;
}

export default function SplitText({
  text,
  className = "",
  delay = 50,
  duration = 1.25,
  ease = "power3.out",
  splitType = "chars",
  from = { opacity: 0, y: 40 },
  to = { opacity: 1, y: 0 },
  threshold = 0.1,
  rootMargin = "-100px",
  textAlign = "center",
  tag = "p",
  onLetterAnimationComplete,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const animationCompletedRef = useRef(false);
  const onCompleteRef = useRef(onLetterAnimationComplete);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Keep callback ref updated
  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete;
  }, [onLetterAnimationComplete]);

  useEffect(() => {
    if (document.fonts.status === "loaded") {
      setFontsLoaded(true);
    } else {
      document.fonts.ready.then(() => {
        setFontsLoaded(true);
      });
    }
  }, []);

  useGSAP(
    () => {
      if (!ref.current || !text || !fontsLoaded) return;
      // Prevent re-animation if already completed
      if (animationCompletedRef.current) return;
      const el = ref.current;

      const startPct = (1 - threshold) * 100;
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin);
      const marginValue = marginMatch ? parseFloat(marginMatch[1]) : 0;
      const marginUnit = marginMatch ? marginMatch[2] || "px" : "px";
      const sign =
        marginValue === 0
          ? ""
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`;
      const start = `top ${startPct}%${sign}`;

      // Select targets for animation
      let targets: Element[] = [];
      if (splitType.includes("chars")) {
        targets = Array.from(el.querySelectorAll(".split-char"));
      } else if (splitType.includes("words")) {
        targets = Array.from(el.querySelectorAll(".split-word"));
      } else if (splitType.includes("lines")) {
        targets = Array.from(el.querySelectorAll(".split-line"));
      }

      if (targets.length === 0) {
        // Fallback to characters or words if no classes match
        targets = Array.from(el.querySelectorAll(".split-char, .split-word"));
      }

      const tween = gsap.fromTo(
        targets,
        { ...from },
        {
          ...to,
          duration,
          ease,
          stagger: delay / 1000,
          scrollTrigger: {
            trigger: el,
            start,
            once: true,
            fastScrollEnd: true,
            anticipatePin: 0.4,
          },
          onComplete: () => {
            animationCompletedRef.current = true;
            onCompleteRef.current?.();
          },
          willChange: "transform, opacity",
          force3D: true,
        }
      );

      return () => {
        ScrollTrigger.getAll().forEach((st) => {
          if (st.trigger === el) st.kill();
        });
        tween.kill();
      };
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        fontsLoaded,
      ],
      scope: ref,
    }
  );

  const Tag = tag || "p";

  const style: React.CSSProperties = {
    textAlign,
    overflow: "hidden",
    display: tag === "span" ? "inline-block" : "block",
    whiteSpace: "normal",
    wordWrap: "break-word",
    willChange: "transform, opacity",
  };

  // Render text content by manually splitting it into styled spans
  const renderContent = () => {
    if (splitType === "words") {
      return text.split(" ").map((word, wIdx, arr) => (
        <span
          key={wIdx}
          className="split-word inline-block"
          style={{ willChange: "transform, opacity" }}
        >
          {word}
          {wIdx < arr.length - 1 ? "\u00A0" : ""}
        </span>
      ));
    }

    if (splitType === "lines") {
      return text.split("\n").map((line, lIdx) => (
        <span
          key={lIdx}
          className="split-line block"
          style={{ willChange: "transform, opacity" }}
        >
          {line}
        </span>
      ));
    }

    // Default to 'chars' or 'words, chars'
    return text.split(" ").map((word, wIdx, arr) => (
      <span
        key={wIdx}
        className="split-word inline-block"
        style={{ whiteSpace: "nowrap" }}
      >
        {word.split("").map((char, cIdx) => (
          <span
            key={cIdx}
            className="split-char inline-block"
            style={{ willChange: "transform, opacity" }}
          >
            {char}
          </span>
        ))}
        {wIdx < arr.length - 1 ? "\u00A0" : ""}
      </span>
    ));
  };

  return (
    <Tag
      ref={ref as React.RefObject<any>}
      style={style}
      className={`split-parent ${className}`}
    >
      <span style={{ display: "none" }}>{text}</span>
      <span aria-hidden="true">{renderContent()}</span>
    </Tag>
  );
}
