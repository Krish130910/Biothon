export interface RiskFactorDefinition {
  label: string;
  modifiable: boolean;
}

export const riskFactorsRegistry: Record<string, RiskFactorDefinition> = {
  BMI: {
    label: "High BMI",
    modifiable: true,
  },
  EXERCISE: {
    label: "Sedentary Lifestyle",
    modifiable: true,
  },
  FAMILY_HISTORY: {
    label: "Family History",
    modifiable: false,
  },
  SMOKING: {
    label: "Smoking",
    modifiable: true,
  },
  AGE: {
    label: "Age",
    modifiable: false,
  },
  ALCOHOL: {
    label: "Alcohol Consumption",
    modifiable: true,
  },
  DIET: {
    label: "Diet Quality",
    modifiable: true,
  },
  SYMPTOMS: {
    label: "Active Symptoms",
    modifiable: true,
  },
  HYPERTENSION_HISTORY: {
    label: "Hypertensive History",
    modifiable: false,
  },
};
