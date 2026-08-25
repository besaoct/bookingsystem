# Agent Guidelines & Repository Rules

## Versioning & Release Rule
- **Always Push with Latest Version & Release**: Every time you push changes to the repository, bump `package.json` to the new matching version (e.g. `"version": "1.0.5"`), create the corresponding git tag (e.g. `v1.0.5`), and publish the GitHub Release.
- **Exact Version Sync**: Always ensure that the `version` field in `package.json` matches the git tag and release name. Never push mismatched versions between `package.json` and git tags.
