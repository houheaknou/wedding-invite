import bcrypt from "bcryptjs";
import { PrismaClient, type GuestSide, type GuestStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Local demo account; override with SEED_EMAIL / SEED_PASSWORD
const DEMO_EMAIL = process.env.SEED_EMAIL ?? "demo@example.com";
const DEMO_SECRET = process.env.SEED_PASSWORD ?? "demo12345";

const GUESTS: [string, string | null, GuestSide, string, number, GuestStatus][] = [
  ["សុខ ចាន់ថា", "012345678", "GROOM", "គ្រួសារ", 2, "CONFIRMED"],
  ["ចាន់ សុភា", "098765432", "BRIDE", "គ្រួសារ", 4, "CONFIRMED"],
  ["ហេង វណ្ណៈ", "011223344", "GROOM", "មិត្តភក្តិ", 1, "INVITED"],
  ["លី ស្រីនាង", "077889900", "BRIDE", "មិត្តភក្តិ", 2, "INVITED"],
  ["គឹម សុខា", null, "BOTH", "ការងារ", 1, "PENDING"],
  ["Dara Chea", "+85512000111", "GROOM", "Work", 2, "DECLINED"],
  ["Sophea Mao", "+85516000222", "BRIDE", "Friends", 1, "PENDING"],
  ["ពៅ រតនា", "010556677", "BRIDE", "អ្នកជិតខាង", 3, "PENDING"],
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { name: "Demo", email: DEMO_EMAIL, passwordHash: await bcrypt.hash(DEMO_SECRET, 10) },
  });

  // Re-running the seed resets the demo user's events
  await prisma.event.deleteMany({ where: { ownerId: user.id } });
  await prisma.event.create({
    data: {
      ownerId: user.id,
      title: "ពិធីមង្គលការ",
      groomName: "វិសាល",
      brideName: "សុធារី",
      startsAt: new Date("2026-12-20T17:00:00+07:00"),
      venue: "សណ្ឋាគារ ភ្នំពេញ",
      address: "មហាវិថីព្រះមុនីវង្ស ភ្នំពេញ",
      mapUrl: "https://maps.google.com/?q=Phnom+Penh",
      guests: {
        create: GUESTS.map(([name, phone, side, group, invitedCount, status]) => ({
          name,
          phone,
          side,
          group,
          invitedCount,
          status,
        })),
      },
    },
  });
  console.log(`Seeded ${DEMO_EMAIL} with 1 event and ${GUESTS.length} guests`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
