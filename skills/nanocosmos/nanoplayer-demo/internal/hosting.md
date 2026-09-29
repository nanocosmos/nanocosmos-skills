# Hosting and registration (internal)

Not shipped publicly: the source repo's build drops `internal/` folders.

## 1. Register the theme copy

Every demo keeps a physical copy of `product-theme.css`, so brand-guidelines
has to know about it, or it silently drifts.

- Add the demo's theme path, relative to `$NANOCOSMOS_REPOS_DIR`
  (default `~/Documents/nanocosmos`), to
  `nanocosmos-brand-guidelines/scripts/theme_consumers.txt` in the same change
  that creates the demo, e.g. `my-demo/product-theme.css`.
- Check: `nanocosmos-brand-guidelines/scripts/check_theme_sync.sh --diff`.
  "Behind" between release rollouts is fine. "Ahead" means someone edited the
  copy; port that into canonical (brand-guidelines Theme release cycle).

## 2. Deploy to GitLab Pages

Demo repos live in the `web/` group on `gitlab.nanocosmos.cloud` (e.g.
`web/live-plus-replay`, `web/switch-player`) and publish to
`web.pages.gitlab.nanocosmos.cloud`. A demo folder is static, with no build
step. This Pages job matches the existing demo repos (checked against
`live-plus-replay` and `switch-player`, 2026-09-29):

```yaml
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r index.html page.css product-theme.css js public/
    - '[ -f customer-logo.svg ] && cp customer-logo.svg public/ || true'
    - echo "$(date -u) $CI_COMMIT_REF_NAME $CI_COMMIT_SHORT_SHA" > public/version.txt
  artifacts:
    paths:
      - public
  rules:
    # Classic GitLab Pages publishes the artifact only from the default branch.
    - if: '$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH'
```

Publish only the runnable demo. Dev files (tests, specs, CLAUDE.md) stay out
of `public/`. If the demo repo has its own `node --test` suite, run it
pathless in a `test` stage (`node --test` with no directory argument works
on Node 20 and 22; `node --test test/` breaks on Node 22).

## 3. Streams for demos

- Public demo org streams (safe in shared links): `CD6oL-2kE1g`,
  `HX26g-YVe8D`; other streams of the demo orgs `CD6oL`, `HX26g`, `yPleE`,
  `nNCcf`.
- Customer streams: only with the requesting team's OK, and never with a
  long-lived token in the link.
- Non-production environments (stage/dev) are internal-only. Never put them
  in a demo that leaves the company.
