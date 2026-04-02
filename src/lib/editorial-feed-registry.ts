import type {
  EditorialIngestionMode,
  EditorialSourceRecord,
} from "./editorial-source-store";

export type EditorialFeedFormat = "rss" | "atom";

export type EditorialFeedTarget = {
  sourceId: string;
  sourceName: string;
  sourceDomain: string;
  section: string;
  url: string;
  format: EditorialFeedFormat;
  ingestionMode: EditorialIngestionMode;
};

type EditorialFeedTemplate = {
  section: string;
  url: string;
  format: EditorialFeedFormat;
};

type EditorialFeedDefinition = {
  defaultTargets: EditorialFeedTemplate[];
  sectionTargets?: Record<string, EditorialFeedTemplate[]>;
};

const EDITORIAL_FEED_REGISTRY: Partial<
  Record<EditorialSourceRecord["id"], EditorialFeedDefinition>
> = {
  bbc: {
    defaultTargets: [
      {
        section: "top-stories",
        url: "https://feeds.bbci.co.uk/news/rss.xml",
        format: "rss",
      },
    ],
    sectionTargets: {
      world: [
        {
          section: "world",
          url: "https://feeds.bbci.co.uk/news/world/rss.xml",
          format: "rss",
        },
      ],
      science: [
        {
          section: "science",
          url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml",
          format: "rss",
        },
      ],
      education: [
        {
          section: "education",
          url: "https://feeds.bbci.co.uk/news/education/rss.xml",
          format: "rss",
        },
      ],
      technology: [
        {
          section: "technology",
          url: "https://feeds.bbci.co.uk/news/technology/rss.xml",
          format: "rss",
        },
      ],
      business: [
        {
          section: "business",
          url: "https://feeds.bbci.co.uk/news/business/rss.xml",
          format: "rss",
        },
      ],
      health: [
        {
          section: "health",
          url: "https://feeds.bbci.co.uk/news/health/rss.xml",
          format: "rss",
        },
      ],
    },
  },
  npr: {
    defaultTargets: [
      {
        section: "top-stories",
        url: "https://feeds.npr.org/1001/rss.xml",
        format: "rss",
      },
    ],
    sectionTargets: {
      world: [
        {
          section: "world",
          url: "https://feeds.npr.org/1004/rss.xml",
          format: "rss",
        },
      ],
      science: [
        {
          section: "science",
          url: "https://feeds.npr.org/1007/rss.xml",
          format: "rss",
        },
      ],
      business: [
        {
          section: "business",
          url: "https://feeds.npr.org/1006/rss.xml",
          format: "rss",
        },
      ],
      education: [
        {
          section: "education",
          url: "https://feeds.npr.org/1013/rss.xml",
          format: "rss",
        },
      ],
      health: [
        {
          section: "health",
          url: "https://feeds.npr.org/1128/rss.xml",
          format: "rss",
        },
      ],
    },
  },
  "science-news": {
    defaultTargets: [
      {
        section: "latest",
        url: "https://www.sciencenews.org/feed",
        format: "rss",
      },
    ],
  },
  "science-news-explores": {
    defaultTargets: [
      {
        section: "latest",
        url: "https://www.snexplores.org/feed",
        format: "rss",
      },
    ],
  },
  unicef: {
    defaultTargets: [
      {
        section: "stories",
        url: "https://www.unicef.org/rss.xml",
        format: "rss",
      },
    ],
  },
  who: {
    defaultTargets: [
      {
        section: "news-room",
        url: "https://www.who.int/rss-feeds/news-english.xml",
        format: "rss",
      },
    ],
  },
  "smithsonian-magazine": {
    defaultTargets: [
      {
        section: "latest",
        url: "https://www.smithsonianmag.com/rss/latest_articles/",
        format: "rss",
      },
    ],
  },
};

function normalizeSection(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

function getSourceTemplates(
  source: EditorialSourceRecord,
): EditorialFeedTemplate[] {
  const definition = EDITORIAL_FEED_REGISTRY[source.id];

  if (!definition) {
    return [];
  }

  const requestedSections = source.sections
    .map(normalizeSection)
    .filter(Boolean);

  const sectionTemplates = requestedSections.flatMap(
    (section) => definition.sectionTargets?.[section] ?? [],
  );

  if (sectionTemplates.length > 0) {
    return sectionTemplates;
  }

  return definition.defaultTargets;
}

export function resolveEditorialFeedTargets(
  sources: EditorialSourceRecord[],
): EditorialFeedTarget[] {
  const seenUrls = new Set<string>();

  return sources.flatMap((source) => {
    if (!source.active) {
      return [];
    }

    return getSourceTemplates(source).flatMap((template) => {
      if (seenUrls.has(template.url)) {
        return [];
      }

      seenUrls.add(template.url);

      return [
        {
          sourceId: source.id,
          sourceName: source.name,
          sourceDomain: source.domain,
          section: template.section,
          url: template.url,
          format: template.format,
          ingestionMode: source.ingestionMode,
        },
      ];
    });
  });
}
