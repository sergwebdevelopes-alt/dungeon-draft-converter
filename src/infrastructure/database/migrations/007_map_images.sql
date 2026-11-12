ALTER TABLE maps ADD COLUMN images jsonb NOT NULL DEFAULT '[]';

UPDATE maps
SET images = jsonb_build_array(
  jsonb_build_object(
    'url', image_url,
    'width', image_width,
    'height', image_height,
    'mediaId', image_media_id
  )
);
