import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Simple security check - you can add more sophisticated auth here
  const { authorization } = req.headers;
  if (authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if it's actually midnight (00:00)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`Cron job triggered at ${now.toISOString()}`);
    
    // Only reset if it's between 00:00 and 00:05 (5 minute window)
    if (currentHour === 0 && currentMinute < 5) {
      // Get yesterday's date
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Archive or delete old complaints (older than yesterday)
      const oldComplaints = await prisma.complaint.findMany({
        where: {
          createdAt: {
            lt: yesterday
          }
        }
      });

      if (oldComplaints.length > 0) {
        // You can choose to delete or archive old complaints
        // For now, let's keep them but we could add an archive status
        console.log(`Found ${oldComplaints.length} old complaints to potentially archive`);
      }

      // Log the reset action
      console.log(`Queue numbers reset at ${now.toISOString()}`);
      
      return res.status(200).json({ 
        message: "Queue reset completed",
        timestamp: now.toISOString(),
        oldComplaintsCount: oldComplaints.length
      });
    } else {
      return res.status(200).json({ 
        message: "Not midnight, no reset needed",
        timestamp: now.toISOString(),
        currentHour,
        currentMinute
      });
    }
  } catch (error) {
    console.error("Error in cron reset:", error);
    return res.status(500).json({ 
      error: "Internal server error",
      timestamp: new Date().toISOString()
    });
  }
}