export type NotificationEmailPanelTone = "primary" | "accent" | "neutral";

export type NotificationEmailPanel = {
  eyebrow?: string;
  title?: string;
  body: string;
  tone?: NotificationEmailPanelTone;
};

export type NotificationEmailBulletSection = {
  title: string;
  items: string[];
};

export type NotificationEmailPrimaryAction = {
  label: string;
  href: string;
};

export type NotificationEmailContent = {
  html: string;
  text: string;
};

export type NotificationEmailInput = {
  previewText?: string;
  eyebrow: string;
  title: string;
  intro: string;
  panels?: NotificationEmailPanel[];
  bodyParagraphs?: string[];
  bulletSections?: NotificationEmailBulletSection[];
  primaryAction?: NotificationEmailPrimaryAction;
  supportingNote?: string;
  signature: string;
  footerNote?: string;
};

type PanelPalette = {
  background: string;
  border: string;
  eyebrow: string;
  body: string;
};

const PANEL_PALETTES: Record<NotificationEmailPanelTone, PanelPalette> = {
  primary: {
    background: "#eef6ff",
    border: "#c7d9ee",
    eyebrow: "#1d4ed8",
    body: "#334155",
  },
  accent: {
    background: "#fff7e8",
    border: "#f5d58e",
    eyebrow: "#b45309",
    body: "#334155",
  },
  neutral: {
    background: "#f8fafc",
    border: "#dbe4f0",
    eyebrow: "#475569",
    body: "#334155",
  },
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderPanels(panels: NotificationEmailPanel[]) {
  return panels
    .map((panel) => {
      const palette = PANEL_PALETTES[panel.tone ?? "neutral"];
      const eyebrow = panel.eyebrow
        ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${palette.eyebrow};">${escapeHtml(panel.eyebrow)}</p>`
        : "";
      const title = panel.title
        ? `<p style="margin:0 0 8px;font-size:16px;font-weight:700;line-height:1.5;color:#0f172a;">${escapeHtml(panel.title)}</p>`
        : "";

      return `
        <tr>
          <td style="padding:0 0 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${palette.background};border:1px solid ${palette.border};border-radius:20px;">
              <tr>
                <td style="padding:18px 20px;">
                  ${eyebrow}
                  ${title}
                  <p style="margin:0;font-size:15px;line-height:1.7;color:${palette.body};">${escapeHtml(panel.body)}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `.trim();
    })
    .join("\n");
}

function renderBodyParagraphs(paragraphs: string[]) {
  return paragraphs
    .map(
      (paragraph) => `
        <tr>
          <td style="padding:0 0 16px;">
            <p style="margin:0;font-size:15px;line-height:1.7;color:#475569;">${escapeHtml(paragraph)}</p>
          </td>
        </tr>
      `.trim(),
    )
    .join("\n");
}

function renderBulletSections(sections: NotificationEmailBulletSection[]) {
  return sections
    .map((section) => {
      const items = section.items
        .map(
          (item) =>
            `<tr><td style="padding:0 0 8px;font-size:15px;line-height:1.7;color:#334155;">&bull; ${escapeHtml(item)}</td></tr>`,
        )
        .join("");

      return `
        <tr>
          <td style="padding:0 0 18px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #dbe4f0;border-radius:20px;">
              <tr>
                <td style="padding:18px 20px;">
                  <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:#64748b;">${escapeHtml(section.title)}</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${items}
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      `.trim();
    })
    .join("\n");
}

function renderPrimaryAction(action: NotificationEmailPrimaryAction | undefined) {
  if (!action) {
    return "";
  }

  return `
    <tr>
      <td style="padding:0 0 22px;">
        <a href="${escapeHtml(action.href)}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:999px;padding:14px 24px;font-size:15px;font-weight:700;">
          ${escapeHtml(action.label)}
        </a>
      </td>
    </tr>
  `.trim();
}

function buildTextSections(input: NotificationEmailInput) {
  const blocks: string[] = [
    input.eyebrow,
    "",
    input.title,
    "",
    input.intro,
  ];

  for (const panel of input.panels ?? []) {
    blocks.push("", panel.eyebrow ?? panel.title ?? "Details", panel.body);
  }

  for (const paragraph of input.bodyParagraphs ?? []) {
    blocks.push("", paragraph);
  }

  for (const section of input.bulletSections ?? []) {
    blocks.push("", section.title);
    blocks.push(...section.items.map((item) => `- ${item}`));
  }

  if (input.primaryAction) {
    blocks.push("", `${input.primaryAction.label}: ${input.primaryAction.href}`);
  }

  if (input.supportingNote) {
    blocks.push("", input.supportingNote);
  }

  blocks.push("", input.signature);

  if (input.footerNote) {
    blocks.push("", input.footerNote);
  }

  return blocks.join("\n");
}

export function buildNotificationEmail(
  input: NotificationEmailInput,
): NotificationEmailContent {
  const previewText = escapeHtml(input.previewText ?? input.title);
  const panels = renderPanels(input.panels ?? []);
  const bodyParagraphs = renderBodyParagraphs(input.bodyParagraphs ?? []);
  const bulletSections = renderBulletSections(input.bulletSections ?? []);
  const primaryAction = renderPrimaryAction(input.primaryAction);
  const supportingNote = input.supportingNote
    ? `
      <tr>
        <td style="padding:0;">
          <p style="margin:0;font-size:13px;line-height:1.7;color:#64748b;">${escapeHtml(input.supportingNote)}</p>
        </td>
      </tr>
    `.trim()
    : "";
  const footerNote = input.footerNote
    ? `
      <tr>
        <td style="padding:14px 0 0;">
          <p style="margin:0;font-size:12px;line-height:1.7;color:#94a3b8;">${escapeHtml(input.footerNote)}</p>
        </td>
      </tr>
    `.trim()
    : "";

  const html = `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#eef3f9;">
        <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
          ${previewText}
        </div>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eef3f9;">
          <tr>
            <td align="center" style="padding:32px 16px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdfa;border:1px solid #dbe4f0;border-radius:28px;">
                <tr>
                  <td style="padding:40px 40px 32px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding:0 0 16px;">
                          <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#b45309;">${escapeHtml(input.eyebrow)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 16px;">
                          <h1 style="margin:0;font-size:32px;line-height:1.2;color:#0f172a;">${escapeHtml(input.title)}</h1>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 22px;">
                          <p style="margin:0;font-size:16px;line-height:1.7;color:#475569;">${escapeHtml(input.intro)}</p>
                        </td>
                      </tr>
                      ${panels}
                      ${bodyParagraphs}
                      ${bulletSections}
                      ${primaryAction}
                      ${supportingNote}
                      <tr>
                        <td style="padding:28px 0 0;">
                          <p style="margin:0;font-size:14px;line-height:1.7;color:#334155;">With care,<br />${escapeHtml(input.signature)}</p>
                        </td>
                      </tr>
                      ${footerNote}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `.trim();

  return {
    html,
    text: buildTextSections(input),
  };
}
