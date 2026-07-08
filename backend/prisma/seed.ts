import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const email = "admin@demo-acme.com";
  const password = "Demo@12345";

  const existing = await prisma.user.findFirst({ where: { email } });
  if (existing) {
    console.log("Seed data already exists. Skipping.");
    console.log(`Login with: ${email} / ${password}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const business = await prisma.business.create({
    data: {
      name: "Acme Corp",
      slug: "acme-corp-demo",
      aiConfig: {
        create: {
          botName: "Acme AI Assistant",
          welcomeMessage: "Hi! I'm the Acme AI Assistant. Ask me about orders, returns, or your account.",
          personality: "Friendly",
          escalationRules: JSON.stringify([
            "refund_requested",
            "legal_complaint",
            "customer_angry",
            "human_requested",
            "payment_failure",
          ]),
        },
      },
      users: {
        create: { email, name: "Demo Admin", passwordHash, role: "OWNER" },
      },
    },
  });

  console.log("Seed complete.");
  console.log(`Business: ${business.name} (slug: ${business.slug})`);
  console.log(`Widget key: ${business.widgetKey}`);
  console.log(`Admin login -> email: ${email}  password: ${password}`);
  console.log("Upload docs/sample-kb/*.md via the Knowledge Base page, then chat with the widget.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
