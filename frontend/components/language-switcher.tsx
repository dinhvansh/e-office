"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { Locale } from "@/i18n";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Languages className="mr-2 h-4 w-4" />
        <span>{t("common.language")}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup value={locale} onValueChange={(value) => setLocale(value as Locale)}>
          <DropdownMenuRadioItem value="vi">{t("common.language.vi")}</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="en">{t("common.language.en")}</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
