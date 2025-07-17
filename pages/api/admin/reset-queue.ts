import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const updatedComplaints = await prisma.complaint.updateMany({
        where: {
          status: {
            not: "Selesai",
          },
        },
        data: {
          queueNumber: null,
        },
      });

      return res.status(200).json({
        message: "Queue reset successfully.",
        count: updatedComplaints.count,
      });
    } catch (error) {
      console.error("Error resetting queue:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}