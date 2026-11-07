"use client";

import { LotusInvitation } from "@/features/invitation/templates/lotus/LotusInvitation";
import { OliveInvitation } from "@/features/invitation/templates/olive/OliveInvitation";
import { PetalInvitation } from "@/features/invitation/templates/petal/PetalInvitation";
import { RoyalInvitation } from "@/features/invitation/templates/royal/RoyalInvitation";
import type { InvitationData } from "@/features/invitation/shared";

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
