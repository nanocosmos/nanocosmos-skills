# Review notes — internal draft, remove before publication

This repo is a **generated review candidate** (see the private skills repo's
`PUBLISHING.md`). Nothing here has been pushed anywhere. Before first
publication:

## Decisions still open (PUBLISHING.md §7)
1. License — RESOLVED (OL, 2026-08-23): the staged custom proprietary
   "customer-use-only, source-available" `LICENSE` is approved as-is
   (Apache-2.0 was rejected earlier the same day: everything is commercial,
   use only with a nanocosmos license per
   https://www.nanocosmos.net/terms). No longer blocks publication.
2. Hosting — plan: internal GitLab first (private → public), GitHub possibly later.
3. Brand decision — the `nanostream-demo-styling` extract (brand-guidelines
   demo tier) is NOT included in this draft; add later if approved.
4. Support posture — README currently says issues are for skill mistakes only.
5. Release owner + cadence.

## Deliberate keeps (owner decisions 2026-08-23)
- Demo playback JWTs (expired ones acceptable; check `exp` before use).
- The multiplayer tool on `web.pages.gitlab.nanocosmos.cloud` (publicly reachable).
- `bintu-vod-*` CDN test-asset URLs.
- nanocosmos demo org streams: CD6oL, HX26g, yPleE, nNCcf.

## Removed during generation — re-add only deliberately
Both technical skills now follow the unified two-tier source layout
(2026-08-23): admin content lives in the source repo's `internal/` folders
(never shipped) and in `<!-- internal -->` blocks (stripped at build).
- nanostream: `env=stage`/`env=dev` multiplayer switch — DECIDED (OL,
  2026-08-24): non-production environments are internal-only, never
  advertised to customers (customers always use production unless
  nanocosmos instructs otherwise); marker-wrapped internal at source.
  Also removed: placeholder metrics credentials in player.html.
- nanostream-diagnostics: admin-stream-diagnostics.md, the admin cross-org
  chain in player-config-reference.md, all `internal/` handoffs (rewritten
  to "contact support"), internal blocks (except slow-stream-start's GOP
  procedure, published as customer content), the internal `.env` layout.
- nanostream-analytics: the whole `internal/` tier (admin route map, admin
  scoping docs and scripts — admin capabilities moved there at source, the
  public scripts contain no admin logic at all).

## Judgment calls made during sanitization (flag if wrong)
- `ANALYTICS_ORGA_HASH` was dropped from the analytics `.env.example` entirely
  (no shipped script consumes it after the admin surgery) — restore with a
  "usually not needed" note if preferred.
- (retracted 2026-08-23) an earlier note here claimed `get_token.sh` mentions
  a non-shipped helper in three comments — that was a bad grep matching
  `get_token.sh`'s references to itself; no dangling references exist.
- `query.sh` honours an optional `ANALYTICS_EXTRA_HEADER` env var (one extra
  HTTP header). Deliberate and generic: the internal admin front-end delegates
  to the public script through it, so the request engine exists only once.
  On a customer account any extra scoping header is ignored server-side.
- The "77 routes" counts stay (that's the public spec's own count; only the
  "API actually serves ~200" framing was removed).

## Layout note
`.claude-plugin/` makes the repo a Claude Code plugin + single-plugin
marketplace (`claude plugin install nanocosmos@nanocosmos`, skills invoked
as `nanocosmos:<skill>`) — see the private repo's PUBLISHING.md §2.1 for
the verified mechanics. plugin.json has no `version` on purpose (updates
pin to the commit SHA).

Skills are organized under `skills/nanocosmos/<name>/` for repo browsing.
`install.sh` FLATTENS on install (each skill → `<skills-root>/<name>/`)
because Claude Code discovers skills only directly under the skills root,
and the directory name is the invocation name — hence unique, prefixed
names (`nanostream-analytics`, not bare `analytics`).

## Worth a second pair of eyes
- `reference-urls.md` still contains the severity classification table
  (CRITICAL/HIGH/... definitions, no SLA times) — kept; prune if unwanted.
- Verify the analytics scripts still run end-to-end on a plain customer
  dashboard account after the admin-branch surgery.
- Verify each demo stream referenced actually plays (or is at least a valid
  name) for an outside user.
- `validate_skills.sh --public` output was clean at generation time; re-run
  after any manual change: `tools/build-public-skills.sh` in the private repo.
