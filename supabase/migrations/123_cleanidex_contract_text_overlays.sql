-- Fixed text fields drawn onto PDF at owner-sign step (positions normalized 0–1, web top-left origin).

ALTER TABLE cleanidex.contracts
  ADD COLUMN IF NOT EXISTS text_overlays JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN cleanidex.contracts.text_overlays IS 'Array of { id, pageIndex, x, y, width, height, content, fontSizePt?, align? } — applied before owner signature image';
