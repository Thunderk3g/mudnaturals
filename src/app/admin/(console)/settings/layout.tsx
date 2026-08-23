import type { ReactNode } from "react";
import { PageHeader } from "../../ui";
import { SettingsTabs } from "./tabs";

/**
 * One header and one set of tabs for all four settings screens, so the operator
 * sees a single place called "Menu & site text" rather than four unrelated
 * pages that happen to be settings.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PageHeader title="Menu & site text" meta="Wording and settings that apply to every page" />
      <SettingsTabs />
      {children}
    </>
  );
}
