export interface FoodRule {
  diabetesImpact: number;
  hypertensionImpact: number;
  heartImpact: number;
}

export const foodRules: Record<string, FoodRule> = {
  sugar: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 4 },
  sucrose: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 4 },
  fructose: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 4 },
  glucose: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 4 },
  syrup: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 4 },
  jaggery: { diabetesImpact: 8, hypertensionImpact: 0, heartImpact: 3 },
  sodium: { diabetesImpact: 0, hypertensionImpact: 12, heartImpact: 6 },
  salt: { diabetesImpact: 0, hypertensionImpact: 12, heartImpact: 6 },
  msg: { diabetesImpact: 0, hypertensionImpact: 10, heartImpact: 5 },
  glutamate: { diabetesImpact: 0, hypertensionImpact: 10, heartImpact: 5 },
  trans_fat: { diabetesImpact: 3, hypertensionImpact: 5, heartImpact: 15 },
  hydrogenated_oil: { diabetesImpact: 3, hypertensionImpact: 5, heartImpact: 15 },
  palm_oil: { diabetesImpact: 2, hypertensionImpact: 3, heartImpact: 10 },
  palmolein: { diabetesImpact: 2, hypertensionImpact: 3, heartImpact: 10 },
  refined_flour: { diabetesImpact: 8, hypertensionImpact: 2, heartImpact: 4 },
  maida: { diabetesImpact: 8, hypertensionImpact: 2, heartImpact: 4 },
  butter: { diabetesImpact: 1, hypertensionImpact: 2, heartImpact: 12 },
  ghee: { diabetesImpact: 1, hypertensionImpact: 2, heartImpact: 10 },
  caffeine: { diabetesImpact: 0, hypertensionImpact: 8, heartImpact: 4 },
  maltodextrin: { diabetesImpact: 10, hypertensionImpact: 0, heartImpact: 3 },
};
