# Pi Meridian

A small Pi provider extension for Meridian’s Claude backend. It registers a separate `meridian` provider, discovers the available models from Meridian, and delegates Anthropic streaming, thinking, tools, usage, and cancellation to Pi’s built-in implementation. Installing it does not redirect the ordinary Anthropic provider.

## Compatibility

- Pi `1.1.0` from `@earendil-works/pi-coding-agent` is the tested host. Older Pi versions and forks are not verified.
- Node.js 22 or newer is required by Meridian and this package. Development and CI use Node.js 26.
- Meridian must expose its Claude model catalog and Anthropic Messages endpoint. The default endpoint is `http://127.0.0.1:3456`.
- API-key-protected endpoints and Antigravity are not supported by this release.

Provider permissions, subscription limits, and billing policies still apply. This extension does not guarantee subscription-only billing or enable extra usage.

## Install

The npm prerelease is not published yet. For a source installation:

```fish
pi install git:github.com/nateberkopec/pi-meridian
```

For reproducible installations, pin that source to an agreed commit or release tag. Once the npm prerelease has been published, the corresponding command will be:

```fish
pi install npm:@nateberkopec/pi-meridian@0.1.0-beta.1
```

Start and authenticate Meridian using its [official setup instructions](https://github.com/rynfar/meridian). Restart Pi or run `/reload`, then select a model under the `meridian` provider with `/model`. Do not also load an old copy of this extension from `agent-stuff` or your extensions directory.

To use another endpoint, set `MERIDIAN_BASE_URL` in Pi’s environment before startup:

```fish
set -gx MERIDIAN_BASE_URL http://127.0.0.1:3458
pi
```

Use the server root URL without `/v1`. Keep unauthenticated Meridian on loopback; exposing it on your network can expose your subscription to other callers.

## Behavior

The catalog is authoritative for model availability, context windows, image input, thinking, and supported effort levels. Known models retain Pi’s output limit and compatibility metadata. Unknown models use a conservative 8,192-token output limit, bounded by their context window; the context window is not an output-limit guarantee. Costs inherited from known models are API-equivalent estimates, not subscription charges.

Discovery is bounded by a two-second startup timeout and a three-second refresh timeout. A validated catalog-only cache survives outages for up to seven days under Pi’s agent directory at `cache/meridian-models.json`. It contains no prompts, credentials, or request headers. Opening `/model` retries network discovery; cached models do not mean Meridian is online.

Requests carry Pi adapter identity, session affinity, request IDs, and primary/subagent tier hints. Stale competing identity headers are removed; explicit profile and task-budget overrides are preserved. Auxiliary calls with their own session IDs are isolated. `pi-subagents` children are recognized through its child-process environment and active-agent prompt marker; other delegation implementations are not verified.

This release does not implement OpenCode’s signed next-human-turn priority failback. Compaction isolation is Pi-specific and has not passed clean live acceptance yet.

## Validation status

The existing eight contract/system tests execute inside real Pi extension factories. The harness verifies successful completion and makes deliberately failing assertions exit nonzero. A separate system test packs the publishable tarball, installs it in isolated Pi state, and checks that only Meridian loads and performs discovery. Type checking, lint, and secret scanning also run in CI on Linux and macOS.

On 2026-10-12, an authenticated check using Pi 1.1.0 and the unmodified npm Meridian 1.80.0, with no server-side plugins and separate Meridian/Pi state, reached model discovery but failed the first generation with a Claude subscription/billing error. No tool loop, cancellation, or compaction acceptance was established. The account reported an authenticated Max login; this does not establish why generation was rejected. No billing settings were changed and the live checks were stopped.

Nate’s daily Meridian build and separate Pi prompt-transform plugin are not prerequisites declared by this package and are not evidence of clean-upstream compatibility.

## Development

```fish
mise trust
mise install
mise run setup
mise run lint
mise run test
mise run build
```

Development dependencies are isolated under `development/` with a frozen aube lockfile. Pi runtime dependencies remain host-provided peers; the published tarball includes no development dependencies or tests. `mise run build` creates the tarball under `tmp/` without compilation.

## Releases

Changes go through pull requests. The manually dispatched `release.yml` workflow only publishes from a `v<package-version>` tag whose commit is contained in `main`. It reruns lint, contracts, type checks, and tarball installation before publishing to npm’s `beta` tag with provenance.

The npm package and trusted publisher still require initial owner setup. Do not dispatch the publish workflow until that setup and publication are explicitly authorized. No npm token is stored in this repository, and no GitHub settings change is required by this workflow.

MIT licensed. Extracted from Nate Berkopec’s `agent-stuff`; this is an independent package, not an official Meridian release.
