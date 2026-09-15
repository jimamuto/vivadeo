export type VivadeoPlan = {
  id: "free" | "starter" | "pro" | "team" | "business" | "enterprise";
  name: string;
  description: string;
  monthlyPrice: number | null;
  priceLabel: string;
  billingNote: string;
  features: readonly string[];
  featured?: boolean;
};

export const VIVADEO_PLANS: readonly VivadeoPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For trying the complete evidence workflow.",
    monthlyPrice: 0,
    priceLabel: "$0",
    billingNote: "Free forever",
    features: ["1 hour processed each month", "5 hours of video storage", "25 Vivadeo Auto answers", "1 workspace seat"],
  },
  {
    id: "starter",
    name: "Starter",
    description: "For a growing personal video archive.",
    monthlyPrice: 10,
    priceLabel: "$10",
    billingNote: "per month",
    features: ["5 hours processed each month", "20 hours of video storage", "200 Vivadeo Auto answers", "1 workspace seat"],
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    description: "For professionals working with footage every day.",
    monthlyPrice: 29,
    priceLabel: "$29",
    billingNote: "per month",
    features: ["20 hours processed each month", "100 hours of video storage", "1,000 Vivadeo Auto answers", "Priority processing"],
  },
  {
    id: "team",
    name: "Team",
    description: "For small teams sharing one searchable archive.",
    monthlyPrice: 79,
    priceLabel: "$79",
    billingNote: "per month",
    features: ["60 hours processed each month", "400 hours of video storage", "4,000 Vivadeo Auto answers", "5 workspace seats"],
  },
  {
    id: "business",
    name: "Business",
    description: "For larger archives and active production teams.",
    monthlyPrice: 199,
    priceLabel: "$199",
    billingNote: "per month",
    features: ["180 hours processed each month", "1,500 hours of video storage", "15,000 Vivadeo Auto answers", "10 workspace seats"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description: "For tailored capacity, controls, and rollout support.",
    monthlyPrice: null,
    priceLabel: "Custom",
    billingNote: "Talk with us",
    features: ["Custom processing and storage", "Flexible workspace seats", "Administrative controls", "Dedicated rollout support"],
  },
] as const;
