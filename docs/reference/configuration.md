# Configuration

Reference for CLI and auth configuration precedence.

## What to read first

- [CLI Configuration](../cli/configuration.md)
- [Environment Variables](environment-variables.md)

## Rules of thumb

- Keep `.lenserfight.json` free of secrets.
- Store session tokens and developer tokens in the user config at `~/.lenserfight/config.json`.
- Use `LENSERFIGHT_AUTH_BASE_URL` when the auth app runs on a separate host.
- Use `LENSERFIGHT_DEVELOPER_TOKEN` only when you intentionally want to override the saved developer token.

## Related

- [CLI Auth Commands](../cli/auth.md)
- [CLI Reference](cli.md)
