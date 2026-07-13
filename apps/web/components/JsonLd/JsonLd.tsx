// Emits a schema.org JSON-LD <script> for rich results. Server component; the
// object is our own (never user input), so the JSON.stringify is safe to inline.
// Kept generic so any page can drop in WebApplication / FAQPage / BreadcrumbList
// etc. (First structured-data helper in the app.)

type Props = {
  // A schema.org node (or array of nodes). Typed loosely on purpose — the caller
  // owns the shape and each schema type has different required fields.
  data: Record<string, unknown> | Record<string, unknown>[];
};

const JsonLd = ({ data }: Props) => (
  <script
    type="application/ld+json"
    // biome-ignore lint/security/noDangerouslySetInnerHtml: our own static data, not user input
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
  />
);

export default JsonLd;
