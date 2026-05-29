# TCPA Compliance, Media Preview Fixes, and Stronger Visual Polish

## User feedback

- "compliance research and mention tcpa"
- "Existing media preview image broke."
- "The frontend design is toooo bland"

## Research notes

Web search was unavailable, so use direct official source fetches and general compliance best practices.

Official TCPA/eCFR signal:

- Source fetched successfully: `https://www.ecfr.gov/api/versioner/v1/full/2025-05-28/title-47.xml?part=64&section=64.1200`
- 47 CFR §64.1200 references telemarketing/advertising calls using autodialer/artificial/prerecorded voice and exceptions where there is `prior express written consent` of the called party.
- For this demo app, do not claim complete legal compliance. Phrase as compliance-readiness / controls / evidence capture.

Compliance concepts to include where relevant:

- TCPA-aware SMS readiness
- prior express written consent evidence
- clear opt-out / STOP handling
- suppression list / revocation of consent workflow
- quiet hours / send-window controls
- sender identity and message purpose
- audit trail for approvals and audience source
- company-provided vs double opt-in vs imported consent sources
- disclaimer: production senders still need legal review, carrier/CTIA policy alignment, and backend enforcement before real sends.

## Media preview bug

Live QA showed seeded media assets render broken images:

- `https://cdn.example/retail/high-value-preview-pass.png`
- `https://cdn.example/retail/seattle-vip-double-points.png`
- etc.

In browser, image elements have `complete: true` but `naturalWidth: 0` for `cdn.example` URLs. Some Unsplash URLs also may not be loaded at snapshot time.

Requirements:

- Do not rely on external URLs for preview success.
- Add robust image preview fallback:
  - on image load error, show a designed placeholder card instead of a broken image icon.
  - preferably map `cdn.example/retail/*` seed assets to generated local/SVG/CSS preview cards or inline data SVGs based on filename.
  - if remote image has not loaded yet, keep layout stable.
- Keep filename/content type/url visible.
- Tests should assert a seed CDN example asset gets a fallback preview or stable branded placeholder rather than raw broken image only.

## Visual polish direction

The real frontend currently feels too bland. Keep the researched IA/composite, but make it visually stronger and more memorable.

Do not just recolor everything. Add product-grade visual character:

- stronger CampaignOS brand treatment
- richer backgrounds/surfaces using controlled gradients, glows, and depth
- better hero/command surfaces with accent geometry and live-status visualizations
- more polished cards, chips, status badges, and progress elements
- more distinctive public KB/features/design-review visuals
- stronger monitor war-room visual treatment
- richer content library/media template cards
- more deliberate typography scale and spacing

Suggested references:

- Stripe-style premium gradients for marketing/features highlights.
- Sentry-style dark/data-dense treatment for `/monitor`.
- Linear-style precision for `/app`, but not so flat/bland.
- Intercom-like friendliness for `/kb` compliance/help content.

## Scope

Implement a focused frontend slice:

1. TCPA/compliance content:
   - Update `/kb` compliance article to explicitly mention TCPA, prior express written consent, opt-out/STOP, suppression/revocation, quiet hours, and audit evidence.
   - Update `/features/compliance` with TCPA-aware positioning and a clear not-legal-advice caveat.
   - Add compliance/TCPA cues in campaign builder or settings if natural, without overloading.
   - Add tests for TCPA text.

2. Media preview fix:
   - Fix content library image previews so broken external URLs show a polished fallback/placeholder.
   - Avoid broken image icon in live UI.
   - Add test coverage for image fallback/placeholder.

3. Visual polish:
   - Make the real `/app`, `/monitor`, `/internal`, `/kb`, `/features`, `/design-review`, and content library look less bland.
   - Preserve all routes and existing functionality.
   - Keep `/app-designs/1`-`/10` available for review; do not remove them.
   - Avoid huge risky rewrites. Prefer CSS/component polish plus small focused JSX improvements.

## Validation

Run before stopping:

```bash
cd apps/web-ui && npm test -- --run && npm run build
cd ../..
. .venv/bin/activate && ruff check . && python -m pytest -q
docker build -t web-ui:local -f apps/web-ui/Dockerfile .
```

## Browser QA after controller deploy

- `/app` dashboard visual richness
- `/app` → Content Library: no broken image icons; placeholders/previews look good
- `/monitor` war-room style still readable
- `/kb` compliance article/search/category includes TCPA
- `/features/compliance` includes TCPA
- `/design-review` still links all options
