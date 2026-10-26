import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { SplitHeadline } from "@/components/motion/SplitHeadline";

export const metadata: Metadata = {
  title: "Davidson Blessons — a Bible journey you'll want to take every day",
  description:
    "Read Scripture as a journey: bite-size lessons, games, memory verses, gentle streaks and a hand-drawn pilgrim who grows with you. No account needed.",
};

const FEATURES: ReadonlyArray<{ title: string; body: string; art: string }> = [
  {
    title: "Walk the trail",
    body: "Every book is a journey and every chapter a stop. Your pilgrim walks the path with you and grows from a young traveller into a wise elder as you level up.",
    art: "/art/hero.webp",
  },
  {
    title: "Lessons, not homework",
    body: "Read a few verses, then play: finish the verse, fill the blank, put it in order, match the words. Earn up to three stars at every stop.",
    art: "/art/gospels.webp",
  },
  {
    title: "Games that teach",
    body: "Trivia, who-said-it, memory match, book-order puzzles and a 60-second lightning round — over 200 questions, every one checked against the text.",
    art: "/art/wisdom.webp",
  },
  {
    title: "Hide it in your heart",
    body: "Save any verse and practise it with spaced review — scramble, fill-in and first-letter recall bring it back just before you'd forget.",
    art: "/art/letters.webp",
  },
];

const PROMISES: ReadonlyArray<{ title: string; body: string }> = [
  { title: "Encourage, never punish", body: "One rest day a week never breaks your streak, and reading a paper Bible counts too." },
  { title: "Six translations", body: "BSB, NIV, KJV, WEB, ASV and LSV — switch any time, with your highlights following you." },
  { title: "Private by design", body: "No account needed and no tracking. Sign in only if you want your progress on every device." },
];

const STAGES = [1, 2, 3, 4];
const BADGES = ["first-light", "kindled", "steadfast", "gospel-reader", "hidden-heart", "trailblazer"];

export default function WelcomePage(): ReactNode {
  return (
    <div className="ws-stack sales">
      <section className="sales__hero">
        <span className="ws-muted">Davidson Blessons — Bible study, reimagined as a journey</span>
        <SplitHeadline lines={["Open the Word.", "Walk the road."]} />
        <p className="sales__lede">
          Davidson Blessons turns daily Bible reading into a gentle, hand-drawn adventure — lessons, games and a pilgrim who walks every step with
          you.
        </p>
        <div className="ws-pills">
          <Link href="/map" className="ws-pill ws-pill--primary">
            Start your journey →
          </Link>
          <Link href="/play" className="ws-pill">
            Try a game
          </Link>
        </div>
      </section>

      <Reveal className="sales__pilgrims" stagger={0.12}>
        {STAGES.map((stage) => (
          <Image key={stage} src={`/pilgrim/stage-${stage}.webp`} alt="" width={120} height={240} className="sales__pilgrim" />
        ))}
      </Reveal>
      <p className="ws-muted" style={{ textAlign: "center", margin: "-30px 0 0" }}>
        Your pilgrim grows with you — from first steps to a lifetime on the road.
      </p>

      <Reveal className="ws-grid sales__features" stagger={0.08}>
        {FEATURES.map((feature) => (
          <div key={feature.title} className="ws-card">
            <div className="ws-card__media">
              <Image src={feature.art} alt="" width={1200} height={800} sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 380px" />
            </div>
            <div className="ws-card__meta">
              <span className="ws-heading">{feature.title}</span>
              <span className="ws-muted">{feature.body}</span>
            </div>
          </div>
        ))}
      </Reveal>

      <section className="sales__band">
        <h2 className="ws-heading" style={{ textAlign: "center" }}>
          Celebrate the small faithful steps
        </h2>
        <div className="sales__badges">
          {BADGES.map((badge) => (
            <Image key={badge} src={`/badges/${badge}.webp`} alt="" width={160} height={160} />
          ))}
        </div>
        <p className="ws-muted" style={{ textAlign: "center", margin: 0 }}>
          Streaks, stars, badges and an oil lamp that glows brighter the longer you walk.
        </p>
      </section>

      <Reveal className="sales__promises" stagger={0.08}>
        {PROMISES.map((promise) => (
          <div key={promise.title} className="tile">
            <span className="ws-label">{promise.title}</span>
            <span className="ws-muted">{promise.body}</span>
          </div>
        ))}
      </Reveal>

      <section className="sales__cta">
        <h2 className="ws-display" style={{ fontSize: "clamp(40px, 7vw, 72px)" }}>
          Be still, and read.
        </h2>
        <p className="ws-muted" style={{ margin: 0 }}>
          No sign-up. Open it and take your first step today.
        </p>
        <div className="ws-pills">
          <Link href="/map" className="ws-pill ws-pill--primary">
            Begin at John 1 →
          </Link>
        </div>
      </section>
    </div>
  );
}
