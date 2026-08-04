import { PetView } from "@/components/pet/pet-view";
import { requireUser } from "@/lib/auth/session";
import { getPetOverview } from "@/server/queries/pet";

export const dynamic = "force-dynamic";

export default async function PetPage() {
  const user = await requireUser();
  const overview = await getPetOverview(user.id);

  return <PetView ownerName={user.name} overview={overview} />;
}
