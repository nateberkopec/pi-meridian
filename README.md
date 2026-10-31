# Pi Meridian (retired)

This npm mirror is retired. Meridian 1.86.0 and newer include the official Pi integration, maintained in [rynfar/meridian](https://github.com/rynfar/meridian).

## Migrate to the official integration

Remove this package from Pi, then install the extension bundled with Meridian:

```fish
pi remove npm:@nateberkopec/pi-meridian
meridian setup --client pi
```

Restart Pi or run `/reload`, then select a model under the `meridian` provider with `/model`. Use only the official extension, not an additional copy from npm or `agent-stuff`.

Setup copies the extension shipped with the installed Meridian version. Rerun `meridian setup --client pi` after upgrading Meridian to refresh it. The official [agent setup guide](https://github.com/rynfar/meridian/blob/main/docs/agents.md#pi) covers configuration.

The server-side Meridian Pi scrub plugin is separate. This migration does not replace or remove it.

## Retirement

Existing npm versions remain published. There will be no new releases from this repository. The mirrored source, sync and publish helpers, release workflow, and development toolchain have been removed. The remaining package manifest is private to prevent accidental publication.

Git history retains the old implementation. This change does not unpublish npm versions or delete the repository.
