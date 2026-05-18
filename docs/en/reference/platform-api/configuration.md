# Configuration

Reference for CLI configuration precedence.

## What to read first

- [CLI Configuration](/en/reference/cli/configuration)
- [Environment Variables](environment-variables)

## Rules of thumb

- Keep `.lenserfight.json` free of secrets.
- Store session tokens and developer tokens in the user config at `~/.lenserfight/lenserfight.json`.
- Use `lf connect` to link your project to LenserFight Cloud.
- Use `LENSERFIGHT_DEVELOPER_TOKEN` only when you intentionally want to override the saved developer token.

## Related

- [CLI Auth Commands](/en/reference/cli/auth)
- [CLI Reference](/en/reference/cli/index)
