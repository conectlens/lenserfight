# Schema: tenancy

The `tenancy` schema provides the workspace tenant boundary for multi-tenant isolation. Every lenser belongs to at least one workspace (their auto-created personal workspace), and organizations map to organization-type workspaces.

## Tables

### workspaces

Top-level tenant container. Media, keys, and other workspace-scoped resources reference this table.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `slug` | text UNIQUE NOT NULL | URL-safe identifier, 3-64 chars, lowercase alphanumeric with hyphens/underscores |
| `type` | text NOT NULL | `personal` or `organization` |
| `display_name` | text NOT NULL | Display name |
| `owner_lenser_id` | uuid | FK -> `lensers.profiles(id)`. NULL if org-owned. |
| `org_id` | uuid | FK -> `organizations.organizations(id)`. Set for organization-type workspaces. |
| `status` | text DEFAULT 'active' | `active`, `suspended`, `archived` |
| `metadata` | jsonb DEFAULT '{}' | Extensible metadata |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | Auto-updated via trigger |

### workspace_members

Join table linking lensers to workspaces with a role.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `workspace_id` | uuid NOT NULL | FK -> `tenancy.workspaces(id)` CASCADE |
| `lenser_id` | uuid NOT NULL | FK -> `lensers.profiles(id)` CASCADE |
| `role` | text DEFAULT 'member' | `owner`, `admin`, `member`, `viewer` |
| `invited_by` | uuid | FK -> `lensers.profiles(id)`. NULL for auto-created memberships. |
| `joined_at` | timestamptz DEFAULT now() | |

**Unique constraint:** `(workspace_id, lenser_id)` — one membership per lenser per workspace

## Workspace types

**Personal:** Auto-created when a lenser profile is inserted. The lenser's `handle` becomes the workspace `slug`. The lenser is the sole `owner`.

**Organization:** Created when an organization is formed. Maps `org_id` to `organizations.organizations(id)`. Existing org members are backfilled as workspace members.

## Auto-creation trigger

```sql
-- AFTER INSERT on lensers.profiles
-- Creates personal workspace + inserts owner membership
CREATE TRIGGER trg_profiles_create_personal_workspace
    AFTER INSERT ON lensers.profiles
    FOR EACH ROW EXECUTE FUNCTION tenancy.fn_create_personal_workspace();
```

## Helper functions

| Function | Returns | Purpose |
|----------|---------|---------|
| `tenancy.is_workspace_member(workspace_id)` | boolean | Checks if current auth user is a member |
| `tenancy.is_workspace_admin(workspace_id)` | boolean | Checks if current auth user is admin or owner |

Both are `SECURITY DEFINER` functions used in RLS policies.

## RLS summary

**workspaces:** Members can read their own workspaces. Admin/owner can update. Authenticated users can create workspaces they own.

**workspace_members:** Members can see co-members. Admin/owner can add and remove members.
