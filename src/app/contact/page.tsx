import type { Metadata } from "next";
import Link from "next/link";
import { Section, Breadcrumb, Prose, Rule } from "@/components/ui/layout";
import { Button } from "@/components/ui/button";
import { SpecList } from "@/components/ui/spec";
import { copy } from "@/content/copy";
import { storyCopy } from "@/content/story-copy";

export const revalidate = 300;

export const metadata: Metadata = {
  title: copy.nav.contact,
  description: storyCopy.contact.intro,
  alternates: { canonical: "/contact" },
};

/**
 * TO BE FILLED IN BEFORE LAUNCH.
 *
 * Put the real addresses here and the page lights up on its own: the direct
 * routes render, and the form starts posting to the mailbox instead of showing
 * its disconnected notice. Nothing else needs to change.
 *
 *   email:       the published support address, e.g. "hello@<domain>"
 *   whatsappE164: digits only, country code first, no "+", e.g. "9779800000000"
 *
 * Left null deliberately. A placeholder address on screen is a contact route
 * that silently swallows mail, and no phone number or street address is
 * invented anywhere on this site.
 */
const CONTACT: { email: string | null; whatsappE164: string | null } = {
  email: null,
  whatsappE164: null,
};

const FIELD =
  "mt-2 w-full border border-rule-strong bg-surface px-3.5 py-2.5 text-ink " +
  "placeholder:text-ink-3 focus-visible:border-clay";

export default function ContactPage() {
  const hasRoute = Boolean(CONTACT.email || CONTACT.whatsappE164);

  return (
    <>
      <Section tight>
        <Breadcrumb trail={[{ href: "/", label: "Home" }, { label: copy.nav.contact }]} />

        <div className="mt-10 grid grid-cols-1 gap-x-16 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="spec mb-4">{copy.brand.name}</p>
            <h1 className="text-4xl lg:text-5xl">{storyCopy.contact.title}</h1>
          </div>
          <Prose className="lg:col-span-7">
            <p>{storyCopy.contact.intro}</p>
          </Prose>
        </div>
      </Section>

      <Section tight className="pt-0">
        <Rule className="mb-12" />
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <h2 className="text-2xl">{storyCopy.contact.channelsTitle}</h2>

            {hasRoute ? (
              <SpecList
                className="mt-6"
                items={[
                  CONTACT.email
                    ? { label: copy.checkout.email, value: CONTACT.email, href: `mailto:${CONTACT.email}` }
                    : { label: copy.checkout.email, value: null },
                  CONTACT.whatsappE164
                    ? {
                        label: "WhatsApp",
                        value: `+${CONTACT.whatsappE164}`,
                        href: `https://wa.me/${CONTACT.whatsappE164}`,
                      }
                    : { label: "WhatsApp", value: null },
                ]}
              />
            ) : (
              <p className="mt-6 max-w-[48ch] text-ink-2">{storyCopy.contact.channelsPending}</p>
            )}

            <h2 className="mt-12 text-2xl">{storyCopy.contact.addressTitle}</h2>
            <p className="mt-4 max-w-[48ch] text-ink-2">{storyCopy.contact.addressBody}</p>

            <p className="mt-8">
              <Link href="/journal" className="spec text-ink hover:text-clay">
                {copy.journal.title} →
              </Link>
            </p>
          </div>

          <div className="lg:col-span-7">
            <h2 className="text-2xl">{storyCopy.contact.formTitle}</h2>

            {!CONTACT.email ? (
              <p className="spec mt-4 max-w-[52ch] border-l-2 border-clay pl-4 leading-relaxed">
                {storyCopy.contact.formDisconnected}
              </p>
            ) : null}

            {/*
              Plain HTML, no client component, no JavaScript. With an address
              set it hands off to the visitor's mail client; without one it
              still renders, labels correctly and keyboard-navigates.
            */}
            <form
              className="mt-8 max-w-xl"
              method="post"
              action={CONTACT.email ? `mailto:${CONTACT.email}` : undefined}
              encType="text/plain"
            >
              <div className="space-y-6">
                <div>
                  <label htmlFor="contact-name" className="spec">
                    {storyCopy.contact.name}
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="contact-email" className="spec">
                    {storyCopy.contact.email}
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    className={FIELD}
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="spec">
                    {storyCopy.contact.subject}
                  </label>
                  <select id="contact-subject" name="subject" className={FIELD} defaultValue="">
                    <option value="" disabled>
                      —
                    </option>
                    {storyCopy.contact.subjectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="spec">
                    {storyCopy.contact.message}
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={7}
                    required
                    className={`${FIELD} resize-y`}
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Button type="submit" size="lg">
                  {storyCopy.contact.send}
                </Button>
                <p className="spec">
                  {storyCopy.contact.required}: {storyCopy.contact.name}, {storyCopy.contact.email},{" "}
                  {storyCopy.contact.message}
                </p>
              </div>
            </form>
          </div>
        </div>
      </Section>
    </>
  );
}
