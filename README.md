# Pi Meridian

An npm mirror of the [Meridian](https://github.com/rynfar/meridian) Pi extension, so it can be installed with Pi’s package manager. The extension registers a separate `meridian` provider, discovers the available models from Meridian, and delegates Anthropic streaming, thinking, tools, usage, and cancellation to Pi’s built-in implementation. Installing it does not redirect the ordinary Anthropic provider.

The extension’s source of truth is `plugin/pi/` in Meridian. `extensions/meridian/` here is a verbatim copy, and `UPSTREAM` records the repository and commit it came from. The current copy comes from [rynfar/meridian#1408](https://github.com/rynfar/meridian/pull/1408), which is not merged yet.

## Compatibility

- Pi 1.0 or newer from `@earendil-works/pi-coding-agent`. Pi 1.3.0 is the tested host; `providers.meridian.baseUrl` in `models.json` needs Pi 1.3.
- Node.js 22 or newer. Development and CI use Node.js 26.
- Any Meridian release that serves `/v1/models` and the Anthropic Messages endpoint. Signed `next-user-turn` priority failback also needs a Meridian that includes #1408; older releases ignore the signature.

## Install or update

```fish
pi install npm:@nateberkopec/pi-meridian@0.2.0-beta.1
```

Installing a new version replaces the pinned version in Pi’s settings. Restart Pi or run `/reload`, then select a model under the `meridian` provider with `/model`.

Use either this package or `meridian setup --client pi`, not both: each loads its own copy of the extension, and both register the `meridian` provider. If you ran setup, remove `~/.pi/agent/extensions/meridian` before using this package. Do not also load an old copy of this extension from `agent-stuff`.

Versions before 0.2.0 kept a catalog cache at `~/.pi/agent/cache/meridian-models.json`. It is no longer read and can be deleted.

## Configuration

| Setting | Effect |
|---------|--------|
| `MERIDIAN_BASE_URL` | Meridian’s server root, without `/v1` (default `http://127.0.0.1:3456`) |
| `MERIDIAN_API_KEY` | Sent as `x-api-key` when Meridian has API-key protection on |
| `providers.meridian.baseUrl` in `~/.pi/agent/models.json` | Overrides `MERIDIAN_BASE_URL` |
| `MERIDIAN_SOURCE` | `x-meridian-source` for every request of this Pi process, for delegated children |

Keep unauthenticated Meridian on loopback; exposing it on your network can expose your subscription to other callers. Provider permissions, subscription limits, and billing policies still apply. This extension does not guarantee subscription-only billing or enable extra usage.

The behavior is documented in Meridian’s [agent setup guide](https://github.com/rynfar/meridian/blob/main/docs/agents.md#pi).

## Development

```fish
mise trust
mise install
mise run setup
mise run lint
mise run test
mise run build
```

To update the copy, run `tools/sync-upstream.sh <meridian-ref> [repository]`, then bump the version. The extension’s own tests live in Meridian. This repository only checks that the packed tarball installs into an isolated real Pi and discovers models from a loopback Meridian catalog, and type-checks the copy against the pinned Pi packages.

Development dependencies are isolated under `development/` with a frozen aube lockfile. Pi runtime dependencies remain host-provided peers; the published tarball includes no development dependencies or tests.

## Releases

Changes go through pull requests. The manually dispatched `release.yml` workflow only stages artifacts from a `v<package-version>` tag whose commit is contained in `main`. It reruns lint, type checks, and tarball installation, then uploads the tarball, SHA-256 checksum, and source commit. It has no npm publish step or OIDC permission.

Every publication requires fresh physical YubiKey verification. Staging or approving a GitHub workflow is not that verification. Do not configure npm trusted publishing until a release gate enforcing this requirement is implemented and verified. No npm token is stored in this repository, and staging requires no GitHub settings change.

To publish, use `node tools/publish-beta.mjs <staged-tarball> <reviewed-source-commit>` in your own interactive terminal. Keep the staged `SHA256SUMS` and `SOURCE_COMMIT` beside the tarball. The helper checks the artifact and npm account, requires the pinned card-backed OpenPGP signing subkey with uncached touch policy, signs a fresh package/version/source/checksum approval, verifies it, and publishes the same private snapshot with native npm. Cancelling or failing signature verification prevents publication. Never bypass the helper with a direct publish command; npm account permissions outside this repository are not controlled by this helper.

MIT licensed. Extracted from Nate Berkopec’s `agent-stuff`; this is an independent package, not an official Meridian release.
