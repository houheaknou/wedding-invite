import { InvitationPage, invitationMetadata } from "./invitation";

type Props = { params: Promise<{ shareId: string }> };

export async function generateMetadata({ params }: Props) {
  return invitationMetadata((await params).shareId);
}

export default async function Page({ params }: Props) {
  return <InvitationPage shareId={(await params).shareId} />;
}
