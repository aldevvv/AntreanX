import { subDays, startOfDay } from 'date-fns';
import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';
import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const timeZone = 'Asia/Makassar';

  if (req.method === "GET") {
    const { filter } = req.query;
    
    let where: Prisma.ComplaintWhereInput = {};

    if (typeof filter === 'string' && filter !== 'all') {
      const now = new Date();
      const zonedNow = toZonedTime(now, timeZone);
      let startDate: Date | undefined = undefined;

      switch (filter) {
        case 'today':
          startDate = startOfDay(zonedNow);
          break;
        case 'last7days':
          startDate = subDays(zonedNow, 7);
          break;
        case 'last30days':
          startDate = subDays(zonedNow, 30);
          break;
        default:
          // Invalid filter value, ignore it
          break;
      }

      if (startDate) {
        where.createdAt = {
          gte: startDate,
        };
      }
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });
    return res.status(200).json(complaints);
  }

  if (req.method === "POST") {
    const {
      name,
      company,
      phone,
      complaint,
      category,
      deviceType,
      noInternet,
    } = req.body;

    const now = new Date();
    const zonedNow = toZonedTime(now, timeZone);
    const startOfDayForToday = startOfDay(zonedNow);

    const lastToday = await prisma.complaint.findFirst({
        where: {
            createdAt: {
                gte: startOfDayForToday,
            },
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    let nextQueueNumber = 1;
    if (lastToday?.queueNumber) {
        nextQueueNumber = parseInt(lastToday.queueNumber.slice(1)) + 1;
    }

    const queueNumber = 'A' + String(nextQueueNumber).padStart(3, '0');

    const created = await prisma.complaint.create({
      data: {
        name,
        company: company || "",
        phone,
        complaint,
        category,
        deviceType: deviceType || "",
        noInternet,
        queueNumber,
        status: "Menunggu",
      },
    });

    return res.status(200).json(created);
  }

  if (req.method === "PATCH" || req.method === "PUT") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id, status, notes, name, company, phone, complaint, category, deviceType, noInternet } = req.body;

    // Prepare data object - only include fields that are provided
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (name !== undefined) updateData.name = name;
    if (company !== undefined) updateData.company = company;
    if (phone !== undefined) updateData.phone = phone;
    if (complaint !== undefined) updateData.complaint = complaint;
    if (category !== undefined) updateData.category = category;
    if (deviceType !== undefined) updateData.deviceType = deviceType;
    if (noInternet !== undefined) updateData.noInternet = noInternet;

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
    });

    return res.status(200).json(updated);
  }

  if (req.method === "DELETE") {
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.body;

    await prisma.complaint.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Complaint deleted successfully" });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
