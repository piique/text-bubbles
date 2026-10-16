# Releasing

Releases are published to npm from GitHub Actions using **Trusted Publishing** (OIDC). There is
no `NPM_TOKEN`, no long-lived secret and no one-time password: the `Publish to npm` workflow
authenticates to the registry with a short-lived OpenID Connect token and attaches **provenance**
to the published tarball.

Why not a token? npm is retiring the alternatives: classic **Automation** tokens are deprecated,
and granular access tokens with **direct-publish** access will stop publishing new versions in
January 2027. Trusted Publishing is the recommended path for CI/CD.

## One-time setup (npmjs.com)

1. Open the package's **Trusted Publisher** settings:
   <https://www.npmjs.com/package/text-bubbles/access>
2. Under **Trusted Publisher → GitHub Actions**, click **Set up connection** and fill in:
   - **Organization or user:** `piique`
   - **Repository:** `text-bubbles`
   - **Workflow filename:** `publish.yml` (filename only; it must exist in `.github/workflows/`)
   - **Environment name:** leave empty
   - **Allowed actions:** enable **publish directly** (`npm stage publish` is always allowed)
3. Under **Publishing access**, pick the most restrictive option:
   *"Require two-factor authentication and disallow bypass 2fa tokens (recommended)"*, then
   **Update Package Settings**. OIDC trusted publishers work regardless of this choice.

The connection starts as **Pending validation**: publish once within the window npm shows
(usually a few days) to validate it. After the first successful publish it becomes active.

## Cutting a release

```bash
# 1. Update CHANGELOG.md and bump "version" in package.json (e.g. 1.0.1 -> 1.0.2).
#    Commit on main.
git add package.json CHANGELOG.md
git commit -m "chore(release): 1.0.2"
git push

# 2. Tag and push. The tag is what triggers the publish workflow.
git tag -a v1.0.2 -m "text-bubbles 1.0.2"
git push origin v1.0.2
```

Pushing a `v*` tag runs `.github/workflows/publish.yml`, which:

1. installs with `pnpm install --frozen-lockfile`;
2. runs `npm publish --access public`, whose `prepublishOnly` gate runs `typecheck`, `test`,
   `build` and `size` before anything is uploaded;
3. publishes with `provenance` (a Sigstore transparency-log entry linking the tarball to this
   repository, commit and workflow run).

The registry may report *"Your package is being processed and may take a few minutes to become
available"* — that is normal.

## Verifying

```bash
npm view text-bubbles version           # the new version
npm view text-bubbles dist-tags         # latest
```

The provenance attestation is linked from the package page on npmjs.com and is searchable at
<https://search.sigstore.dev>.

## Notes

- **Do not** add an `NPM_TOKEN` secret; Trusted Publishing does not use one. The workflow needs
  `permissions: id-token: write` (already set).
- The workflow filename in `.github/workflows/` must match the **Workflow filename** configured
  on npm, or the OIDC exchange is rejected.
- Only tags trigger a publish. Pushing to `main` runs CI and the demo deploy, never a release.
