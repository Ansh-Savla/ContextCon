# CrustData source archive

This directory contains the public CrustData documentation and sample sources collected for the hackathon project.

## Contents

- [`crustdata-docs/`](crustdata-docs/): snapshot of the official docs index: 105 Markdown pages and 8 OpenAPI YAML specs, 113 unique files total. [`manifest.json`](crustdata-docs/manifest.json) records original URLs, response metadata, and SHA-256 hashes.
- [`crustdata-repos/`](crustdata-repos/): Git submodules for all eight original public repositories listed by the CrustData GitHub organization. Each submodule points to its upstream and retains the full history and tags. This includes the agent examples in `tools` and the API/plugin/sample repositories.
- [`scripts/sync-crustdata-docs.mjs`](scripts/sync-crustdata-docs.mjs): refreshes the Markdown/OpenAPI documentation snapshot from CrustData's official `llms.txt` index.
- [`../steering.md`](../steering.md): binding project guidance; CrustData is a strict core requirement.

The organization lists one additional public repository, `dify-plugins`, which is a 1.56 GB fork of Dify's general plugin catalog. It has no CrustData-specific paths, so it is excluded as upstream material rather than CrustData documentation or samples.

The docs snapshot is current only as of its `manifest.json` timestamp. Refresh it with `node .codex/scripts/sync-crustdata-docs.mjs`. Update a source repository with `git -C .codex/crustdata-repos/<repo> pull --ff-only` and commit the changed submodule pointer. Clone this project with `--recurse-submodules` to populate the upstream source directories.
