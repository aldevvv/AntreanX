import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getSession({ req });

  if (!session || !session.user || !session.user.email) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { name, email, currentPassword, newPassword } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updateData: { name: string; email: string; password?: string } = {
      name,
      email,
    };

    if (currentPassword && newPassword) {
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password as string
      );

      if (!isPasswordValid) {
        return res.status(400).json({ message: "Password saat ini salah" });
      }

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedNewPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
    });

    return res.status(200).json(updatedUser);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
}