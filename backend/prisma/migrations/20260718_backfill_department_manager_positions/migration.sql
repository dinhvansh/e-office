-- Preserve access for current department managers only. This does not grant
-- leadership access by itself: runtime policy also requires an active explicit
-- manager/support assignment for the same department.
UPDATE "positions" AS p
SET "can_manage_department" = true
WHERE p."can_manage_department" = false
  AND EXISTS (
    SELECT 1
    FROM "departments" AS d
    JOIN "users" AS u ON u."id" = d."manager_id"
    WHERE u."position_id" = p."id"
      AND u."tenant_id" = p."tenant_id"
      AND u."status" = 'active'
      AND d."tenant_id" = p."tenant_id"
  );
