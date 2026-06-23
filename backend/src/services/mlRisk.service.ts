import { type UserProfile, type CompleteRiskAnalysis } from "./risk.service.js";

export interface MlRiskResult {
  mlRiskCategory: "low" | "moderate" | "high";
  confidence: number;
  supportingFactors: string[];
  modelVersion: "ml-risk-v1";
}

export class MlRiskService {
  /**
   * Classify user risk using an ML-style deterministic weighted classifier.
   * Supports existing clinical scoring and provides explainable insights.
   */
  static classifyMlRisk(
    profile: UserProfile,
    clinicalRiskResult: CompleteRiskAnalysis,
  ): MlRiskResult {
    let lifestylePoints = 0;
    const maxLifestylePoints = 125;
    const factors: string[] = [];

    // 1. BMI calculation
    const heightM = profile.heightCm / 100;
    const bmi = profile.weightKg / (heightM * heightM);

    if (bmi >= 30) {
      lifestylePoints += 25;
      factors.push(`Physiological strain from elevated BMI (${bmi.toFixed(1)})`);
    } else if (bmi >= 25) {
      lifestylePoints += 12;
      factors.push(`Slightly elevated BMI (${bmi.toFixed(1)})`);
    } else if (bmi < 18.5) {
      lifestylePoints += 8;
      factors.push(`Below-normal BMI index (${bmi.toFixed(1)})`);
    }

    // 2. Smoking status
    if (profile.smoking === "current") {
      lifestylePoints += 25;
      factors.push("Significant risk impact from current smoking status");
    } else if (profile.smoking === "former") {
      lifestylePoints += 10;
      factors.push("Moderate risk residual from historical tobacco use");
    }

    // 3. Exercise level
    if (profile.exercise === "none") {
      lifestylePoints += 20;
      factors.push("Lack of physical conditioning from sedentary habits");
    } else if (profile.exercise === "light") {
      lifestylePoints += 10;
      factors.push("Light physical activity level limits metabolic efficiency");
    }

    // 4. Alcohol consumption
    const alcVal = (profile.alcohol || "").toLowerCase();
    if (alcVal.includes("heavy") || alcVal.includes("frequent")) {
      lifestylePoints += 15;
      factors.push("Elevated risk contributions from frequent or heavy alcohol intake");
    } else if (
      alcVal.includes("occasional") ||
      alcVal.includes("moderate") ||
      alcVal.includes("drink")
    ) {
      lifestylePoints += 5;
      factors.push("Minor risk contribution from occasional alcohol intake");
    }

    // 5. Family history genetics
    const fhLower = profile.familyHistory.toLowerCase();
    if (
      fhLower.includes("diabet") ||
      fhLower.includes("sugar") ||
      fhLower.includes("heart") ||
      fhLower.includes("cardiac") ||
      fhLower.includes("stroke") ||
      fhLower.includes("bp") ||
      fhLower.includes("hypertension")
    ) {
      lifestylePoints += 15;
      factors.push("Genetic predisposition indicated by family medical history");
    }

    // 6. Active symptoms
    const sxLower = profile.symptoms.toLowerCase();
    if (
      sxLower.trim().length > 0 &&
      !sxLower.includes("none") &&
      !sxLower.includes("no symptoms")
    ) {
      lifestylePoints += 10;
      factors.push("Presence of metabolic or vascular symptoms reported");
    }

    // 7. Age grouping
    if (profile.age >= 55) {
      lifestylePoints += 15;
      factors.push(`Vascular strain associated with age parameter (${profile.age} years)`);
    } else if (profile.age >= 45) {
      lifestylePoints += 8;
      factors.push(`Demographic risk multiplier from age parameter (${profile.age} years)`);
    }

    // Normalize lifestyle score
    const lifestyleScore = Math.min(100, Math.round((lifestylePoints / maxLifestylePoints) * 100));

    // Combine clinical score and lifestyle score
    // Give significant weight to clinical risks but modulate with lifestyle score
    let combinedScore = Math.round(0.4 * clinicalRiskResult.overallRisk + 0.6 * lifestyleScore);

    // If clinical assessments have high-risk categorizations, boost classification safety ceiling
    const hasHighClinical =
      clinicalRiskResult.diabetesRisk.level === "High" ||
      clinicalRiskResult.heartRisk.level === "High" ||
      clinicalRiskResult.hypertensionRisk.level === "High";

    if (hasHighClinical && combinedScore < 65) {
      combinedScore += 10; // Boost risk estimation for medical safety
    }

    // Classify into categories
    let mlRiskCategory: "low" | "moderate" | "high" = "low";
    if (combinedScore >= 60) {
      mlRiskCategory = "high";
    } else if (combinedScore >= 30) {
      mlRiskCategory = "moderate";
    }

    // Determine confidence based on data completeness and signal consistency
    let completenessCount = 0;
    const checkFields = [
      profile.age,
      profile.gender,
      profile.heightCm,
      profile.weightKg,
      profile.smoking,
      profile.exercise,
      profile.familyHistory,
      profile.symptoms,
      profile.alcohol,
    ];
    checkFields.forEach((field) => {
      if (field !== undefined && field !== null && String(field).trim() !== "") {
        completenessCount += 1;
      }
    });

    const completenessFactor = completenessCount / checkFields.length; // Max 1.0

    // Alignment factor (higher confidence if clinical risk matches lifestyle score)
    const riskDiff = Math.abs(clinicalRiskResult.overallRisk - lifestyleScore);
    const alignmentFactor = 1 - riskDiff / 100; // Max 1.0

    // Compute final confidence percentage
    const rawConfidence = 0.6 * completenessFactor + 0.4 * alignmentFactor;
    // Map to a reasonable confidence interval (e.g. 70% to 95%) for display
    const confidence = Math.max(0.7, Math.min(0.95, Number(rawConfidence.toFixed(2))));

    // Fallback if no specific factors were added
    if (factors.length === 0) {
      factors.push("Baseline lifestyle parameters within normal limits");
    }

    return {
      mlRiskCategory,
      confidence,
      supportingFactors: factors.slice(0, 3), // Return up to top 3 supporting factors
      modelVersion: "ml-risk-v1",
    };
  }
}
