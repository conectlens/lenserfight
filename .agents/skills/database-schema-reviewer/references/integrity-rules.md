Database integrity checks.

Verify:

- every table has a primary key
- foreign keys enforce domain relationships
- unique constraints prevent duplicates
- NOT NULL protects required data

Relationship checks

Ensure:

- FK columns reference correct parent tables
- cascade rules are intentional
- orphan records cannot appear
- many-to-many relations use proper junction tables

Watch for:

- nullable foreign keys that should be required
- missing constraints on critical entities
- inconsistent naming across relations
- duplicate relationship paths