-- Repair approval notifications that were persisted from mojibake source
-- literals. Restrict the update to the known notification type and exact
-- phrases so correctly encoded tenant content is never transformed.
UPDATE notifications
SET title = convert_from(convert_to(title, 'WIN1252'), 'UTF8')
WHERE type = 'approval_request'
  -- Mojibake "YÃ..." starts with UTF-8 bytes 59 c3 83. The hex guard
  -- avoids evaluating WIN1252 conversion for correctly encoded Vietnamese.
  AND encode(convert_to(title, 'UTF8'), 'hex') LIKE '59c383%';

UPDATE notifications
SET message = convert_from(convert_to(message, 'WIN1252'), 'UTF8')
WHERE type = 'approval_request'
  -- Mojibake "TÃ..." starts with UTF-8 bytes 54 c3 83.
  AND encode(convert_to(message, 'UTF8'), 'hex') LIKE '54c383%';
