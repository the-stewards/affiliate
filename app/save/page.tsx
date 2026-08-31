import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add to Calendar — Rebel Event 2027: The Reveal",
  description: "Save Rebel Event 2027: The Reveal to your calendar — live on YouTube, Oct 21, 2026.",
};

const GOOGLE_URL =
  "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Rebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube&dates=20261021T160000Z/20261021T170000Z&details=Rebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%0A%0AJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%2C%20unveil%20our%20new%20venue%2C%20announce%20this%20year's%20speaker%20lineup%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%0A%0AAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%2C%20you'll%20want%20to%20watch%20live.%0A%0AVIP%20tickets%20are%20extremely%20limited%2C%20first%20come%2C%20first%20served%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%0A%0ANew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%0A%0AWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%0A%0ANow%20it's%20time%20to%20show%20you.%0A%0AWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&location=https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg";

const OUTLOOK_URL =
  "https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&subject=Rebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube&startdt=2026-10-21T16%3A00%3A00Z&enddt=2026-10-21T17%3A00%3A00Z&body=Rebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%0A%0AJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%2C%20unveil%20our%20new%20venue%2C%20announce%20this%20year's%20speaker%20lineup%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%0A%0AAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%2C%20you'll%20want%20to%20watch%20live.%0A%0AVIP%20tickets%20are%20extremely%20limited%2C%20first%20come%2C%20first%20served%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%0A%0ANew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%0A%0AWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%0A%0ANow%20it's%20time%20to%20show%20you.%0A%0AWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&location=https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg&allday=false";

const ICS_HREF =
  "data:text/calendar;charset=utf-8,BEGIN%3AVCALENDAR%0D%0AVERSION%3A2.0%0D%0APRODID%3A-%2F%2FRebel%2F%2FAdd%20to%20Calendar%2F%2FEN%0D%0ACALSCALE%3AGREGORIAN%0D%0AMETHOD%3APUBLISH%0D%0ABEGIN%3AVEVENT%0D%0AUID%3Arebel2027-reveal-20261021%40therebelevent.com%0D%0ADTSTAMP%3A20260829T000000Z%0D%0ADTSTART%3A20261021T160000Z%0D%0ADTEND%3A20261021T170000Z%0D%0ASUMMARY%3ARebel%20Event%202027%3A%20The%20Reveal%20%E2%80%94%20Live%20on%20YouTube%0D%0ADESCRIPTION%3ARebel%20is%20coming%20back.%20But%20almost%20everything%20else%20is%20changing.%5Cn%5CnJoin%20us%20live%20as%20we%20reveal%20the%20Rebel%202027%20dates%5C%2C%20unveil%20our%20new%20venue%5C%2C%20announce%20this%20year's%20speaker%20lineup%5C%2C%20and%20give%20you%20the%20first%20look%20at%20what%20we're%20building%20for%20the%20next%20Rebel%20experience.%5Cn%5CnAnd%20if%20you%20already%20know%20you%20want%20to%20be%20in%20the%20room%5C%2C%20you'll%20want%20to%20watch%20live.%5Cn%5CnVIP%20tickets%20are%20extremely%20limited%5C%2C%20first%20come%5C%2C%20first%20served%5C%2C%20and%20those%20watching%20The%20Reveal%20will%20be%20the%20first%20to%20get%20access.%5Cn%5CnNew%20dates.%20New%20venue.%20New%20speakers.%20A%20bigger%20Rebel.%5Cn%5CnWe've%20been%20building%20this%20since%20we%20stepped%20off%20stage%20last%20year.%5Cn%5CnNow%20it's%20time%20to%20show%20you.%5Cn%5CnWatch%20live%3A%20https%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0ALOCATION%3Ahttps%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0AURL%3Ahttps%3A%2F%2Fwww.youtube.com%2Flive%2FfyzxZiC-XLg%0D%0ABEGIN%3AVALARM%0D%0AACTION%3ADISPLAY%0D%0ADESCRIPTION%3AReminder%0D%0ATRIGGER%3A-PT30M%0D%0AEND%3AVALARM%0D%0AEND%3AVEVENT%0D%0AEND%3AVCALENDAR%0D%0A";

export default function SavePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--ink)",
      }}
    >
      <div className="rebel-atc">
        <div className="rebel-atc__mark"></div>

        <div className="rebel-atc__card">
          <div className="rebel-atc__eyebrow">What you are saving</div>
          <div className="rebel-atc__title">Rebel Event 2027: The Reveal &mdash; Live on YouTube</div>

          <div className="rebel-atc__grid">
            <div className="rebel-atc__field">
              <div className="rebel-atc__label">Date</div>
              <div className="rebel-atc__value">Wednesday, October 21, 2026</div>
            </div>
            <div className="rebel-atc__field">
              <div className="rebel-atc__label">Time</div>
              <div className="rebel-atc__value">12:00 &ndash; 1:00 PM ET</div>
            </div>
            <div className="rebel-atc__field">
              <div className="rebel-atc__label">Location</div>
              <div className="rebel-atc__value">
                <a
                  className="rebel-atc__link"
                  href="https://www.youtube.com/live/fyzxZiC-XLg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Live on YouTube
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="rebel-atc__heading">Pick your calendar and save now</div>
        <p className="rebel-atc__sub">Takes ten seconds. Miss the stream, miss VIP access.</p>

        <div className="rebel-atc__buttons">
          <a className="rebel-atc__btn rebel-atc__btn--google" href={GOOGLE_URL} target="_blank" rel="noopener noreferrer">
            Google Calendar
          </a>

          <a className="rebel-atc__btn rebel-atc__btn--apple" download="rebel-2027-the-reveal.ics" href={ICS_HREF}>
            Apple Calendar
          </a>

          <a className="rebel-atc__btn rebel-atc__btn--outlook" href={OUTLOOK_URL} target="_blank" rel="noopener noreferrer">
            Outlook
          </a>
        </div>

        <p className="rebel-atc__fallback">
          Not signed into Outlook?{" "}
          <a href={ICS_HREF} download="rebel-2027-the-reveal.ics">
            Download the invite instead
          </a>
          .
        </p>

        <p className="rebel-atc__quote">
          VIP access goes to whoever's actually in the room when we open it &mdash; get this on your calendar now, not &ldquo;later.&rdquo;
        </p>
      </div>

      <style
        // dangerouslySetInnerHTML, not the usual `<style>{...}</style>` children
        // pattern - this CSS has literal quote characters (font-family lists),
        // and <style> is a RAWTEXT element the browser never entity-decodes, so
        // React's normal text-child escaping (which turns a quote into &#x27;
        // in the server HTML) causes a hydration mismatch as soon as any quote
        // is present. Setting innerHTML directly sidesteps that entirely.
        dangerouslySetInnerHTML={{
          __html: `
        .rebel-atc {
          --atc-cream: #fbf3e3;
          --atc-ink: #1a1512;
          --atc-border: rgba(26, 21, 18, 0.55);
          --atc-orange: #ff4500;
          --atc-orange-text: #cc3300;
          --atc-dark: #211c17;
          --atc-slate: #6f685f;
          --atc-muted-blue: #536c7e;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif;
          max-width: 560px;
          width: 100%;
          box-sizing: border-box;
          background: var(--atc-cream);
          padding: 20px;
          border-radius: 4px;
        }
        .rebel-atc, .rebel-atc *, .rebel-atc *::before, .rebel-atc *::after {
          box-sizing: border-box;
        }

        .rebel-atc__mark { width: 40px; height: 3px; background: var(--atc-orange); margin: 0 0 14px; }

        .rebel-atc__card {
          border: 1.5px solid var(--atc-border);
          border-radius: 6px;
          padding: 22px;
          margin-bottom: 24px;
        }
        .rebel-atc__eyebrow {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--atc-orange-text);
          margin-bottom: 10px;
        }
        .rebel-atc__title {
          font-family: 'Arial Narrow', 'Helvetica Neue Condensed', Arial, sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.01em;
          font-size: 21px;
          line-height: 1.25;
          color: var(--atc-ink);
          margin-bottom: 20px;
        }

        .rebel-atc__grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px 20px;
        }
        .rebel-atc__label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--atc-slate);
          margin-bottom: 6px;
        }
        .rebel-atc__value {
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 16px;
          color: var(--atc-ink);
        }
        .rebel-atc__link { color: var(--atc-ink); text-decoration: underline; text-underline-offset: 2px; }
        .rebel-atc__link:hover { color: var(--atc-orange-text); }

        .rebel-atc__heading {
          font-family: 'Arial Narrow', 'Helvetica Neue Condensed', Arial, sans-serif;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 15px;
          color: var(--atc-ink);
          margin: 0 0 6px;
        }
        .rebel-atc__sub {
          font-size: 13.5px;
          color: var(--atc-muted-blue);
          margin: 0 0 16px;
        }

        .rebel-atc__buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
        .rebel-atc__btn {
          flex: 1 1 150px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          text-decoration: none;
          padding: 14px 12px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #ffffff;
          transition: filter 0.15s ease;
          white-space: nowrap;
        }
        .rebel-atc__btn:hover { filter: brightness(1.12); }
        .rebel-atc__btn--google { background: var(--atc-orange); color: var(--atc-ink); }
        .rebel-atc__btn--apple,
        .rebel-atc__btn--outlook { background: var(--atc-dark); }

        .rebel-atc__fallback {
          font-size: 12px;
          color: var(--atc-slate);
          margin: 0 0 16px;
        }
        .rebel-atc__fallback a { color: var(--atc-slate); text-decoration: underline; text-underline-offset: 2px; }
        .rebel-atc__fallback a:hover { color: var(--atc-orange-text); }

        .rebel-atc__quote {
          font-family: Georgia, 'Times New Roman', serif;
          font-style: italic;
          font-size: 14.5px;
          line-height: 1.55;
          color: var(--atc-muted-blue);
          margin: 0;
        }

        @media (max-width: 360px) {
          .rebel-atc__btn { flex: 1 1 100%; }
          .rebel-atc__title { font-size: 19px; }
        }
      `,
        }}
      />
    </main>
  );
}
