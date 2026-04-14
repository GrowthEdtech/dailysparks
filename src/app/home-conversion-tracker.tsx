"use client";

import { useEffect } from "react";

import { trackMarketingEvent } from "../lib/marketing-analytics";

const HOME_SECTION_ORDER = [
  "hero",
  "problem",
  "solution",
  "workflow",
  "workspace-preview",
  "integrations",
  "pricing",
  "faq",
] as const;

const SCROLL_MILESTONES = [25, 50, 75, 90] as const;

export function getReachedScrollMilestones(
  scrollPercent: number,
  trackedMilestones: ReadonlySet<number>,
) {
  return SCROLL_MILESTONES.filter(
    (milestone) =>
      scrollPercent >= milestone && !trackedMilestones.has(milestone),
  );
}

export default function HomeConversionTracker() {
  useEffect(() => {
    trackMarketingEvent("landing_page_viewed", {
      page_name: "home",
    });

    const trackedSections = new Set<string>();
    const trackedMilestones = new Set<number>();

    const handleScroll = () => {
      const documentHeight =
        document.documentElement.scrollHeight - window.innerHeight;

      if (documentHeight <= 0) {
        return;
      }

      const scrollPercent = Math.round((window.scrollY / documentHeight) * 100);
      const reachedMilestones = getReachedScrollMilestones(
        scrollPercent,
        trackedMilestones,
      );

      for (const milestone of reachedMilestones) {
        trackedMilestones.add(milestone);
        trackMarketingEvent("landing_scroll_depth_reached", {
          page_name: "home",
          scroll_depth_percent: milestone,
        });
      }
    };

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) {
                  continue;
                }

                const sectionId = entry.target.getAttribute("data-home-section");

                if (!sectionId || trackedSections.has(sectionId)) {
                  continue;
                }

                trackedSections.add(sectionId);
                trackMarketingEvent("landing_section_viewed", {
                  page_name: "home",
                  section_id: sectionId,
                  section_order: HOME_SECTION_ORDER.indexOf(
                    sectionId as (typeof HOME_SECTION_ORDER)[number],
                  ),
                });
              }
            },
            {
              threshold: 0.35,
            },
          );

    const sections = document.querySelectorAll<HTMLElement>("[data-home-section]");

    sections.forEach((section) => observer?.observe(section));

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer?.disconnect();
    };
  }, []);

  return null;
}
