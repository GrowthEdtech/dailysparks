import { BookOpen, PenTool, ShieldCheck } from "lucide-react";

export const deliveryOptions = [
  {
    title: "Works with Goodnotes",
    description:
      "Send each reading brief to your child's Goodnotes destination email.",
    detail:
      "Use the student's @goodnotes.email destination to drop each brief into a handwriting-friendly reading flow.",
    icon: PenTool,
  },
  {
    title: "Archive in Notion",
    description:
      "Connect your workspace and save reading briefs, prompts, and reflections in one place.",
    detail:
      "Choose a parent page once, then let Daily Sparks build a clean archive your family can search later.",
    icon: BookOpen,
  },
  {
    title: "Use one or both",
    description:
      "Goodnotes supports daily reading delivery. Notion keeps a searchable family archive.",
    detail:
      "Start with the tool your child already uses, then layer the second integration on when you want it.",
    icon: ShieldCheck,
  },
] as const;

export const supportedIntegrations = [
  {
    name: "Goodnotes",
    logoSrc: "/integrations/goodnotes-logo.svg",
    logoAlt: "Goodnotes logo",
    logoWidth: 300,
    logoHeight: 54,
    role: "Direct student delivery",
    bestWhen: "Best when the student reads in Goodnotes each day.",
    detail:
      "Handwriting-friendly reading briefs land straight in the student's Goodnotes flow.",
  },
  {
    name: "Notion",
    logoSrc: "/integrations/notion-logo.svg",
    logoAlt: "Notion logo",
    logoWidth: 180,
    logoHeight: 63,
    role: "Family archive",
    bestWhen: "Best when parents want a searchable archive at home.",
    detail:
      "Parents get a searchable home base for briefs, prompts, and reflections.",
  },
] as const;

export const landingIntegrationsFootnote =
  "Goodnotes and Notion are trademarks of their respective owners.";

export const landingFaqItems = [
  {
    q: "Who is Daily Sparks for?",
    a: "Daily Sparks is now focused on IB learners in MYP and DP. New public setup no longer opens PYP, though existing PYP families can still access their legacy workflow.",
  },
  {
    q: "How are MYP and DP briefs different?",
    a: "MYP briefs act as bridge reading: global context, compare-or-connect thinking, and inquiry prompts. DP briefs are more academic: abstract, claim, evidence limits, and TOK-style prompts.",
  },
  {
    q: "What does a daily brief include?",
    a: "Each brief includes a structured reading frame, key concepts or vocabulary, and a notebook prompt aligned to MYP or DP reading goals.",
  },
  {
    q: "Do I need Goodnotes or Notion to start?",
    a: "No. You can start with either delivery path. Goodnotes is best for direct student reading, while Notion is best for searchable family archiving.",
  },
  {
    q: "How long does setup take?",
    a: "Most families can choose a programme and connect at least one delivery path in a few minutes, then refine the workflow over time.",
  },
  {
    q: "When does the free trial begin?",
    a: "The trial begins when your family starts the reading workflow through sign-in, not simply when a tool is connected.",
  },
  {
    q: "What is included in the weekly recap?",
    a: "The weekly recap helps families revisit the reading, notebook capture, and the ideas worth returning to, so progress does not disappear after a few days.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage plan changes or cancel renewal anytime from your dashboard subscription settings.",
  },
] as const;
