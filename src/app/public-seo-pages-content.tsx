import type { Metadata } from "next";
import Link from "next/link";

import {
  InformationalPageShell,
  InfoSection,
} from "./informational-page-shell";
import { siteUrl } from "./site-config";

type PublicSeoGuide = {
  href: string;
  label: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  lastUpdated: string;
  sections: {
    audience: string[];
    helps: string[];
    workflow: string[];
  };
  relatedPages: string[];
  cta: {
    href: string;
    label: string;
  };
};

const publicSeoGuideList = [
  {
    href: "/ib-myp-reading-support",
    label: "IB MYP Reading Support",
    title: "IB MYP Reading Support",
    description:
      "See how Daily Sparks helps IB MYP families build bridge reading habits with global context, compare-connect prompts, and inquiry-based reflection.",
    eyebrow: "MYP Guide",
    intro:
      "Daily Sparks helps MYP families turn current-events reading into a calmer bridge toward academic habits. The workflow keeps the reading load manageable while still training global-context thinking, compare-connect moves, and inquiry.",
    lastUpdated: "April 9, 2026",
    sections: {
      audience: [
        "Families who want IB MYP reading support without relying on a noisy app experience.",
        "Students who benefit from bridge reading that connects current events to global context instead of jumping straight into essay-heavy analysis.",
      ],
      helps: [
        "Each MYP brief is structured around bridge reading, not overwhelm, so students can build momentum first.",
        "The reading model emphasizes global context, compare-connect moves, and inquiry prompts that feel true to the way MYP learners grow.",
        "Notebook capture and weekly recaps help families keep inquiry visible after the first read.",
      ],
      workflow: [
        "A shorter daily brief arrives with a clear hook, why-it-matters framing, and an inquiry lens.",
        "Students can read inside a calmer Goodnotes flow while families keep a searchable archive in Notion.",
        "Saved notebook items preserve inquiry notes, global context reflections, compare-connect thinking, and vocabulary for later reuse.",
      ],
    },
    relatedPages: [
      "/ib-dp-reading-and-writing-support",
      "/myp-vs-dp-reading-model",
      "/goodnotes-workflow-for-ib-students",
    ],
    cta: {
      href: "/login",
      label: "Start the MYP reading loop",
    },
  },
  {
    href: "/ib-dp-reading-and-writing-support",
    label: "IB DP Reading And Writing Support",
    title: "IB DP Reading and Writing Support",
    description:
      "See how Daily Sparks helps IB DP families build reading and writing habits with academic framing, claim building, evidence limits, and TOK-style prompts.",
    eyebrow: "DP Guide",
    intro:
      "Daily Sparks helps DP families turn daily reading into usable academic material. The goal is not just to read more. It is to make each article easier to frame, question, and reuse later in writing and discussion.",
    lastUpdated: "April 9, 2026",
    sections: {
      audience: [
        "Families supporting IB DP students who need steadier reading and writing habits, not just more articles.",
        "Students who benefit from academic framing, argument practice, and TOK-style prompts that turn reading into reusable thinking.",
      ],
      helps: [
        "Each DP brief surfaces the abstract, core issue, claim, and counterpoint instead of leaving students to do the framing alone.",
        "The structure highlights evidence limits and interpretation risk so reading becomes closer to real academic thinking.",
        "Notebook capture keeps claim, counterpoint, TOK prompt, and recap notes in a form students can return to later.",
      ],
      workflow: [
        "Students receive a brief that helps them move from article summary to academic framing in one reading session.",
        "Goodnotes supports focused reading while Notion preserves a family archive of briefs, notebook entries, and weekly recaps.",
        "Retrieval prompts and weekly recap loops help prior reading turn into future writing material.",
      ],
    },
    relatedPages: [
      "/ib-myp-reading-support",
      "/myp-vs-dp-reading-model",
      "/notion-archive-for-ib-families",
    ],
    cta: {
      href: "/login",
      label: "Start the DP reading loop",
    },
  },
  {
    href: "/goodnotes-workflow-for-ib-students",
    label: "Goodnotes Workflow For IB Students",
    title: "Goodnotes Workflow for IB Students",
    description:
      "Learn how Daily Sparks uses Goodnotes for direct student delivery, handwriting-friendly reading, and a calmer IB study workflow.",
    eyebrow: "Goodnotes Guide",
    intro:
      "Daily Sparks uses Goodnotes as the student-facing reading surface because it keeps the daily brief close to where students already annotate and think by hand. The result is direct student delivery with less distraction.",
    lastUpdated: "April 9, 2026",
    sections: {
      audience: [
        "Families who want direct student delivery without asking students to manage another busy learning dashboard.",
        "Students who read better when the workflow feels handwriting-friendly and focused.",
      ],
      helps: [
        "Goodnotes delivery sends each brief into a familiar student environment instead of forcing a brand-new reading tool.",
        "That lowers friction for annotation, handwriting, and focused reading time.",
        "Families still keep visibility because Daily Sparks can pair student delivery with parent-side archive and recap layers.",
      ],
      workflow: [
        "A verified Goodnotes destination becomes the daily brief inbox for the student.",
        "The brief arrives ready to read and annotate in a calm workflow.",
        "Parents can still trace the same reading history through Notion archive and weekly recap signals.",
      ],
    },
    relatedPages: [
      "/notion-archive-for-ib-families",
      "/ib-myp-reading-support",
      "/ib-dp-reading-and-writing-support",
    ],
    cta: {
      href: "/contact",
      label: "Ask about Goodnotes setup",
    },
  },
  {
    href: "/notion-archive-for-ib-families",
    label: "Notion Archive For IB Families",
    title: "Notion Archive for IB Families",
    description:
      "See how Daily Sparks uses Notion to preserve a searchable family archive of briefs, notebook entries, weekly recaps, and retrieval prompts.",
    eyebrow: "Notion Guide",
    intro:
      "Daily Sparks uses Notion as the family-facing archive layer. It keeps reading history, notebook entries, and weekly recap records in one place so families can revisit the work instead of losing it inside old messages and files.",
    lastUpdated: "April 9, 2026",
    sections: {
      audience: [
        "Families who want visibility into reading progress without hovering over every student session.",
        "Parents who want briefs, notebook entries, and weekly recaps preserved in a searchable archive.",
      ],
      helps: [
        "Notion archive keeps the daily brief history intact for both MYP and DP households.",
        "Notebook items and weekly recaps remain visible after the first read, so the work can compound.",
        "This makes it easier to spot tag coverage, revisit prior claims, and see how inquiry or argument habits are growing.",
      ],
      workflow: [
        "Daily brief records flow into Notion as a parent-facing archive layer.",
        "Saved notebook entries and weekly recaps give each reading cycle a clearer follow-through path.",
        "Retrieval prompts help older reading become active review instead of passive storage.",
      ],
    },
    relatedPages: [
      "/goodnotes-workflow-for-ib-students",
      "/ib-dp-reading-and-writing-support",
      "/myp-vs-dp-reading-model",
    ],
    cta: {
      href: "/contact",
      label: "Ask about Notion archive setup",
    },
  },
  {
    href: "/myp-vs-dp-reading-model",
    label: "MYP Vs DP Reading Model",
    title: "MYP vs DP Reading Model",
    description:
      "Compare the Daily Sparks reading model for IB MYP and DP, including inquiry, global context, claim building, evidence limits, and TOK-style prompts.",
    eyebrow: "Comparison Guide",
    intro:
      "Daily Sparks keeps one shared editorial spine, but the student learning loop changes by stage. MYP briefs lean into bridge reading and inquiry. DP briefs lean into academic framing and argument. Families need both the contrast and the overlap to be clear.",
    lastUpdated: "April 9, 2026",
    sections: {
      audience: [
        "Families deciding how Daily Sparks should feel different as a learner moves from MYP into DP.",
        "Parents comparing inquiry-driven reading habits with argument-driven academic habits.",
      ],
      helps: [
        "MYP briefs focus on inquiry vs argument, global context, compare-connect thinking, and manageable reading steps.",
        "DP briefs focus on abstract framing, claim building, counterpoint, evidence limits, and TOK-style prompts.",
        "What stays shared is the calm workflow: direct delivery, archive, notebook capture, and weekly recap.",
      ],
      workflow: [
        "MYP students build reading confidence through bridge reading and inquiry prompts.",
        "DP students build academic reuse through claim and counterpoint structure.",
        "Both loops still land in the same Goodnotes, Notion, notebook, and recap system for the family.",
      ],
    },
    relatedPages: [
      "/ib-myp-reading-support",
      "/ib-dp-reading-and-writing-support",
      "/notion-archive-for-ib-families",
    ],
    cta: {
      href: "/about",
      label: "See how the full workflow fits together",
    },
  },
] as const satisfies readonly PublicSeoGuide[];

export type PublicSeoGuideHref = (typeof publicSeoGuideList)[number]["href"];

const publicSeoGuideMap = publicSeoGuideList.reduce<
  Partial<Record<PublicSeoGuideHref, PublicSeoGuide>>
>((accumulator, guide) => {
  accumulator[guide.href] = guide;
  return accumulator;
}, {}) as Record<PublicSeoGuideHref, PublicSeoGuide>;

export function getPublicSeoGuide(href: PublicSeoGuideHref) {
  return publicSeoGuideMap[href];
}

export function getPublicSeoGuides() {
  return publicSeoGuideList;
}

export function buildPublicSeoMetadata(href: PublicSeoGuideHref): Metadata {
  const guide = getPublicSeoGuide(href);

  return {
    title: guide.title,
    description: guide.description,
    alternates: {
      canonical: guide.href,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: `${siteUrl}${guide.href}`,
      siteName: "Daily Sparks",
      type: "article",
    },
  };
}

export function PublicSeoGuidePage({
  href,
}: {
  href: PublicSeoGuideHref;
}) {
  const guide = getPublicSeoGuide(href);

  return (
    <InformationalPageShell
      eyebrow={guide.eyebrow}
      title={guide.title}
      intro={guide.intro}
      lastUpdated={guide.lastUpdated}
    >
      <InfoSection title="Who this is for">
        <ul className="space-y-3">
          {guide.sections.audience.map((item) => (
            <li key={item} className="list-none rounded-[22px] bg-slate-50 px-5 py-4">
              {item}
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="How Daily Sparks helps">
        <ul className="space-y-3">
          {guide.sections.helps.map((item) => (
            <li key={item} className="list-none rounded-[22px] bg-slate-50 px-5 py-4">
              {item}
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="What the workflow includes">
        <ul className="space-y-3">
          {guide.sections.workflow.map((item) => (
            <li key={item} className="list-none rounded-[22px] border border-slate-200 bg-white px-5 py-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.24)]">
              {item}
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="Related guides">
        <div className="grid gap-4 md:grid-cols-3">
          {guide.relatedPages.map((relatedHref) => {
            const relatedGuide = getPublicSeoGuide(relatedHref as PublicSeoGuideHref);

            return (
              <Link
                key={relatedGuide.href}
                href={relatedGuide.href}
                className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.22)] transition-transform hover:-translate-y-0.5 hover:border-slate-300"
              >
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#f59e0b]">
                  Related page
                </p>
                <h3 className="mt-3 text-lg font-bold tracking-[-0.02em] text-[#0f172a]">
                  {relatedGuide.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {relatedGuide.description}
                </p>
              </Link>
            );
          })}
        </div>
      </InfoSection>

      <InfoSection title="Take the next step">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 px-6 py-6 shadow-[0_24px_56px_-42px_rgba(15,23,42,0.3)]">
          <p className="text-base text-slate-600">
            Daily Sparks is built to make reading habits feel calmer, more
            structured, and more reusable across the IB family workflow.
          </p>
          <Link
            href={guide.cta.href}
            className="mt-5 inline-flex rounded-full bg-[#0f172a] px-6 py-3 text-sm font-bold uppercase tracking-[0.22em] text-white transition-transform hover:scale-[1.02]"
          >
            {guide.cta.label}
          </Link>
        </div>
      </InfoSection>
    </InformationalPageShell>
  );
}
