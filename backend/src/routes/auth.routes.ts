import { Router } from "express";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";

export const authRouter = Router();

const registerSchema = z.object({
  businessName: z.string().min(2),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

// Registration creates the Business (tenant) + its first OWNER user + default AI config.
authRouter.post("/register", async (req, res) => {
  const body = registerSchema.parse(req.body);

  const slug = `${body.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(5)}`;
  const existing = await prisma.user.findFirst({ where: { email: body.email } });
  if (existing) throw new ApiError(409, "An account with this email already exists");

  const passwordHash = await bcrypt.hash(body.password, 10);

  const business = await prisma.business.create({
    data: {
      name: body.businessName,
      slug,
      aiConfig: { create: {} }, // defaults
      users: {
        create: { email: body.email, name: body.name, passwordHash, role: "OWNER" },
      },
    },
    include: { users: true },
  });

  const user = business.users[0];
  const token = signToken({ userId: user.id, businessId: business.id, role: user.role });
  res.status(201).json({ token, business: { id: business.id, name: business.name, slug: business.slug }, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

authRouter.post("/login", async (req, res) => {
  const body = loginSchema.parse(req.body);
  const user = await prisma.user.findFirst({ where: { email: body.email }, include: { business: true } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(body.password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  const token = signToken({ userId: user.id, businessId: user.businessId, role: user.role });
  res.json({
    token,
    business: { id: user.business.id, name: user.business.name, slug: user.business.slug },
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const forgotSchema = z.object({ email: z.string().email() });

authRouter.post("/forgot-password", async (req, res) => {
  const body = forgotSchema.parse(req.body);
  const user = await prisma.user.findFirst({ where: { email: body.email } });

  // Always return 200 regardless of whether the email exists, to avoid account enumeration.
  if (user) {
    const resetToken = nanoid(32);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: new Date(Date.now() + 1000 * 60 * 30) },
    });
    // In production this would be emailed via SES/Postmark/etc. For the take-home,
    // we log it - swap for a real email provider integration.
    // eslint-disable-next-line no-console
    console.log(`[password reset] ${body.email} -> token=${resetToken} (expires in 30 min)`);
  }

  res.json({ message: "If that email exists, a reset link has been sent." });
});

const resetSchema = z.object({ token: z.string(), newPassword: z.string().min(8) });

authRouter.post("/reset-password", async (req, res) => {
  const body = resetSchema.parse(req.body);
  const user = await prisma.user.findFirst({ where: { resetToken: body.token } });
  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    throw new ApiError(400, "Reset token is invalid or expired");
  }
  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  });
  res.json({ message: "Password updated. You can now log in." });
});
