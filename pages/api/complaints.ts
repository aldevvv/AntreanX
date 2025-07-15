import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const complaints = await prisma.complaint.findMany({
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

    const last = await prisma.complaint.findFirst({
      orderBy: { createdAt: "desc" },
    });

    let queueNumber = "A001";
    if (last?.queueNumber) {
      const lastNum = parseInt(last.queueNumber.slice(1)) + 1;
      queueNumber = "A" + String(lastNum).padStart(3, "0");
    }

    const created = await prisma.complaint.create({
      data: {
        name,
        company,
        phone,
        complaint,
        category,
        deviceType,
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
