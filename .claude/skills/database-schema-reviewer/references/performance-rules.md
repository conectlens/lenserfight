Schema performance checks.

Look for:

- missing indexes on foreign keys
- frequently filtered columns without indexes
- wide tables storing large JSON data
- large joins without optimization

Prefer:

- indexes on FK columns
- composite indexes for common queries
- normalized structures for large datasets