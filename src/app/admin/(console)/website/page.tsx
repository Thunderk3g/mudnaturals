import { redirect } from "next/navigation";

/** The homepage is what anyone means by "the website", so start there. */
export default function WebsiteIndex() {
  redirect("/admin/website/home");
}
