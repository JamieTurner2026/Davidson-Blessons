"use client";

import Image from "next/image";
import type { ReactNode } from "react";

import { CONFETTI_SETS } from "@/components/motion/Celebrations";
import { Lamp } from "@/components/motion/Lamp";
import { Reveal } from "@/components/motion/Reveal";
import { COSMETICS, SLOT_LABELS, type Cosmetic, type CosmeticSlot } from "@/data/cosmetics";
import { originOf } from "@/lib/celebrations";
import { levelFor, pilgrimStage } from "@/lib/game";
import { buyCosmetic, equipCosmetic, equippedItem, useStudy } from "@/lib/study-store";

const SLOTS: CosmeticSlot[] = ["lamp", "confetti", "paper", "companion"];

function ConfettiPreview({ id }: { id: string }): ReactNode {
  const shapes = CONFETTI_SETS[id] ?? [];
  return (
    <span className="workshop__glyphs">
      {shapes.slice(0, 3).map((shape, index) => (
        <svg key={index} width="30" height="30" viewBox="0 0 20 20" aria-hidden="true" style={{ rotate: `${(index - 1) * 18}deg` }}>
          <path
            d={shape}
            fill={index === 1 ? "var(--ws-accent)" : "none"}
            stroke="var(--ws-fg)"
            strokeWidth={index === 1 ? 1 : 1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ))}
    </span>
  );
}

function Preview({ item, stage }: { item: Cosmetic; stage: number }): ReactNode {
  switch (item.slot) {
    case "lamp":
      return <Lamp lit glow={0.6} size={84} variant={item.id} />;
    case "confetti":
      return <ConfettiPreview id={item.id} />;
    case "paper":
      return (
        <div className="scripture workshop__paper" data-paper={item.id}>
          In the beginning was the Word.
        </div>
      );
    case "companion":
      return (
        <div className="workshop__companion">
          <Image src={`/pilgrim/stage-${stage}.webp`} alt="" width={40} height={80} style={{ height: 80, width: "auto" }} />
          {item.id === "companion-lamb" && <Image src="/pilgrim/lamb.webp" alt="" width={40} height={44} style={{ height: 40, width: "auto" }} />}
          {item.id === "companion-dove" && <Image src="/pilgrim/dove.webp" alt="" width={40} height={36} style={{ height: 32, width: "auto", alignSelf: "flex-start" }} />}
        </div>
      );
    default:
      return null;
  }
}

/** Spend oil on lamps, celebrations, reading paper and companions. */
export function WorkshopClient(): ReactNode {
  const { oil, owned, equipped, xp } = useStudy();
  const stage = pilgrimStage(levelFor(xp).index) + 1;

  return (
    <Reveal className="ws-stack" style={{ paddingBlock: 0, gap: 48 }}>
      <p className="ws-muted" style={{ margin: 0, textAlign: "center" }}>
        You have <strong style={{ color: "var(--ws-fg)" }}>{oil} oil</strong>. Earn it by reading (1 per 5 XP), stars (3 each) and treasure verses.
      </p>
      {SLOTS.map((slot) => (
        <section key={slot} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <h2 className="ws-heading">{SLOT_LABELS[slot]}</h2>
          <div className="workshop__grid">
            {COSMETICS.filter((item) => item.slot === slot).map((item) => {
              const isOwned = item.price === 0 || owned.includes(item.id);
              const isEquipped = equippedItem(equipped, slot) === item.id;
              const affordable = oil >= item.price;
              return (
                <div key={item.id} className={`workshop__item ${isEquipped ? "is-equipped" : ""}`}>
                  <div className="workshop__preview">
                    <Preview item={item} stage={stage} />
                  </div>
                  <span className="ws-label">{item.name}</span>
                  <span className="ws-muted">{item.blurb}</span>
                  {isEquipped ? (
                    <span className="ws-pill ws-pill--sm is-active" style={{ cursor: "default" }}>
                      Equipped
                    </span>
                  ) : isOwned ? (
                    <button type="button" className="ws-pill ws-pill--sm" onClick={() => equipCosmetic(item.id)}>
                      Equip
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ws-pill ws-pill--sm"
                      disabled={!affordable}
                      title={affordable ? undefined : `You need ${item.price - oil} more oil`}
                      onClick={(event) => buyCosmetic(item.id, originOf(event.currentTarget))}
                    >
                      {affordable ? `Buy · ${item.price} oil` : `${item.price} oil`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </Reveal>
  );
}
