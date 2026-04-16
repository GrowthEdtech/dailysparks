export type CampaignData = {
  slug: string;
  title: string;
  heroHeadline: string;
  heroSubheadline: string;
  ctaText: string;
  style: "academic" | "resource" | "urgency";
  themeColor: string;
  benefits: string[];
  socialProofText: string;
  featuredResource?: {
    name: string;
    description: string;
  };
  countdownHours?: number;
};

export const CAMPAIGN_DATA: Record<string, CampaignData> = {
  "summer-starter-2026": {
    slug: "summer-starter-2026",
    title: "IB Summer Academic Prep 2026",
    heroHeadline: "Secure the DP 7 Habit before Summer ends.",
    heroSubheadline: "Daily Sparks delivers expert-curated IB reading routines directly to your student's Goodnotes. Don't let the summer drift—build the foundation today.",
    ctaText: "Get Summer Starter Kit",
    style: "academic",
    themeColor: "#0f172a",
    benefits: [
      "Customized for DP1 & DP2 candidates",
      "Direct Goodnotes & Notion integration",
      "Curated by IB Examiners"
    ],
    socialProofText: "Trusted by 130+ Top-tier IB World School Families",
    countdownHours: 48
  },
  "xhs-parent-toolkit": {
    slug: "xhs-parent-toolkit",
    title: "IB Parent Academic Toolkit",
    heroHeadline: "別讓孩子淹沒在 PDF 裡。一份每天 15 分鐘的學霸閱讀清單。",
    heroSubheadline: "我們為香港 IB 家長準備了這份高效工具。直接同步 Goodnotes，讓孩子的閱讀習慣『自動化』。",
    ctaText: "立即領取家長工具包",
    style: "resource",
    themeColor: "#ef4444",
    benefits: [
      "精選跨學科閱讀素材",
      "自動建立 Notion 學術檔案",
      "針對 IB 評核標準（TOK/EE）優化"
    ],
    socialProofText: "130+ 香港頂尖名校家長的一致選擇",
    featuredResource: {
      name: "The 2026 IB Parent Starter Kit",
      description: "A 45-page blueprint for managing MYP/DP transitions."
    }
  }
};
