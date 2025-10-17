import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { ObjectPermission } from "./objectAcl";
import { db } from "./db";
import { teams, students, studentCategories, attendances, schedules, categories, sharedDocuments } from "@shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import { generateTeamCode, hashPassword, verifyPassword } from "./utils";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Object Storage endpoints
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req, res) => {
    const userId = req.user?.claims?.sub;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
        requestedPermission: ObjectPermission.READ,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/schedule-files", isAuthenticated, async (req, res) => {
    if (!req.body.scheduleId || !req.body.files) {
      return res.status(400).json({ error: "scheduleId and files are required" });
    }

    const userId = req.user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const normalizedFiles = [];

      for (const file of req.body.files) {
        const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
          file.url,
          {
            owner: userId,
            visibility: "public",
          },
        );
        normalizedFiles.push({
          ...file,
          url: normalizedPath,
        });
      }

      res.status(200).json({
        files: normalizedFiles,
      });
    } catch (error) {
      console.error("Error setting schedule files:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Authentication Endpoints
  app.post("/api/student/register", async (req, res) => {
    try {
      const { name, email, password, teamCode } = req.body;

      if (!name || !email || !password || !teamCode) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if team code exists
      const team = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);
      if (team.length === 0) {
        return res.status(404).json({ error: "Invalid team code" });
      }

      // Check if email already exists
      const existingStudent = await db.select().from(students).where(eq(students.email, email)).limit(1);
      if (existingStudent.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create student
      const hashedPassword = await hashPassword(password);
      const newStudent = await db.insert(students).values({
        name,
        email,
        password: hashedPassword,
        teamId: team[0].id,
      }).returning();

      res.status(201).json({ student: { id: newStudent[0].id, name: newStudent[0].name, email: newStudent[0].email } });
    } catch (error) {
      console.error("Error registering student:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/student/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find student
      const student = await db.select().from(students).where(eq(students.email, email)).limit(1);
      if (student.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValid = await verifyPassword(password, student[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.status(200).json({ 
        student: { 
          id: student[0].id, 
          name: student[0].name, 
          email: student[0].email,
          teamId: student[0].teamId 
        } 
      });
    } catch (error) {
      console.error("Error logging in student:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Category Selection
  app.get("/api/student/:studentId/categories", async (req, res) => {
    try {
      const { studentId } = req.params;
      
      const studentCats = await db.select()
        .from(studentCategories)
        .where(eq(studentCategories.studentId, studentId));
      
      if (studentCats.length === 0) {
        return res.json([]);
      }

      const categoryIds = studentCats.map(sc => sc.categoryId);
      const cats = await db.select()
        .from(categories)
        .where(inArray(categories.id, categoryIds));

      res.json(cats);
    } catch (error) {
      console.error("Error fetching student categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/student/:studentId/categories", async (req, res) => {
    try {
      const { studentId } = req.params;
      const { categoryIds } = req.body;

      if (!categoryIds || !Array.isArray(categoryIds)) {
        return res.status(400).json({ error: "categoryIds array is required" });
      }

      // Delete existing categories
      await db.delete(studentCategories).where(eq(studentCategories.studentId, studentId));

      // Insert new categories
      if (categoryIds.length > 0) {
        await db.insert(studentCategories).values(
          categoryIds.map(categoryId => ({ studentId, categoryId }))
        );
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating student categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Schedules (filtered by selected categories)
  app.get("/api/student/:studentId/schedules", async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Get student's selected categories
      const studentCats = await db.select()
        .from(studentCategories)
        .where(eq(studentCategories.studentId, studentId));
      
      if (studentCats.length === 0) {
        return res.json([]);
      }

      const categoryIds = studentCats.map(sc => sc.categoryId);
      const scheds = await db.select()
        .from(schedules)
        .where(inArray(schedules.categoryId, categoryIds));

      res.json(scheds);
    } catch (error) {
      console.error("Error fetching student schedules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Attendance
  app.get("/api/student/:studentId/attendance", async (req, res) => {
    try {
      const { studentId } = req.params;
      
      const atts = await db.select()
        .from(attendances)
        .where(eq(attendances.studentId, studentId));

      res.json(atts);
    } catch (error) {
      console.error("Error fetching student attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/student/:studentId/attendance", async (req, res) => {
    try {
      const { studentId } = req.params;
      const { scheduleId, status, comment } = req.body;

      if (!scheduleId || !status) {
        return res.status(400).json({ error: "scheduleId and status are required" });
      }

      // Check if attendance already exists
      const existing = await db.select()
        .from(attendances)
        .where(and(
          eq(attendances.studentId, studentId),
          eq(attendances.scheduleId, scheduleId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing attendance
        await db.update(attendances)
          .set({ status, comment: comment || null })
          .where(eq(attendances.id, existing[0].id));
        res.status(200).json({ success: true });
      } else {
        // Create new attendance
        await db.insert(attendances).values({
          studentId,
          scheduleId,
          status,
          comment: comment || null,
        });
        res.status(201).json({ success: true });
      }
    } catch (error) {
      console.error("Error updating student attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shared Documents
  app.get("/api/team/:teamId/documents", async (req, res) => {
    try {
      const { teamId } = req.params;
      
      const docs = await db.select()
        .from(sharedDocuments)
        .where(eq(sharedDocuments.teamId, teamId));

      res.json(docs);
    } catch (error) {
      console.error("Error fetching shared documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Contact Form (send email to team contact)
  app.post("/api/team/:teamId/contact", async (req, res) => {
    try {
      const { teamId } = req.params;
      const { name, email, message } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Get team contact email
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }

      // For now, we'll just log the message (email integration needed)
      console.log(`Contact form submission:
        To: ${team[0].contactEmail}
        From: ${name} <${email}>
        Message: ${message}
      `);

      // TODO: Implement actual email sending using an email service
      res.status(200).json({ success: true, message: "お問い合わせを送信しました" });
    } catch (error) {
      console.error("Error sending contact form:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
