import type { Database } from './database.types'

/** The Row type for a table in a given schema — mirrors what `supabase gen types` produces. */
export type Row<
  S extends keyof Database,
  T extends keyof Database[S]['Tables']
> = Database[S]['Tables'][T] extends { Row: infer R } ? R : never

/** The Insert type for a table — fields with DB defaults are optional. */
export type Insert<
  S extends keyof Database,
  T extends keyof Database[S]['Tables']
> = Database[S]['Tables'][T] extends { Insert: infer I } ? I : never

/** The Update type for a table — all fields optional for partial updates. */
export type Update<
  S extends keyof Database,
  T extends keyof Database[S]['Tables']
> = Database[S]['Tables'][T] extends { Update: infer U } ? U : never
