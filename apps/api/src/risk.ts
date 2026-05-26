import type { Channel, RiskLevel } from "./types.js";

export interface RiskInput {
  invoiceValue: number;
  hsCode: string;
  originCountry: string;
}

export interface RiskOutput {
  riskLevel: RiskLevel;
  channel: Channel;
}

interface RiskRule {
  minInvoiceValue?: number;
  hsCodePrefixes?: string[];
  countries?: string[];
  riskLevel: RiskLevel;
  channel: Channel;
}

const HIGH_RISK_COUNTRIES = new Set(["IR", "SY", "KP"]);

const riskRules: RiskRule[] = [
  {
    minInvoiceValue: 500000,
    riskLevel: "high",
    channel: "red",
  },
  {
    hsCodePrefixes: ["30", "93"],
    riskLevel: "high",
    channel: "red",
  },
  {
    countries: Array.from(HIGH_RISK_COUNTRIES),
    riskLevel: "high",
    channel: "red",
  },
  {
    minInvoiceValue: 100000,
    riskLevel: "medium",
    channel: "yellow",
  },
  {
    riskLevel: "low",
    channel: "green",
  },
];

export function assessRisk(input: RiskInput): RiskOutput {
  const normalizedHsCode = input.hsCode.trim();
  const country = input.originCountry.toUpperCase().trim();

  for (const rule of riskRules) {
    let ruleMatches = true;

    if (rule.minInvoiceValue !== undefined && input.invoiceValue < rule.minInvoiceValue) {
      ruleMatches = false;
    }

    if (
      rule.hsCodePrefixes !== undefined &&
      !rule.hsCodePrefixes.some((prefix) => normalizedHsCode.startsWith(prefix))
    ) {
      ruleMatches = false;
    }

    if (rule.countries !== undefined && !rule.countries.includes(country)) {
      ruleMatches = false;
    }

    if (ruleMatches) {
      return { riskLevel: rule.riskLevel, channel: rule.channel };
    }
  }

  // Default to low risk / green channel if no rules match
  return { riskLevel: "low", channel: "green" };
}
