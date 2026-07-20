import type { MessageShape } from "../../types";
import { common as vi } from "../vi/common";

export const common = {
  "common.save": "Save",
  "common.saving": "Saving...",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.archive": "Archive",
  "common.restore": "Restore",
  "common.view": "View",
  "common.download": "Download",
  "common.downloadShort": "Download",
  "common.edit": "Edit",
  "common.processing": "Processing...",
  "common.untitled": "Untitled",
  "common.language": "Language",
  "common.language.vi": "Tiếng Việt",
  "common.language.en": "English",
  "common.user.profile": "Profile",
  "common.user.avatar": "Upload avatar",
  "common.user.signature": "Signature settings",
  "common.user.settings": "Settings",
  "common.user.logout": "Sign out",
} satisfies MessageShape<typeof vi>;
