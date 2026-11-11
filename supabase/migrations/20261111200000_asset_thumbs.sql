-- A small preview the browser makes when someone picks a photo or video, kept as a data URL (WebP, or JPEG
-- where the browser can't write WebP). The pattern keeps anything else out, such as SVG, which can carry script.
-- shortcut: thumbnails live in the row (at most ~100 KB each); move them to Storage if that ever weighs on the database.
alter table assets add column thumb text
  check (thumb is null or (length(thumb) <= 100000 and thumb ~ '^data:image/(webp|jpeg);base64,[A-Za-z0-9+/=]+$'));
