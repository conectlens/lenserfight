-- =============================================================================
-- 7. STORE PRODUCTS (LemonSqueezy credit packs)
-- Platform-specific: only runs if billing schema exists.
-- id = LemonSqueezy product/variant ID used for checkout.
-- =============================================================================

DO $$
BEGIN

IF EXISTS (
    SELECT 1 FROM information_schema.schemata WHERE schema_name = 'billing'
) THEN

    CREATE TABLE IF NOT EXISTS billing.store_products (
        id                text        PRIMARY KEY,
        name              text        NOT NULL,
        slug              text        NOT NULL UNIQUE,
        description       text        NOT NULL DEFAULT '',
        thumb_url         text,
        large_thumb_url   text,
        price             integer     NOT NULL,
        price_formatted   text        NOT NULL,
        pay_what_you_want boolean     NOT NULL DEFAULT false,
        test_mode         boolean     NOT NULL DEFAULT false,
        is_active         boolean     NOT NULL DEFAULT true,
        created_at        timestamptz NOT NULL DEFAULT now(),
        updated_at        timestamptz NOT NULL DEFAULT now()
    );

    INSERT INTO billing.store_products (
        id, name, slug, description, price, price_formatted, pay_what_you_want, test_mode
    )
    VALUES
        ('905584', 'LenserFight Tokens',    'lenserfight-tokens',   '<p>10,000 credits</p>',   999,  '$9.99',  false, true),
        ('905600', 'LenserFight Tokens #2', 'lenserfight-tokens-2', '<p>25,000 credits</p>',  2499, '$24.99',  false, true),
        ('905604', 'LenserFight Tokens #3', 'lenserfight-tokens-3', '<p>50,000 credits</p>',  4999, '$49.99',  false, true),
        ('905606', 'LenserFight Tokens #4', 'lenserfight-tokens-4', '<p>100,000 credits</p>', 9999, '$99.99',  false, true)
    ON CONFLICT (id) DO UPDATE
    SET
        name              = EXCLUDED.name,
        slug              = EXCLUDED.slug,
        description       = EXCLUDED.description,
        price             = EXCLUDED.price,
        price_formatted   = EXCLUDED.price_formatted,
        test_mode         = EXCLUDED.test_mode,
        updated_at        = now();

END IF;  -- end billing schema check

END $$;
