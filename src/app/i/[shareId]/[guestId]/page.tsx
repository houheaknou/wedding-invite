import { InvitationPage, invitationMetadata } from "../invitation";

type Props = { params: Promise<{ shareId: string; guestId: string }> };

export async function generateMetadata({ params }: Props) {
  const { shareId, guestId } = await params;
  return invitationMetadata(shareId, guestId);
}

export default async function Page({ params }: Props) {
  const { shareId, guestId } = await params;
  return <InvitationPage shareId={shareId} guestId={guestId} />;
}
