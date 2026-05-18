Database security rules.

Review database security configuration.

Tenant isolation

Verify:

- API-layer guards enforce tenant/workspace scoping on all queries
- repository methods always filter by account_id or workspace_id
- no cross-tenant data leakage is possible through raw SQL queries

Sensitive data protection

Ensure:

- secrets and tokens are never stored in plaintext
- PII fields have proper access restrictions
- audit-critical tables restrict modification

Privilege checks

Verify:

- only required database roles have write access
- admin operations require elevated roles
- service accounts are narrowly scoped

Watch for:

- missing tenant filters in repository queries
- raw SQL without account_id scoping
- mismatched application auth and database access patterns
