"use client";

import dynamic from "next/dynamic";
import type { InvitationData } from "@/features/invitation/shared";

// Each template is its own code chunk: a page downloads only the template it shows (a guest
// opening a Petal invitation doesn't load Royal, Lotus and Olive). Still rendered on the server.
const LotusInvitation = dynamic(() => import("@/features/invitation/templates/lotus/LotusInvitation").then((m) => m.LotusInvitation));
const OliveInvitation = dynamic(() => import("@/features/invitation/templates/olive/OliveInvitation").then((m) => m.OliveInvitation));
const PetalInvitation = dynamic(() => import("@/features/invitation/templates/petal/PetalInvitation").then((m) => m.PetalInvitation));
const RoyalInvitation = dynamic(() => import("@/features/invitation/templates/royal/RoyalInvitation").then((m) => m.RoyalInvitation));

/** Picks the template renderer; anything unknown (e.g. a removed template) shows as Royal gold. */
export function InvitationView({
  data,
  heroClassName = "min-h-svh",
  autoPlayOnTap = false,
  idPrefix,
  thumbnail = false,
}: {
  data: InvitationData;
  heroClassName?: string;
  autoPlayOnTap?: boolean;
  /** Section id prefix for templates with anchors */
  idPrefix?: string;
  /** Small gallery thumbnail: hide floating controls (menus, docks, petals) */
  thumbnail?: boolean;
}) {
  // autoPlayOnTap is only set on the public page, which is also where the cover-first opening applies
  switch (data.template) {
    case "olive":
      return <OliveInvitation data={data} autoPlayOnTap={autoPlayOnTap} idPrefix={idPrefix} gate={autoPlayOnTap} />;
    case "lotus":
      return <LotusInvitation data={data} autoPlayOnTap={autoPlayOnTap} idPrefix={idPrefix} gate={autoPlayOnTap} thumbnail={thumbnail} />;
    case "petal":
      return <PetalInvitation data={data} autoPlayOnTap={autoPlayOnTap} idPrefix={idPrefix} heroClassName={heroClassName} thumbnail={thumbnail} />;
    default:
      return <RoyalInvitation data={data} autoPlayOnTap={autoPlayOnTap} idPrefix={idPrefix} gate={autoPlayOnTap} thumbnail={thumbnail} />;
  }
}
