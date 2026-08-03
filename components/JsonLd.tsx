import type { JsonLdNode } from "@/lib/structured-data";

/**
 * Emits a JSON-LD block.
 *
 * `<` is escaped because the payload carries user-authored strings (event
 * titles, venue names): a title containing `</script>` would otherwise close
 * the tag early and inject markup into the page. Escaping the angle bracket as
 * a unicode sequence keeps the JSON byte-identical to a parser while making
 * that impossible.
 *
 * Server-rendered on purpose — crawlers that don't execute JS still need to
 * see it, which rules out injecting this from an effect.
 */
export function JsonLd({ data }: { data: JsonLdNode | JsonLdNode[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      // The value is JSON we serialized ourselves, with `<` neutralised above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
