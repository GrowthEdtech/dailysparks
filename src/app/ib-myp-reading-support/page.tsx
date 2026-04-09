import { buildPublicSeoMetadata, PublicSeoGuidePage } from "../public-seo-pages-content";

export const metadata = buildPublicSeoMetadata("/ib-myp-reading-support");

export default function IbMypReadingSupportPage() {
  return <PublicSeoGuidePage href="/ib-myp-reading-support" />;
}
