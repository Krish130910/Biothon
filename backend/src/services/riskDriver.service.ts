import { RiskService, type UserProfile } from "./risk.service.js";
import { riskFactorsRegistry } from "../config/riskFactors.js";

export interface RiskDriverResult {
  topDrivers: Array<{ factor: string; contribution: number; modifiable: boolean }>;
  modifiableRisk: number;
  nonModifiableRisk: number;
}

export class RiskDriverService {
  static analyzeRiskDrivers(profile: UserProfile): RiskDriverResult {
    const analysis = RiskService.analyze(profile);
    const { riskFactors } = analysis;

    if (!riskFactors || riskFactors.length === 0) {
      return {
        topDrivers: [],
        modifiableRisk: 0,
        nonModifiableRisk: 0,
      };
    }

    const totalScore = riskFactors.reduce((acc, f) => acc + f.score, 0);

    const contributions = riskFactors.map((f) => {
      return {
        key: f.factor,
        contribution: totalScore > 0 ? Math.round((f.score / totalScore) * 100) : 0,
      };
    });

    // Adjust to sum to 100% exactly if there is a totalScore > 0
    if (totalScore > 0 && contributions.length > 0) {
      const sum = contributions.reduce((acc, c) => acc + c.contribution, 0);
      const diff = 100 - sum;
      if (diff !== 0) {
        // Find the element with the max contribution to adjust
        let maxIdx = 0;
        let maxVal = -1;
        for (let i = 0; i < contributions.length; i++) {
          if (contributions[i].contribution > maxVal) {
            maxVal = contributions[i].contribution;
            maxIdx = i;
          }
        }
        contributions[maxIdx].contribution += diff;
      }
    }

    const topDrivers = contributions
      .map((c) => {
        const registryEntry = riskFactorsRegistry[c.key] || { label: c.key, modifiable: true };
        return {
          factor: registryEntry.label,
          contribution: c.contribution,
          modifiable: registryEntry.modifiable,
        };
      })
      // Keep only positive contributions
      .filter((td) => td.contribution > 0)
      // Sort descending by contribution percentage
      .sort((a, b) => b.contribution - a.contribution);

    let modifiableRisk = 0;
    let nonModifiableRisk = 0;

    topDrivers.forEach((td) => {
      if (td.modifiable) {
        modifiableRisk += td.contribution;
      } else {
        nonModifiableRisk += td.contribution;
      }
    });

    return {
      topDrivers,
      modifiableRisk,
      nonModifiableRisk,
    };
  }
}
