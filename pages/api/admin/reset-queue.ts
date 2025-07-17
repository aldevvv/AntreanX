import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
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
      // Atur zona waktu ke 'Asia/Makassar'
      const timeZone = 'Asia/Makassar';
      const now = new Date();
      // Dapatkan tanggal dan waktu saat ini di zona waktu target
      const zonedNow = toZonedTime(now, timeZone);
      // Atur waktu ke awal hari (00:00:00) di zona waktu tersebut
      const startOfDay = fromZonedTime(format(zonedNow, 'yyyy-MM-dd 00:00:00', { timeZone }), timeZone);
      const endOfDay = fromZonedTime(format(zonedNow, 'yyyy-MM-dd 23:59:59', { timeZone }), timeZone);
      const deletedResult = await prisma.complaint.deleteMany({
        where: {
          NOT: {
            status: "Selesai",
          },
          createdAt: {
            gte: startOfDay,
          },
        },
      });

      return res.status(200).json({
        message: "Queue reset successfully.",
        count: deletedResult.count,
      });
    } catch (error) {
      console.error("Error resetting queue:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}