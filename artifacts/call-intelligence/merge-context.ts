/** Adapted source excerpts, E08. Added types/exports and renamed variables.
 * Layer precedence is legacy < research < call < intake form. Merge is shallow.
 * mergeUnique expects an array, as its inspected caller supplies one. */
type Layer = Record<string, unknown>;
type LayeredContext = Layer & {
  onboarding_form_ingestion?: Layer;
  call_extracted?: Layer;
  precall_research?: Layer;
};

export function mergeIntelligence(raw: LayeredContext | null): Layer {
  if (!raw || typeof raw !== 'object') return {};
  if (!raw.onboarding_form_ingestion && !raw.call_extracted && !raw.precall_research) return raw;
  function stripNulls(layer: Layer | undefined): Layer {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) return layer || {};
    const output: Layer = {};
    for (const key in layer) if (layer[key] !== null) output[key] = layer[key];
    return output;
  }
  const legacy = { ...raw };
  delete legacy.onboarding_form_ingestion;
  delete legacy.call_extracted;
  delete legacy.precall_research;
  return Object.assign({}, legacy, stripNulls(raw.precall_research),
    stripNulls(raw.call_extracted), stripNulls(raw.onboarding_form_ingestion));
}

export function mergeUnique(existing: string[], newItems: string[]): string[] {
  if (!newItems || !newItems.length) return existing;
  const seen = new Set((existing || []).map(s => s.toLowerCase().trim()));
  for (const item of newItems) {
    if (item && !seen.has(item.toLowerCase().trim())) {
      existing.push(item);
      seen.add(item.toLowerCase().trim());
    }
  }
  return existing;
}
