type GoogleAnalyticsProps = {
  measurementId?: string | null;
};

function normalizeMeasurementId(value: string | null | undefined) {
  return value?.trim() || "";
}

export default function GoogleAnalytics({
  measurementId,
}: GoogleAnalyticsProps) {
  const normalizedMeasurementId = normalizeMeasurementId(measurementId);

  if (!normalizedMeasurementId) {
    return null;
  }

  return (
    <>
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${normalizedMeasurementId}`}
      />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = window.gtag || gtag;
            gtag('js', new Date());
            gtag('config', '${normalizedMeasurementId}', { anonymize_ip: true });
          `,
        }}
      />
    </>
  );
}
