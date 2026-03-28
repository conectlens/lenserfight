# Deploy a Project

Use this guide when you need to ship LenserFight apps, docs, or supporting services to a target environment.

## Before you deploy

- Build the affected app or package.
- Confirm the target environment variables are set.
- Review any database migrations or schema changes.
- Decide how you will verify the deployment and roll it back.

## Deployment flow

1. Build the target project with the smallest relevant Nx command.
2. Check the generated output for missing assets or obvious warnings.
3. Apply database or Supabase migrations if the release includes schema work.
4. Deploy the build artifacts to the target environment.
5. Run a smoke test against the public surface and the authenticated surface.
6. Record the deployment status and rollback instructions.

## Validation

- Verify the docs site loads and the sidebar still resolves correctly.
- Verify the app can reach its configured API and database endpoints.
- Verify any new environment variables are present in the target runtime.

## Related

- [Development Setup](/contributing/development-setup)
- [Database Local Setup](/database/local-setup)
- [Configuration](/reference/configuration)
- [Release Process](/contributing/release-process)
