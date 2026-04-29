-- Deduplicate existing photo zones and prevent future duplicates per site.

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY company_id, site_id, lower(btrim(name))
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM cleanidex.photo_zones
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM cleanidex.photo_zones pz
USING to_delete d
WHERE pz.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_cleanidex_photo_zones_site_name_norm
ON cleanidex.photo_zones (company_id, site_id, lower(btrim(name)));
