import React from "react";
import "./glass-icons.css";

const gradientMapping: Record<string, string> = {
  teal: "linear-gradient(135deg, hsl(174, 75%, 45%), hsl(174, 75%, 35%))",
  purple: "linear-gradient(135deg, hsl(215, 20%, 50%), hsl(215, 20%, 40%))", // clinical slate
  red: "linear-gradient(135deg, hsl(220, 15%, 40%), hsl(220, 15%, 30%))", // dark slate
  indigo: "linear-gradient(135deg, hsl(225, 40%, 52%), hsl(225, 40%, 42%))", // clinical indigo
  orange: "linear-gradient(135deg, hsl(220, 15%, 40%), hsl(220, 15%, 30%))", // dark slate
  green: "linear-gradient(135deg, hsl(150, 45%, 45%), hsl(150, 45%, 35%))", // emerald green
  blue: "linear-gradient(135deg, hsl(195, 50%, 48%), hsl(195, 50%, 38%))", // petrol blue
};

export interface GlassIconsItem {
  icon: React.ReactNode;
  color: string;
  label: string;
  customClass?: string;
  onClick?: () => void;
}

interface GlassIconsProps {
  items: GlassIconsItem[];
  className?: string;
}

export function GlassIcons({ items, className }: GlassIconsProps) {
  const getBackgroundStyle = (color: string) => {
    if (gradientMapping[color]) {
      return { background: gradientMapping[color] };
    }
    return { background: color };
  };

  return (
    <div className={`icon-btns ${className || ""}`}>
      {items.map((item, index) => {
        const ButtonWrapper = item.onClick ? "button" : "div";
        return (
          <ButtonWrapper
            key={index}
            className={`icon-btn ${item.customClass || ""}`}
            aria-label={item.label}
            type={item.onClick ? "button" : undefined}
            onClick={item.onClick}
          >
            <span
              className="icon-btn__back"
              style={getBackgroundStyle(item.color)}
            ></span>
            <span className="icon-btn__front">
              <span className="icon-btn__icon" aria-hidden="true">
                {item.icon}
              </span>
            </span>
            <span className="icon-btn__label">{item.label}</span>
          </ButtonWrapper>
        );
      })}
    </div>
  );
}

export default GlassIcons;
