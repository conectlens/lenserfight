-- Add 'followers' value to visibility enums used by lenses and lensers.
-- This allows content and profiles to be visible only to approved followers.

ALTER TYPE content.visibility_enum ADD VALUE IF NOT EXISTS 'followers';
ALTER TYPE lensers.lenser_visibility ADD VALUE IF NOT EXISTS 'followers';
