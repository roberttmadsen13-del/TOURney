-- Add image_data_2 and image_data_3 to platform_bugs for multi-screenshot bug reports
ALTER TABLE platform_bugs ADD COLUMN IF NOT EXISTS image_data_2 TEXT;
ALTER TABLE platform_bugs ADD COLUMN IF NOT EXISTS image_data_3 TEXT;
