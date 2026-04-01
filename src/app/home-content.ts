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
  },
  {
    name: "Notion",
  },
] as const;

export const landingIntegrationsFootnote =
  "Goodnotes and Notion are trademarks of their respective owners.";

export const landingFaqItems = [
  {
    q: "What age is Daily Sparks for?",
    a: "We primarily target students aged 9 to 14 (P5 to MYP). The reading level is adjusted to provide desirable difficulty: challenging, but still accessible.",
  },
  {
    q: "How does the GoodNotes delivery work?",
    a: "Every Goodnotes user has a unique destination email. Add your child's @goodnotes.email address in the dashboard and Daily Sparks sends each reading brief directly into that note-taking flow.",
  },
  {
    q: "How does Notion sync work?",
    a: "Connect your workspace, choose a parent page, and Daily Sparks creates an archive database for reading briefs, prompts, and reflections. It is designed as a searchable family record, not a student-facing task board.",
  },
  {
    q: "Do I need both GoodNotes and Notion?",
    a: "No. Goodnotes is best when you want daily reading delivered straight to the student's iPad. Notion is best when you want a family archive. You can use either one on its own or combine both.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. You can manage plan changes or cancel renewal anytime from your dashboard subscription settings.",
  },
] as const;
