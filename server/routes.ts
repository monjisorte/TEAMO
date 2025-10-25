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
import { teams, students, coaches, studentCategories, attendances, schedules, categories, sharedDocuments, folders, tuitionPayments, venues, admins, activityLogs, coachCategories, passwordResetTokens, sports, insertSportSchema, siblingLinks } from "@shared/schema";
import { eq, and, inArray, isNull, or, count, sql as drizzleSql, desc, gt, asc } from "drizzle-orm";
import { generateTeamCode, hashPassword, verifyPassword } from "./utils";
import { Resend } from "resend";
import crypto from "crypto";

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

  app.post("/api/objects/upload-public", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getPublicUploadURL();
    res.json({ uploadURL });
  });

  app.post("/api/objects/download-url", isAuthenticated, async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const downloadURL = await objectStorageService.getDownloadURL(url);
      res.json({ downloadURL });
    } catch (error) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ error: "Failed to generate download URL" });
    }
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

  // Schedule Endpoints
  app.get("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      const allSchedules = await db.select().from(schedules);
      res.json(allSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/schedules", isAuthenticated, async (req, res) => {
    try {
      const { recurrenceRule, recurrenceInterval, recurrenceDays, recurrenceEndDate, ...scheduleData } = req.body;
      
      // Set default venue to "未定" if not provided
      if (!scheduleData.venue || scheduleData.venue.trim() === "") {
        scheduleData.venue = "未定";
      }

      // Create the first schedule
      const newSchedule = await db.insert(schedules).values({
        ...scheduleData,
        recurrenceRule: recurrenceRule || "none",
        recurrenceInterval: recurrenceInterval || 1,
        recurrenceDays,
        recurrenceEndDate,
      }).returning();

      const createdSchedules = [newSchedule[0]];

      // If recurrence is enabled, generate additional schedules
      if (recurrenceRule && recurrenceRule !== "none") {
        // Use Date object with UTC to avoid timezone issues
        const startDate = new Date(scheduleData.date + 'T00:00:00Z');
        const endDateLimit = recurrenceEndDate 
          ? new Date(recurrenceEndDate + 'T00:00:00Z')
          : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // Default to 1 year
        
        const interval = recurrenceInterval || 1;
        const recurringSchedules = [];

        let currentDate = new Date(startDate);

        while (recurringSchedules.length < 100) {
          // Calculate next occurrence based on recurrence rule
          if (recurrenceRule === "daily") {
            currentDate.setUTCDate(currentDate.getUTCDate() + interval);
          } else if (recurrenceRule === "weekly") {
            currentDate.setUTCDate(currentDate.getUTCDate() + (7 * interval));
          } else if (recurrenceRule === "monthly") {
            currentDate.setUTCMonth(currentDate.getUTCMonth() + interval);
          }

          // Check if we've exceeded the end date
          if (currentDate <= endDateLimit) {
            const year = currentDate.getUTCFullYear();
            const month = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getUTCDate()).padStart(2, '0');
            const nextDateStr = `${year}-${month}-${day}`;
            
            recurringSchedules.push({
              ...scheduleData,
              date: nextDateStr,
              recurrenceRule,
              recurrenceInterval,
              recurrenceDays,
              recurrenceEndDate,
              parentScheduleId: newSchedule[0].id,
            });
          } else {
            break;
          }
        }

        // Insert all recurring schedules
        if (recurringSchedules.length > 0) {
          const inserted = await db.insert(schedules).values(recurringSchedules).returning();
          createdSchedules.push(...inserted);
        }
      }

      // Log activity
      const userId = req.user?.claims?.sub;
      if (userId && newSchedule[0].teamId) {
        try {
          // Format date as "M月D日"
          const scheduleDate = new Date(newSchedule[0].date);
          const month = scheduleDate.getMonth() + 1;
          const day = scheduleDate.getDate();
          const formattedDate = `${month}月${day}日`;
          const eventNameWithDate = `${formattedDate} ${newSchedule[0].title}`;

          // Get category IDs
          const categoryIds = newSchedule[0].categoryIds || (newSchedule[0].categoryId ? [newSchedule[0].categoryId] : []);

          await db.insert(activityLogs).values({
            teamId: newSchedule[0].teamId,
            activityType: "schedule_created",
            actorId: userId,
            actorType: "coach",
            targetType: "schedule",
            targetId: newSchedule[0].id,
            targetName: newSchedule[0].title,
            description: `新しく「${eventNameWithDate}」が登録されました`,
            categoryIds: categoryIds,
          });
        } catch (logError) {
          console.error("Error logging activity:", logError);
        }
      }

      res.status(201).json({
        schedule: newSchedule[0],
        count: createdSchedules.length,
        allSchedules: createdSchedules,
      });
    } catch (error) {
      console.error("Error creating schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { updateType, ...updateData } = req.body; // updateType: "this" | "all"

      // Get the original schedule for comparison
      const originalSchedule = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
      if (originalSchedule.length === 0) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      if (updateType === "all") {
        const parentId = originalSchedule[0].parentScheduleId || originalSchedule[0].id;

        // When updating all, exclude the date field to preserve individual dates
        const { date, ...updateDataWithoutDate } = updateData;

        // Update all schedules in the series (including parent)
        await db.update(schedules).set(updateDataWithoutDate).where(
          or(
            eq(schedules.id, parentId),
            eq(schedules.parentScheduleId, parentId)
          )
        );
      } else {
        // Update only this schedule
        await db.update(schedules).set(updateData).where(eq(schedules.id, id));
      }

      const updated = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);

      // Log activity
      const userId = req.user?.claims?.sub;
      if (userId && updated[0].teamId) {
        try {
          // Format date as "M月D日"
          const scheduleDate = new Date(updated[0].date);
          const month = scheduleDate.getMonth() + 1;
          const day = scheduleDate.getDate();
          const formattedDate = `${month}月${day}日`;
          const eventNameWithDate = `${formattedDate} ${updated[0].title}`;

          let changeDescription = "";
          if (updateData.startHour !== undefined || updateData.startMinute !== undefined) {
            changeDescription = "の開始時間が変更されました";
          } else if (updateData.venue !== undefined) {
            changeDescription = "の会場が変更されました";
          } else if (updateData.title !== undefined) {
            changeDescription = "が更新されました";
          } else {
            changeDescription = "が更新されました";
          }

          // Get category IDs
          const categoryIds = updated[0].categoryIds || (updated[0].categoryId ? [updated[0].categoryId] : []);

          await db.insert(activityLogs).values({
            teamId: updated[0].teamId,
            activityType: "schedule_updated",
            actorId: userId,
            actorType: "coach",
            targetType: "schedule",
            targetId: updated[0].id,
            targetName: updated[0].title,
            description: `「${eventNameWithDate}」${changeDescription}`,
            categoryIds: categoryIds,
          });
        } catch (logError) {
          console.error("Error logging activity:", logError);
        }
      }

      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/schedules/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { deleteType } = req.query; // deleteType: "this" | "all"

      // Get the schedule before deleting for logging
      const schedule = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
      if (schedule.length === 0) {
        return res.status(404).json({ error: "Schedule not found" });
      }

      if (deleteType === "all") {
        const parentId = schedule[0].parentScheduleId || schedule[0].id;

        // Delete all schedules in the series (including parent)
        await db.delete(schedules).where(
          or(
            eq(schedules.id, parentId),
            eq(schedules.parentScheduleId, parentId)
          )
        );
      } else {
        // Delete only this schedule
        await db.delete(schedules).where(eq(schedules.id, id));
      }

      // Log activity
      const userId = req.user?.claims?.sub;
      if (userId && schedule[0].teamId) {
        try {
          // Format date as "M月D日"
          const scheduleDate = new Date(schedule[0].date);
          const month = scheduleDate.getMonth() + 1;
          const day = scheduleDate.getDate();
          const formattedDate = `${month}月${day}日`;
          const eventNameWithDate = `${formattedDate} ${schedule[0].title}`;

          // Get category IDs
          const categoryIds = schedule[0].categoryIds || (schedule[0].categoryId ? [schedule[0].categoryId] : []);

          await db.insert(activityLogs).values({
            teamId: schedule[0].teamId,
            activityType: "schedule_deleted",
            actorId: userId,
            actorType: "coach",
            targetType: "schedule",
            targetId: schedule[0].id,
            targetName: schedule[0].title,
            description: `「${eventNameWithDate}」が削除されました`,
            categoryIds: categoryIds,
          });
        } catch (logError) {
          console.error("Error logging activity:", logError);
        }
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Attendance Endpoints
  app.get("/api/attendances", isAuthenticated, async (req, res) => {
    try {
      const allAttendances = await db.select().from(attendances);
      res.json(allAttendances);
    } catch (error) {
      console.error("Error fetching attendances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/attendances", isAuthenticated, async (req, res) => {
    try {
      const { studentId, scheduleId, status, comment } = req.body;

      console.log("POST /api/attendances - Body:", { studentId, scheduleId, status, comment });

      if (!studentId || !scheduleId || !status) {
        return res.status(400).json({ error: "studentId, scheduleId, and status are required" });
      }

      // Check if attendance already exists
      const existing = await db.select()
        .from(attendances)
        .where(and(
          eq(attendances.studentId, studentId),
          eq(attendances.scheduleId, scheduleId)
        ))
        .limit(1);

      console.log("Existing attendance found:", existing.length > 0, existing);

      if (existing.length > 0) {
        // Update existing attendance
        console.log("Updating existing attendance:", existing[0].id);
        const updated = await db.update(attendances)
          .set({ status, comment: comment || null })
          .where(eq(attendances.id, existing[0].id))
          .returning();
        console.log("Updated attendance:", updated[0]);
        res.status(200).json(updated[0]);
      } else {
        // Create new attendance
        console.log("Creating new attendance...");
        const result = await db.insert(attendances).values({
          studentId,
          scheduleId,
          status,
          comment: comment || null,
        }).returning();
        
        console.log("Insert result:", result);
        
        if (result && result.length > 0) {
          console.log("Created new attendance:", result[0]);
          res.status(200).json(result[0]);
        } else {
          console.error("No result returned from insert");
          // Fetch the created attendance
          const created = await db.select()
            .from(attendances)
            .where(and(
              eq(attendances.studentId, studentId),
              eq(attendances.scheduleId, scheduleId)
            ))
            .limit(1);
          console.log("Fetched after insert:", created);
          res.status(200).json(created[0] || { success: true });
        }
      }
    } catch (error) {
      console.error("Error creating/updating attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Sports Endpoints
  app.get("/api/sports", async (req, res) => {
    try {
      const allSports = await db.select()
        .from(sports)
        .orderBy(asc(sports.order), asc(sports.name));
      res.json(allSports);
    } catch (error) {
      console.error("Error fetching sports:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/sports", isAuthenticated, async (req, res) => {
    try {
      const { name, order } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Validate with insertSportSchema
      const validatedData = insertSportSchema.parse({
        name,
        order: order ?? 0,
      });

      const newSport = await db.insert(sports).values(validatedData).returning();

      res.status(201).json(newSport[0]);
    } catch (error: unknown) {
      console.error("Error creating sport:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: (error as any).errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/sports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, order } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Validate with insertSportSchema
      const validatedData = insertSportSchema.parse({
        name,
        order: order ?? 0,
      });

      const updatedSport = await db.update(sports)
        .set(validatedData)
        .where(eq(sports.id, id))
        .returning();

      if (updatedSport.length === 0) {
        return res.status(404).json({ error: "Sport not found" });
      }

      res.status(200).json(updatedSport[0]);
    } catch (error: unknown) {
      console.error("Error updating sport:", error);
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid data", details: (error as any).errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/sports/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(sports).where(eq(sports.id, id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting sport:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Category Endpoints
  app.get("/api/categories/:teamId", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
      
      const teamCategories = await db.select()
        .from(categories)
        .where(eq(categories.teamId, teamId))
        .orderBy(categories.displayOrder);
      
      res.json(teamCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/categories", isAuthenticated, async (req, res) => {
    try {
      const { teamId, name, description, isSchoolOnly } = req.body;

      if (!teamId || !name) {
        return res.status(400).json({ error: "teamId and name are required" });
      }

      // Get max displayOrder for this team
      const existingCategories = await db.select()
        .from(categories)
        .where(eq(categories.teamId, teamId));
      
      const maxOrder = existingCategories.length > 0 
        ? Math.max(...existingCategories.map(c => c.displayOrder || 0))
        : -1;

      const newCategory = await db.insert(categories).values({
        teamId,
        name,
        description,
        isSchoolOnly: isSchoolOnly || false,
        displayOrder: maxOrder + 1,
      }).returning();

      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, isSchoolOnly } = req.body;

      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      const updatedCategory = await db.update(categories)
        .set({
          name,
          description,
          isSchoolOnly: isSchoolOnly || false,
        })
        .where(eq(categories.id, id))
        .returning();

      if (updatedCategory.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json(updatedCategory[0]);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/categories/reorder-batch", isAuthenticated, async (req, res) => {
    try {
      const { categoryIds, teamId } = req.body;

      if (!categoryIds || !Array.isArray(categoryIds)) {
        return res.status(400).json({ error: "categoryIds array is required" });
      }

      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }

      if (categoryIds.length === 0) {
        return res.json({ success: true });
      }

      // Verify all categories belong to the specified team
      for (const categoryId of categoryIds) {
        const cat = await db.select()
          .from(categories)
          .where(eq(categories.id, categoryId));
        
        if (cat.length === 0) {
          return res.status(404).json({ error: "Category not found" });
        }
        
        if (cat[0].teamId !== teamId) {
          return res.status(403).json({ error: "Unauthorized: Category does not belong to your team" });
        }
      }

      // Update displayOrder for each category based on its position in the array
      for (let i = 0; i < categoryIds.length; i++) {
        await db.update(categories)
          .set({ displayOrder: i })
          .where(eq(categories.id, categoryIds[i]));
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error batch reordering categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/categories/:id/reorder", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { direction } = req.body; // 'up' or 'down'

      // Get current category
      const currentCategory = await db.select()
        .from(categories)
        .where(eq(categories.id, id))
        .limit(1);

      if (currentCategory.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      const current = currentCategory[0];

      // Get all categories for this team
      const allCategories = await db.select()
        .from(categories)
        .where(eq(categories.teamId, current.teamId))
        .orderBy(categories.displayOrder);

      // Normalize displayOrder if all are 0 or have duplicates
      const needsNormalization = allCategories.every(c => c.displayOrder === 0) || 
        new Set(allCategories.map(c => c.displayOrder)).size !== allCategories.length;
      
      if (needsNormalization) {
        // Assign sequential displayOrder values
        for (let i = 0; i < allCategories.length; i++) {
          await db.update(categories)
            .set({ displayOrder: i })
            .where(eq(categories.id, allCategories[i].id));
          allCategories[i].displayOrder = i;
        }
      }

      const currentIndex = allCategories.findIndex(c => c.id === id);

      if (currentIndex === -1) {
        return res.status(404).json({ error: "Category not found in list" });
      }

      // Determine swap target
      let swapIndex = -1;
      if (direction === 'up' && currentIndex > 0) {
        swapIndex = currentIndex - 1;
      } else if (direction === 'down' && currentIndex < allCategories.length - 1) {
        swapIndex = currentIndex + 1;
      }

      if (swapIndex === -1) {
        return res.status(400).json({ error: "Cannot move in that direction" });
      }

      // Swap displayOrder values
      const temp = allCategories[currentIndex].displayOrder;
      await db.update(categories)
        .set({ displayOrder: allCategories[swapIndex].displayOrder })
        .where(eq(categories.id, allCategories[currentIndex].id));

      await db.update(categories)
        .set({ displayOrder: temp })
        .where(eq(categories.id, allCategories[swapIndex].id));

      res.json({ success: true });
    } catch (error) {
      console.error("Error reordering category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(categories).where(eq(categories.id, id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Team Management Endpoints
  app.get("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const allTeams = await db.select().from(teams);
      res.json(allTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/teams/:teamId", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      res.json(team[0]);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/teams", isAuthenticated, async (req, res) => {
    try {
      const { name, contactEmail } = req.body;

      if (!name || !contactEmail) {
        return res.status(400).json({ error: "Name and contact email are required" });
      }

      // Generate unique team code
      let teamCode = generateTeamCode();
      let existing = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);
      
      // Ensure team code is unique
      while (existing.length > 0) {
        teamCode = generateTeamCode();
        existing = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);
      }

      const newTeam = await db.insert(teams).values({
        name,
        contactEmail,
        teamCode,
      }).returning();

      res.status(201).json(newTeam[0]);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Team and Coach Registration (for new club registration)
  app.post("/api/teams/register", async (req, res) => {
    try {
      const { clubName, address, sport, ownerName, ownerEmail, password } = req.body;

      if (!clubName || !ownerName || !ownerEmail || !password) {
        return res.status(400).json({ error: "All required fields must be provided" });
      }

      // Check if email already exists
      const existingCoach = await db.select().from(coaches).where(eq(coaches.email, ownerEmail)).limit(1);
      if (existingCoach.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Generate unique team code
      let teamCode = generateTeamCode();
      let existing = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);
      
      // Ensure team code is unique
      while (existing.length > 0) {
        teamCode = generateTeamCode();
        existing = await db.select().from(teams).where(eq(teams.teamCode, teamCode)).limit(1);
      }

      // Create team
      const newTeam = await db.insert(teams).values({
        name: clubName,
        contactEmail: ownerEmail,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        representativeEmail: ownerEmail,
        address: address,
        sportType: sport,
        teamCode,
      }).returning();

      // Create coach account for the owner
      // Split owner name into lastName and firstName
      const nameParts = ownerName.split(/\s+/);
      const lastName = nameParts[0] || ownerName;
      const firstName = nameParts.slice(1).join(' ') || ownerName;
      
      const hashedPassword = await hashPassword(password);
      const newCoach = await db.insert(coaches).values({
        lastName,
        firstName,
        email: ownerEmail,
        password: hashedPassword,
        teamId: newTeam[0].id,
        role: "owner",
      }).returning();

      // Update team with owner coach ID
      await db.update(teams)
        .set({ ownerCoachId: newCoach[0].id })
        .where(eq(teams.id, newTeam[0].id));

      res.status(201).json({
        team: { ...newTeam[0], ownerCoachId: newCoach[0].id },
        coach: {
          id: newCoach[0].id,
          lastName: newCoach[0].lastName,
          firstName: newCoach[0].firstName,
          email: newCoach[0].email,
          teamId: newCoach[0].teamId,
          role: newCoach[0].role,
        },
      });
    } catch (error) {
      console.error("Error registering team and coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Authentication Endpoints
  app.post("/api/student/register", async (req, res) => {
    try {
      const { lastName, firstName, email, password, teamCode } = req.body;

      if (!lastName || !firstName || !email || !password || !teamCode) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Validate team code length (8 or 9 characters)
      if (teamCode.length < 8 || teamCode.length > 9) {
        return res.status(400).json({ error: "Invalid team code format" });
      }

      // Extract the base team code (first 8 characters) for team lookup
      const baseTeamCode = teamCode.substring(0, 8);
      
      // Determine player type based on team code length
      // 8 digits = team member, 9 digits = school member
      const playerType = teamCode.length === 9 ? "school" : "team";

      // Check if team code exists (using first 8 characters)
      const team = await db.select().from(teams).where(eq(teams.teamCode, baseTeamCode)).limit(1);
      if (team.length === 0) {
        return res.status(404).json({ error: "Invalid team code" });
      }

      // Check if email already exists
      const existingStudent = await db.select().from(students).where(eq(students.email, email)).limit(1);
      if (existingStudent.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create student with auto-determined player type
      const hashedPassword = await hashPassword(password);
      const newStudent = await db.insert(students).values({
        lastName,
        firstName,
        email,
        password: hashedPassword,
        teamId: team[0].id,
        playerType,
      }).returning();

      res.status(201).json({ student: { id: newStudent[0].id, lastName: newStudent[0].lastName, firstName: newStudent[0].firstName, email: newStudent[0].email, teamId: newStudent[0].teamId, playerType: newStudent[0].playerType } });
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
          lastName: student[0].lastName,
          firstName: student[0].firstName,
          email: student[0].email,
          teamId: student[0].teamId,
          playerType: student[0].playerType
        } 
      });
    } catch (error) {
      console.error("Error logging in student:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Password Reset Request
  app.post("/api/student/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if student exists
      const student = await db.select().from(students).where(eq(students.email, email)).limit(1);
      if (student.length === 0) {
        // Return success even if email doesn't exist (security best practice)
        return res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.insert(passwordResetTokens).values({
        email,
        token: resetToken,
        expiresAt,
      });

      // Send email with Resend
      const resend = new Resend(process.env.RESEND_API_KEY);
      // Use the current request host for the reset URL
      const host = req.get('host') || '';
      const protocol = req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

      console.log("Sending password reset email to:", email);
      console.log("Reset URL:", resetUrl);
      
      try {
        const emailResult = await resend.emails.send({
          from: "TEAMO <noreply@sorte.work>",
          to: email,
          subject: "パスワードリセットのご案内 - TEAMO",
          html: `
            <h2>パスワードリセット</h2>
            <p>パスワードのリセットをリクエストいただきありがとうございます。</p>
            <p>下記のリンクをクリックして、新しいパスワードを設定してください：</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>このリンクは1時間有効です。</p>
            <p>もしリクエストしていない場合は、このメールを無視してください。</p>
          `,
        });
        
        console.log("Email sent successfully:", emailResult);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Still return success to not reveal if email exists
      }

      res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Verify Reset Token
  app.post("/api/student/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Find token in database
      const resetToken = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        ))
        .limit(1);

      if (resetToken.length === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      res.status(200).json({ valid: true, email: resetToken[0].email });
    } catch (error) {
      console.error("Error verifying reset token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reset Password
  app.post("/api/student/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Find token in database
      const resetToken = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        ))
        .limit(1);

      if (resetToken.length === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update student password
      await db.update(students)
        .set({ password: hashedPassword })
        .where(eq(students.email, resetToken[0].email));

      // Delete used token
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Authentication
  app.post("/api/coach/register", async (req, res) => {
    try {
      console.log("Coach register request received:", req.body);
      const { lastName, firstName, email, password, teamId } = req.body;

      if (!lastName || !firstName || !email || !password || !teamId) {
        console.log("Missing required fields:", { lastName: !!lastName, firstName: !!firstName, email: !!email, password: !!password, teamId: !!teamId });
        return res.status(400).json({ error: "All fields are required" });
      }

      // Check if email already exists
      const existingCoach = await db.select().from(coaches).where(eq(coaches.email, email)).limit(1);
      if (existingCoach.length > 0) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create coach
      const hashedPassword = await hashPassword(password);
      const newCoach = await db.insert(coaches).values({
        lastName,
        firstName,
        email,
        password: hashedPassword,
        teamId,
      }).returning();

      res.status(201).json({ coach: { id: newCoach[0].id, lastName: newCoach[0].lastName, firstName: newCoach[0].firstName, email: newCoach[0].email, teamId: newCoach[0].teamId } });
    } catch (error) {
      console.error("Error registering coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/coach/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Find coach
      const coach = await db.select().from(coaches).where(eq(coaches.email, email)).limit(1);
      if (coach.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValid = await verifyPassword(password, coach[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.status(200).json({ 
        coach: { 
          id: coach[0].id, 
          lastName: coach[0].lastName,
          firstName: coach[0].firstName,
          email: coach[0].email,
          teamId: coach[0].teamId,
          role: coach[0].role
        } 
      });
    } catch (error) {
      console.error("Error logging in coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Password Reset Request
  app.post("/api/coach/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      // Check if coach exists
      const coach = await db.select().from(coaches).where(eq(coaches.email, email)).limit(1);
      if (coach.length === 0) {
        // Return success even if email doesn't exist (security best practice)
        return res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Save token to database
      await db.insert(passwordResetTokens).values({
        email,
        token: resetToken,
        expiresAt,
      });

      // Send email with Resend
      const resend = new Resend(process.env.RESEND_API_KEY);
      const host = req.get('host') || '';
      const protocol = req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;
      const resetUrl = `${baseUrl}/coach/reset-password?token=${resetToken}`;

      console.log("Sending coach password reset email to:", email);
      console.log("Reset URL:", resetUrl);
      
      try {
        const emailResult = await resend.emails.send({
          from: "TEAMO <noreply@sorte.work>",
          to: email,
          subject: "パスワードリセットのご案内 - TEAMO（コーチ）",
          html: `
            <h2>パスワードリセット</h2>
            <p>パスワードのリセットをリクエストいただきありがとうございます。</p>
            <p>下記のリンクをクリックして、新しいパスワードを設定してください：</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>このリンクは1時間有効です。</p>
            <p>もしリクエストしていない場合は、このメールを無視してください。</p>
          `,
        });
        
        console.log("Email sent successfully:", emailResult);
      } catch (emailError) {
        console.error("Error sending email:", emailError);
        // Still return success to not reveal if email exists
      }

      res.status(200).json({ message: "If the email exists, a password reset link has been sent" });
    } catch (error) {
      console.error("Error requesting coach password reset:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Verify Reset Token
  app.post("/api/coach/verify-reset-token", async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Find token in database
      const resetToken = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        ))
        .limit(1);

      if (resetToken.length === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Verify it's a coach email
      const coach = await db.select().from(coaches).where(eq(coaches.email, resetToken[0].email)).limit(1);
      if (coach.length === 0) {
        return res.status(400).json({ error: "Invalid token" });
      }

      res.status(200).json({ valid: true, email: resetToken[0].email });
    } catch (error) {
      console.error("Error verifying coach reset token:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Reset Password
  app.post("/api/coach/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Find token in database
      const resetToken = await db.select().from(passwordResetTokens)
        .where(and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date())
        ))
        .limit(1);

      if (resetToken.length === 0) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update coach password
      await db.update(coaches)
        .set({ password: hashedPassword })
        .where(eq(coaches.email, resetToken[0].email));

      // Delete used token
      await db.delete(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token));

      res.status(200).json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting coach password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/coach/:coachId", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      const { password, ...coachData } = coach[0];
      res.json(coachData);
    } catch (error) {
      console.error("Error fetching coach profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Management
  app.get("/api/teams/:teamId/coaches", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;

      const teamCoaches = await db.select({
        id: coaches.id,
        email: coaches.email,
        role: coaches.role,
        createdAt: coaches.createdAt,
        lastName: coaches.lastName,
        firstName: coaches.firstName,
        lastNameKana: coaches.lastNameKana,
        firstNameKana: coaches.firstNameKana,
        photoUrl: coaches.photoUrl,
        bio: coaches.bio,
        position: coaches.position,
      }).from(coaches).where(eq(coaches.teamId, teamId));

      res.json(teamCoaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/coaches/:coachId", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;

      // Check if coach exists
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Delete coach
      await db.delete(coaches).where(eq(coaches.id, coachId));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/coaches/:coachId/password", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      const { password } = req.body;

      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      // Check if coach exists
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Hash and update password
      const hashedPassword = await hashPassword(password);
      await db.update(coaches).set({ password: hashedPassword }).where(eq(coaches.id, coachId));

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error updating coach password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Venue Management
  app.get("/api/teams/:teamId/venues", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;

      const teamVenues = await db.select().from(venues).where(eq(venues.teamId, teamId));
      res.json(teamVenues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/venues", isAuthenticated, async (req, res) => {
    try {
      const { name, address, teamId } = req.body;

      if (!name || !teamId) {
        return res.status(400).json({ error: "Name and teamId are required" });
      }

      const newVenue = await db.insert(venues).values({
        name,
        address,
        teamId,
      }).returning();

      res.status(201).json(newVenue[0]);
    } catch (error) {
      console.error("Error creating venue:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/venues/:venueId", isAuthenticated, async (req, res) => {
    try {
      const { venueId } = req.params;

      // Check if venue exists
      const venue = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      if (venue.length === 0) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Delete venue
      await db.delete(venues).where(eq(venues.id, venueId));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting venue:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/venues/:venueId", isAuthenticated, async (req, res) => {
    try {
      const { venueId } = req.params;
      const { name, address } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      // Check if venue exists
      const venue = await db.select().from(venues).where(eq(venues.id, venueId)).limit(1);
      if (venue.length === 0) {
        return res.status(404).json({ error: "Venue not found" });
      }

      // Update venue
      const updatedVenue = await db.update(venues)
        .set({ name, address })
        .where(eq(venues.id, venueId))
        .returning();

      res.status(200).json(updatedVenue[0]);
    } catch (error) {
      console.error("Error updating venue:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Profile
  app.get("/api/student/:studentId", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      const { password, ...studentData } = student[0];
      res.json(studentData);
    } catch (error) {
      console.error("Error fetching student profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/student/:studentId", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { name, lastName, firstName, lastNameKana, firstNameKana, schoolName, birthDate, photoUrl, playerType, jerseyNumber } = req.body;

      // playerTypeが変更される場合、現在の値を取得
      let shouldClearCategories = false;
      if (playerType !== undefined) {
        const currentStudent = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
        if (currentStudent.length > 0 && currentStudent[0].playerType !== playerType) {
          shouldClearCategories = true;
        }
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastNameKana !== undefined) updateData.lastNameKana = lastNameKana === "" ? null : lastNameKana;
      if (firstNameKana !== undefined) updateData.firstNameKana = firstNameKana === "" ? null : firstNameKana;
      if (schoolName !== undefined) updateData.schoolName = schoolName === "" ? null : schoolName;
      if (birthDate !== undefined) updateData.birthDate = birthDate === "" ? null : birthDate;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (playerType !== undefined) updateData.playerType = playerType;
      if (jerseyNumber !== undefined) updateData.jerseyNumber = jerseyNumber === "" ? null : jerseyNumber;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      // トランザクションを使用してアトミック性を保証
      await db.transaction(async (tx) => {
        // 学生情報を更新
        await tx.update(students).set(updateData).where(eq(students.id, studentId));

        // playerTypeが変更された場合、カテゴリ登録を全てクリア
        if (shouldClearCategories) {
          await tx.delete(studentCategories).where(eq(studentCategories.studentId, studentId));
        }
      });

      const updatedStudent = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      const { password, ...studentData } = updatedStudent[0];
      
      res.json(studentData);
    } catch (error) {
      console.error("Error updating student profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Email Change
  app.put("/api/student/:studentId/email", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { email, currentPassword } = req.body;

      if (!email || !currentPassword) {
        return res.status(400).json({ error: "Email and current password are required" });
      }

      // Get student
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Verify current password
      const isPasswordValid = await verifyPassword(currentPassword, student[0].password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: "現在のパスワードが正しくありません" });
      }

      // Check if email is already in use by another student
      const existingStudent = await db.select().from(students)
        .where(eq(students.email, email))
        .limit(1);
      
      if (existingStudent.length > 0 && existingStudent[0].id !== studentId) {
        return res.status(400).json({ error: "このメールアドレスは既に使用されています" });
      }

      // Update email
      await db.update(students).set({ email }).where(eq(students.id, studentId));

      res.json({ success: true, email });
    } catch (error) {
      console.error("Error changing student email:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Password Change
  app.put("/api/student/:studentId/password", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword) {
        return res.status(400).json({ error: "新しいパスワードが必要です" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "新しいパスワードは6文字以上である必要があります" });
      }

      // Get student
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await db.update(students).set({ password: hashedPassword }).where(eq(students.id, studentId));

      res.json({ success: true });
    } catch (error) {
      console.error("Error changing student password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all student-category relationships
  app.get("/api/student-categories", isAuthenticated, async (req, res) => {
    try {
      const allStudentCategories = await db.select().from(studentCategories);
      res.json(allStudentCategories);
    } catch (error) {
      console.error("Error fetching student-categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add student to category
  app.post("/api/student-categories", isAuthenticated, async (req, res) => {
    try {
      const { studentId, categoryId } = req.body;

      if (!studentId || !categoryId) {
        return res.status(400).json({ error: "studentId and categoryId are required" });
      }

      // Check if relationship already exists
      const existing = await db.select()
        .from(studentCategories)
        .where(
          and(
            eq(studentCategories.studentId, studentId),
            eq(studentCategories.categoryId, categoryId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return res.json(existing[0]);
      }

      const newRelation = await db.insert(studentCategories).values({
        studentId,
        categoryId,
      }).returning();

      res.json(newRelation[0]);
    } catch (error) {
      console.error("Error adding student to category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Remove student from category
  app.delete("/api/student-categories/:studentId/:categoryId", isAuthenticated, async (req, res) => {
    try {
      const { studentId, categoryId } = req.params;

      await db.delete(studentCategories)
        .where(
          and(
            eq(studentCategories.studentId, studentId),
            eq(studentCategories.categoryId, categoryId)
          )
        );

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing student from category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Category Selection
  app.get("/api/student/:studentId/categories", isAuthenticated, async (req, res) => {
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

  app.post("/api/student/:studentId/categories", isAuthenticated, async (req, res) => {
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

  // Student Schedules (all schedules in the student's team)
  app.get("/api/student/:studentId/schedules", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;
      
      // Get student to find their team
      const student = await db.select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);
      
      if (student.length === 0) {
        return res.json([]);
      }

      const teamId = student[0].teamId;
      
      // Get all schedules for the team
      const scheds = await db.select()
        .from(schedules)
        .where(eq(schedules.teamId, teamId));

      res.json(scheds);
    } catch (error) {
      console.error("Error fetching student schedules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Student Attendance
  app.get("/api/student/:studentId/attendance", isAuthenticated, async (req, res) => {
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

  app.post("/api/student/:studentId/attendance", isAuthenticated, async (req, res) => {
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

  // Update attendance (for moving participants between schedules)
  app.put("/api/attendances/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      await db.update(attendances)
        .set(updateData)
        .where(eq(attendances.id, id));

      const updated = await db.select().from(attendances).where(eq(attendances.id, id)).limit(1);
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating attendance:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Shared Documents
  app.get("/api/team/:teamId/documents", isAuthenticated, async (req, res) => {
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

  // Team Info Update
  app.put("/api/teams/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { coachId, ...updateData } = req.body;

      // coachId is required for authorization
      if (!coachId) {
        return res.status(400).json({ error: "coachId is required" });
      }

      // Get the team to check ownership
      const team = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Verify the coach exists
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Check if coach is the owner of this team
      if (team[0].ownerCoachId !== coachId) {
        return res.status(403).json({ error: "Only the team representative can edit team information" });
      }

      await db.update(teams)
        .set(updateData)
        .where(eq(teams.id, id));

      const updated = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Folders Management
  app.get("/api/folders", isAuthenticated, async (req, res) => {
    try {
      const { parentFolderId, teamId } = req.query;
      
      let result;
      if (parentFolderId && teamId) {
        result = await db.select().from(folders).where(and(
          eq(folders.parentFolderId, parentFolderId as string),
          eq(folders.teamId, teamId as string)
        ));
      } else if (parentFolderId) {
        result = await db.select().from(folders).where(eq(folders.parentFolderId, parentFolderId as string));
      } else if (teamId) {
        result = await db.select().from(folders).where(and(
          isNull(folders.parentFolderId),
          eq(folders.teamId, teamId as string)
        ));
      } else {
        result = await db.select().from(folders).where(isNull(folders.parentFolderId));
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/folders", isAuthenticated, async (req, res) => {
    try {
      const { name, parentFolderId, teamId } = req.body;

      if (!name || !teamId) {
        return res.status(400).json({ error: "Name and teamId are required" });
      }

      const newFolder = await db.insert(folders).values({
        name,
        parentFolderId: parentFolderId || null,
        teamId,
      }).returning();

      res.status(201).json(newFolder[0]);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/folders/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      await db.delete(folders).where(eq(folders.id, id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting folder:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Documents Management
  app.get("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { folderId, teamId } = req.query;
      
      let result: any[];
      if (folderId) {
        result = await db.select().from(sharedDocuments).where(eq(sharedDocuments.folderId, folderId as string));
      } else if (teamId) {
        result = await db.select().from(sharedDocuments).where(and(
          eq(sharedDocuments.teamId, teamId as string),
          isNull(sharedDocuments.folderId)
        ));
      } else {
        result = [];
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      const { title, fileUrl, fileName, fileSize, teamId, folderId } = req.body;
      
      if (!title || !fileUrl || !teamId) {
        return res.status(400).json({ error: "title, fileUrl, and teamId are required" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ error: "User not authenticated" });
      }

      const objectStorageService = new ObjectStorageService();
      
      // Set ACL policy for the uploaded file (team-wide public visibility)
      const normalizedPath = await objectStorageService.trySetObjectEntityAclPolicy(
        fileUrl,
        {
          owner: userId,
          visibility: "public", // Team members can access
        }
      );

      // Save document to database
      const newDocument = await db.insert(sharedDocuments).values({
        title,
        teamId,
        folderId: folderId || null,
        fileUrl: normalizedPath,
        fileName,
        fileSize,
      }).returning();

      res.status(201).json(newDocument[0]);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      await db.delete(sharedDocuments).where(eq(sharedDocuments.id, id));
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Students Management
  app.get("/api/students", isAuthenticated, async (req, res) => {
    try {
      // Disable caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const { teamId } = req.query;
      
      let allStudents;
      if (teamId) {
        allStudents = await db.select().from(students).where(eq(students.teamId, teamId as string));
      } else {
        allStudents = await db.select().from(students);
      }
      
      res.json(allStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/students/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;

      // Delete related data first
      await db.delete(attendances).where(eq(attendances.studentId, id));
      await db.delete(studentCategories).where(eq(studentCategories.studentId, id));
      await db.delete(tuitionPayments).where(eq(tuitionPayments.studentId, id));
      
      // Delete sibling links where this student is either studentId1 or studentId2
      await db.delete(siblingLinks).where(eq(siblingLinks.studentId1, id));
      await db.delete(siblingLinks).where(eq(siblingLinks.studentId2, id));

      // Delete the student
      await db.delete(students).where(eq(students.id, id));

      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tuition Payments
  app.get("/api/tuition-payments", isAuthenticated, async (req, res) => {
    try {
      const { year, month, teamId } = req.query;

      let result;
      if (year && month && teamId) {
        result = await db.select().from(tuitionPayments).where(and(
          eq(tuitionPayments.teamId, teamId as string),
          eq(tuitionPayments.year, parseInt(year as string)),
          eq(tuitionPayments.month, parseInt(month as string))
        ));
      } else if (year && month) {
        result = await db.select().from(tuitionPayments).where(and(
          eq(tuitionPayments.year, parseInt(year as string)),
          eq(tuitionPayments.month, parseInt(month as string))
        ));
      } else if (teamId) {
        result = await db.select().from(tuitionPayments).where(
          eq(tuitionPayments.teamId, teamId as string)
        );
      } else {
        result = await db.select().from(tuitionPayments);
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching tuition payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tuition-payments", isAuthenticated, async (req, res) => {
    try {
      const { studentId, baseAmount, discount, annualFee, entranceFee, insuranceFee, spotFee, amount, isPaid, year, month, category } = req.body;

      if (!studentId || !year || !month) {
        return res.status(400).json({ error: "studentId, year, and month are required" });
      }

      // Check if payment record already exists
      const existing = await db.select()
        .from(tuitionPayments)
        .where(and(
          eq(tuitionPayments.studentId, studentId),
          eq(tuitionPayments.year, year),
          eq(tuitionPayments.month, month)
        ))
        .limit(1);

      // Get student's team
      const student = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      if (student.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      if (existing.length > 0) {
        // Update existing record
        await db.update(tuitionPayments)
          .set({ 
            baseAmount: baseAmount ?? existing[0].baseAmount,
            discount: discount ?? existing[0].discount,
            annualFee: annualFee ?? existing[0].annualFee,
            entranceFee: entranceFee ?? existing[0].entranceFee,
            insuranceFee: insuranceFee ?? existing[0].insuranceFee,
            spotFee: spotFee ?? existing[0].spotFee,
            amount: amount ?? existing[0].amount,
            isPaid, 
            category: category || null,
            paidAt: isPaid ? new Date() : null,
            updatedAt: new Date()
          })
          .where(eq(tuitionPayments.id, existing[0].id));

        const updated = await db.select()
          .from(tuitionPayments)
          .where(eq(tuitionPayments.id, existing[0].id))
          .limit(1);
        res.json(updated[0]);
      } else {
        // Create new record
        const newPayment = await db.insert(tuitionPayments).values({
          studentId,
          teamId: student[0].teamId,
          year,
          month,
          baseAmount: baseAmount ?? 0,
          discount: discount ?? 0,
          annualFee: annualFee ?? 0,
          entranceFee: entranceFee ?? 0,
          insuranceFee: insuranceFee ?? 0,
          spotFee: spotFee ?? 0,
          amount: amount ?? 0,
          isPaid,
          category: category || null,
          paidAt: isPaid ? new Date() : null,
        }).returning();

        res.status(201).json(newPayment[0]);
      }
    } catch (error) {
      console.error("Error updating tuition payment:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reset unpaid tuition payments for a specific month
  app.post("/api/tuition-payments/reset-unpaid", isAuthenticated, async (req, res) => {
    try {
      const { teamId, year, month } = req.body;

      if (!teamId || !year || !month) {
        return res.status(400).json({ error: "teamId, year, and month are required" });
      }

      // Get team details
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Delete all unpaid payments for this month
      await db.delete(tuitionPayments)
        .where(and(
          eq(tuitionPayments.teamId, teamId),
          eq(tuitionPayments.year, year),
          eq(tuitionPayments.month, month),
          eq(tuitionPayments.isPaid, false)
        ));

      // Get all students for the team
      const teamStudents = await db.select().from(students).where(eq(students.teamId, teamId));

      let resetCount = 0;

      for (const student of teamStudents) {
        // Check if a paid payment already exists
        const paidPayment = await db.select()
          .from(tuitionPayments)
          .where(and(
            eq(tuitionPayments.studentId, student.id),
            eq(tuitionPayments.year, year),
            eq(tuitionPayments.month, month),
            eq(tuitionPayments.isPaid, true)
          ))
          .limit(1);

        // Only create if there's no paid payment
        if (paidPayment.length === 0) {
          // Determine base amount based on student type
          let baseAmount = 0;
          if (student.playerType === "team") {
            baseAmount = team[0].monthlyFeeMember || 0;
          } else if (student.playerType === "school") {
            baseAmount = team[0].monthlyFeeSchool || 0;
          }

          // Set annual fee for the configured month (default: April)
          let annualFee = 0;
          const annualFeeMonth = team[0].annualFeeMonth || 4;
          if (month === annualFeeMonth) {
            annualFee = team[0].annualFee || 0;
          }

          // Set insurance fee for the configured month (default: April)
          let insuranceFee = 0;
          const insuranceFeeMonth = team[0].insuranceFeeMonth || 4;
          if (month === insuranceFeeMonth) {
            insuranceFee = team[0].insuranceFee || 0;
          }

          // Set entrance fee for the registration month only
          let entranceFee = 0;
          const registrationDate = new Date(student.createdAt);
          const registrationYear = registrationDate.getFullYear();
          const registrationMonth = registrationDate.getMonth() + 1;
          
          if (year === registrationYear && month === registrationMonth) {
            entranceFee = team[0].entranceFee || 0;
          }

          // Check if student has approved sibling links
          const approvedSiblingLinks = await db.select()
            .from(siblingLinks)
            .where(
              and(
                or(
                  eq(siblingLinks.studentId1, student.id),
                  eq(siblingLinks.studentId2, student.id)
                ),
                eq(siblingLinks.status, "approved")
              )
            );

          // Apply sibling discount if student has approved siblings
          let discount = 0;
          if (approvedSiblingLinks.length > 0) {
            discount = team[0].siblingDiscount || 0;
          }

          const spotFee = 0;
          const totalAmount = baseAmount - discount + annualFee + entranceFee + insuranceFee + spotFee;

          // Create payment record
          await db.insert(tuitionPayments).values({
            studentId: student.id,
            teamId,
            year,
            month,
            baseAmount,
            discount,
            annualFee,
            entranceFee,
            insuranceFee,
            spotFee,
            amount: totalAmount,
            isPaid: false,
            category: student.playerType === "team" ? "team" : student.playerType === "school" ? "school" : null,
          });

          resetCount++;
        }
      }

      res.json({ 
        success: true, 
        resetCount,
        message: `${resetCount}件の未入金データを初期化しました`
      });
    } catch (error) {
      console.error("Error resetting tuition payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard Statistics
  app.get("/api/stats/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      const { period = "this-week" } = req.query;

      // Get team's categories
      const teamCategories = await db.select().from(categories).where(eq(categories.teamId, teamId));
      const categoryIds = teamCategories.map(cat => cat.id);

      if (categoryIds.length === 0) {
        return res.json({
          upcomingEvents: 0,
          teamMembers: 0,
          activeCoaches: 0,
          schedules: []
        });
      }

      // Calculate date range based on period
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let startDate = new Date(today);
      let endDate = new Date(today);

      switch (period) {
        case "this-week":
          const dayOfWeek = today.getDay();
          startDate.setDate(today.getDate() - dayOfWeek);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case "next-week":
          // Calculate this week's Sunday
          const currentDayOfWeek = today.getDay();
          const thisWeekSunday = new Date(today);
          thisWeekSunday.setDate(today.getDate() - currentDayOfWeek);
          // Next week starts 7 days after this week's Sunday
          startDate = new Date(thisWeekSunday);
          startDate.setDate(thisWeekSunday.getDate() + 7);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          break;
        case "this-month":
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          break;
        case "next-month":
          startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          break;
      }

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Count upcoming schedules
      const allSchedules = await db.select().from(schedules).where(
        inArray(schedules.categoryId, categoryIds)
      );
      
      const upcomingSchedules = allSchedules.filter(s => 
        s.date >= startDateStr && s.date <= endDateStr
      );

      // Count team members
      const teamMembers = await db.select().from(students).where(eq(students.teamId, teamId));

      // Count coaches
      const activeCoaches = await db.select().from(coaches).where(eq(coaches.teamId, teamId));

      // Get recent schedules for display
      const recentSchedules = allSchedules
        .filter(s => s.date >= today.toISOString().split('T')[0])
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);

      res.json({
        upcomingEvents: upcomingSchedules.length,
        teamMembers: teamMembers.length,
        activeCoaches: activeCoaches.length,
        schedules: recentSchedules
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
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

  // Coach Profile Management (duplicate - consider removing)
  app.get("/api/coach/:coachId", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Don't send password
      const { password, ...coachData } = coach[0];
      res.json(coachData);
    } catch (error) {
      console.error("Error fetching coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/coach/:coachId", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      const { lastName, firstName, lastNameKana, firstNameKana, photoUrl, bio, position } = req.body;

      const updateData: any = {};
      if (lastName !== undefined) updateData.lastName = lastName;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastNameKana !== undefined) updateData.lastNameKana = lastNameKana;
      if (firstNameKana !== undefined) updateData.firstNameKana = firstNameKana;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (bio !== undefined) updateData.bio = bio;
      if (position !== undefined) updateData.position = position;

      const updated = await db.update(coaches)
        .set(updateData)
        .where(eq(coaches.id, coachId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      const { password, ...coachData } = updated[0];
      res.json(coachData);
    } catch (error) {
      console.error("Error updating coach profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/coach/:coachId/password", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current and new password are required" });
      }

      // Get current coach
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, coach[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "現在のパスワードが正しくありません" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password
      await db.update(coaches)
        .set({ password: hashedPassword })
        .where(eq(coaches.id, coachId));

      res.json({ success: true, message: "パスワードを変更しました" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/coach/:coachId/email", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      const { newEmail, currentPassword } = req.body;

      if (!newEmail || !currentPassword) {
        return res.status(400).json({ error: "New email and current password are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        return res.status(400).json({ error: "無効なメールアドレス形式です" });
      }

      // Get current coach
      const coach = await db.select().from(coaches).where(eq(coaches.id, coachId)).limit(1);
      
      if (coach.length === 0) {
        return res.status(404).json({ error: "Coach not found" });
      }

      // Verify current password
      const isValid = await verifyPassword(currentPassword, coach[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "現在のパスワードが正しくありません" });
      }

      // Check if email is already in use by another coach
      const existingCoach = await db.select().from(coaches)
        .where(eq(coaches.email, newEmail))
        .limit(1);
      
      if (existingCoach.length > 0 && existingCoach[0].id !== coachId) {
        return res.status(409).json({ error: "このメールアドレスは既に使用されています" });
      }

      // Update email
      await db.update(coaches)
        .set({ email: newEmail })
        .where(eq(coaches.id, coachId));

      res.json({ success: true, message: "メールアドレスを変更しました" });
    } catch (error) {
      console.error("Error changing email:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get team coaches (for student view)
  app.get("/api/team/:teamId/coaches", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      
      const teamCoaches = await db.select().from(coaches).where(eq(coaches.teamId, teamId));
      
      // Don't send passwords
      const coachesData = teamCoaches.map(({ password, ...coach }) => coach);
      
      res.json(coachesData);
    } catch (error) {
      console.error("Error fetching team coaches:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // ==================== Admin Routes ====================
  
  // Admin registration (only if no admins exist)
  app.post("/api/admin/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "名前、メールアドレス、パスワードが必要です" });
      }

      // Check if any admin already exists
      const existingAdmins = await db.select().from(admins);
      
      if (existingAdmins.length > 0) {
        return res.status(403).json({ error: "管理者は既に登録されています" });
      }

      // Check if email is already in use
      const existingAdmin = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      
      if (existingAdmin.length > 0) {
        return res.status(409).json({ error: "このメールアドレスは既に使用されています" });
      }

      const hashedPassword = await hashPassword(password);

      const newAdmin = await db.insert(admins).values({
        name,
        email,
        password: hashedPassword,
      }).returning();

      const { password: _, ...adminData } = newAdmin[0];
      res.json(adminData);
    } catch (error) {
      console.error("Error during admin registration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Check if admin setup is needed
  app.get("/api/admin/setup-needed", async (req, res) => {
    try {
      const existingAdmins = await db.select().from(admins);
      res.json({ setupNeeded: existingAdmins.length === 0 });
    } catch (error) {
      console.error("Error checking admin setup:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
  // Admin login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "メールアドレスとパスワードが必要です" });
      }

      const admin = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      
      if (admin.length === 0) {
        return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
      }

      const isValid = await verifyPassword(password, admin[0].password);
      if (!isValid) {
        return res.status(401).json({ error: "メールアドレスまたはパスワードが正しくありません" });
      }

      const { password: _, ...adminData } = admin[0];
      res.json(adminData);
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get admin dashboard stats
  app.get("/api/admin/stats", async (req, res) => {
    try {
      const teamCount = await db.select({ count: count() }).from(teams);
      const coachCount = await db.select({ count: count() }).from(coaches);
      const studentCount = await db.select({ count: count() }).from(students);
      const eventCount = await db.select({ count: count() }).from(schedules);
      
      res.json({
        totalTeams: teamCount[0]?.count || 0,
        totalCoaches: coachCount[0]?.count || 0,
        totalStudents: studentCount[0]?.count || 0,
        totalEvents: eventCount[0]?.count || 0,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all teams with statistics
  app.get("/api/admin/teams", async (req, res) => {
    try {
      const allTeams = await db.select().from(teams);
      
      const teamsWithStats = await Promise.all(
        allTeams.map(async (team) => {
          const coachCount = await db.select({ count: count() })
            .from(coaches)
            .where(eq(coaches.teamId, team.id));
          
          const memberCount = await db.select({ count: count() })
            .from(students)
            .where(eq(students.teamId, team.id));
          
          const eventCount = await db.select({ count: count() })
            .from(schedules)
            .where(eq(schedules.teamId, team.id));
          
          return {
            ...team,
            coachCount: coachCount[0]?.count || 0,
            memberCount: memberCount[0]?.count || 0,
            eventCount: eventCount[0]?.count || 0,
          };
        })
      );
      
      res.json(teamsWithStats);
    } catch (error) {
      console.error("Error fetching admin teams:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get team details with coaches and members
  app.get("/api/admin/teams/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      
      const team = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
      
      if (team.length === 0) {
        return res.status(404).json({ error: "Team not found" });
      }
      
      const teamCoaches = await db.select().from(coaches).where(eq(coaches.teamId, teamId));
      const teamMembers = await db.select().from(students).where(eq(students.teamId, teamId));
      
      // Don't send passwords
      const coachesData = teamCoaches.map(({ password, ...coach }) => coach);
      const membersData = teamMembers.map(({ password, ...member }) => member);
      
      res.json({
        ...team[0],
        coaches: coachesData,
        members: membersData,
      });
    } catch (error) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all admin accounts
  app.get("/api/admin/accounts", async (req, res) => {
    try {
      const allAdmins = await db.select().from(admins);
      
      // Don't send passwords
      const adminsData = allAdmins.map(({ password, ...admin }) => admin);
      
      res.json(adminsData);
    } catch (error) {
      console.error("Error fetching admin accounts:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add a new admin account (by existing admin)
  app.post("/api/admin/accounts", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: "名前、メールアドレス、パスワードが必要です" });
      }

      // Check if email is already in use
      const existingAdmin = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
      
      if (existingAdmin.length > 0) {
        return res.status(409).json({ error: "このメールアドレスは既に使用されています" });
      }

      const hashedPassword = await hashPassword(password);

      const newAdmin = await db.insert(admins).values({
        name,
        email,
        password: hashedPassword,
      }).returning();

      const { password: _, ...adminData } = newAdmin[0];
      res.json(adminData);
    } catch (error) {
      console.error("Error creating admin account:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Activity Logs
  app.get("/api/activity-logs/:teamId", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const logs = await db.select()
        .from(activityLogs)
        .where(eq(activityLogs.teamId, teamId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(limit);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/activity-logs", isAuthenticated, async (req, res) => {
    try {
      const newLog = await db.insert(activityLogs).values(req.body).returning();
      res.json(newLog[0]);
    } catch (error) {
      console.error("Error creating activity log:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Coach Categories
  app.get("/api/coach-categories/:coachId", isAuthenticated, async (req, res) => {
    try {
      const { coachId } = req.params;
      const coachCats = await db.select()
        .from(coachCategories)
        .where(eq(coachCategories.coachId, coachId));
      res.json(coachCats);
    } catch (error) {
      console.error("Error fetching coach categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/coach-categories", isAuthenticated, async (req, res) => {
    try {
      const { coachId, categoryId } = req.body;
      
      if (!coachId || !categoryId) {
        return res.status(400).json({ error: "coachId and categoryId are required" });
      }
      
      // Check if relationship already exists
      const existing = await db.select()
        .from(coachCategories)
        .where(
          and(
            eq(coachCategories.coachId, coachId),
            eq(coachCategories.categoryId, categoryId)
          )
        )
        .limit(1);
      
      if (existing.length > 0) {
        return res.json(existing[0]);
      }
      
      const newRelation = await db.insert(coachCategories).values({
        coachId,
        categoryId,
      }).returning();
      
      res.json(newRelation[0]);
    } catch (error) {
      console.error("Error adding coach category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/coach-categories/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(coachCategories).where(eq(coachCategories.id, id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting coach category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Sibling Links - Send a link request
  app.post("/api/sibling-links", isAuthenticated, async (req, res) => {
    try {
      const { studentId, siblingEmail } = req.body;

      if (!studentId || !siblingEmail) {
        return res.status(400).json({ error: "studentId and siblingEmail are required" });
      }

      // Find the sibling by email
      const sibling = await db.select()
        .from(students)
        .where(eq(students.email, siblingEmail))
        .limit(1);

      if (sibling.length === 0) {
        return res.status(404).json({ error: "指定されたメールアドレスの学生が見つかりません" });
      }

      const siblingId = sibling[0].id;

      // Cannot link to yourself
      if (siblingId === studentId) {
        return res.status(400).json({ error: "自分自身を兄弟として登録することはできません" });
      }

      // Check if teams match
      const requestingStudent = await db.select()
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1);

      if (requestingStudent.length === 0) {
        return res.status(404).json({ error: "Student not found" });
      }

      if (requestingStudent[0].teamId !== sibling[0].teamId) {
        return res.status(400).json({ error: "異なるチームの学生とは兄弟登録できません" });
      }

      // Check if link already exists (either direction)
      const existingLink = await db.select()
        .from(siblingLinks)
        .where(
          or(
            and(
              eq(siblingLinks.studentId1, studentId),
              eq(siblingLinks.studentId2, siblingId)
            ),
            and(
              eq(siblingLinks.studentId1, siblingId),
              eq(siblingLinks.studentId2, studentId)
            )
          )
        )
        .limit(1);

      if (existingLink.length > 0) {
        return res.status(400).json({ error: "既に兄弟として登録済み、または申請中です" });
      }

      // Create the link request
      const newLink = await db.insert(siblingLinks).values({
        studentId1: studentId,
        studentId2: siblingId,
        status: "pending",
        requestedBy: studentId,
      }).returning();

      // Send email notification to the sibling
      const resend = new Resend(process.env.RESEND_API_KEY);
      const host = req.get('host') || '';
      const protocol = req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;
      const profileUrl = `${baseUrl}/player/profile`;
      
      const requesterName = `${requestingStudent[0].lastName} ${requestingStudent[0].firstName}`;
      const siblingName = `${sibling[0].lastName} ${sibling[0].firstName}`;

      try {
        await resend.emails.send({
          from: "TEAMO <noreply@sorte.work>",
          to: siblingEmail,
          subject: "兄弟アカウント連携リクエスト - TEAMO",
          html: `
            <h2>兄弟アカウント連携リクエスト</h2>
            <p>${siblingName} 様</p>
            <p>${requesterName}さんから兄弟アカウント連携のリクエストが届いています。</p>
            <p>プロフィール設定画面で承認または拒否することができます：</p>
            <p><a href="${profileUrl}">${profileUrl}</a></p>
            <p>兄弟アカウントを連携すると、ログインし直すことなく簡単にアカウントを切り替えることができます。</p>
          `,
        });
        console.log("Sibling link request email sent to:", siblingEmail);
      } catch (emailError) {
        console.error("Error sending sibling link email:", emailError);
        // Continue even if email fails
      }

      res.json(newLink[0]);
    } catch (error) {
      console.error("Error creating sibling link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get sibling links for a student
  app.get("/api/sibling-links/:studentId", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;

      // Get all links where this student is involved
      const links = await db.select()
        .from(siblingLinks)
        .where(
          or(
            eq(siblingLinks.studentId1, studentId),
            eq(siblingLinks.studentId2, studentId)
          )
        );

      // Get student details for each link
      const enrichedLinks = await Promise.all(links.map(async (link) => {
        const otherStudentId = link.studentId1 === studentId ? link.studentId2 : link.studentId1;
        const otherStudent = await db.select()
          .from(students)
          .where(eq(students.id, otherStudentId))
          .limit(1);

        return {
          ...link,
          otherStudent: otherStudent[0] || null,
          isPendingApproval: link.status === "pending" && link.requestedBy !== studentId,
          isSentRequest: link.status === "pending" && link.requestedBy === studentId,
        };
      }));

      res.json(enrichedLinks);
    } catch (error) {
      console.error("Error fetching sibling links:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Approve a sibling link
  app.put("/api/sibling-links/:linkId/approve", isAuthenticated, async (req, res) => {
    try {
      const { linkId } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: "studentId is required" });
      }

      // Get the link
      const link = await db.select()
        .from(siblingLinks)
        .where(eq(siblingLinks.id, linkId))
        .limit(1);

      if (link.length === 0) {
        return res.status(404).json({ error: "Link not found" });
      }

      // Verify this student can approve (must be the recipient, not the requester)
      if (link[0].requestedBy === studentId) {
        return res.status(403).json({ error: "自分が送信したリクエストは承認できません" });
      }

      if (link[0].studentId1 !== studentId && link[0].studentId2 !== studentId) {
        return res.status(403).json({ error: "この兄弟リンクの承認権限がありません" });
      }

      // Approve the link
      const updated = await db.update(siblingLinks)
        .set({
          status: "approved",
          approvedAt: new Date(),
        })
        .where(eq(siblingLinks.id, linkId))
        .returning();

      // Send email notification to the requester
      const requesterId = link[0].requestedBy;
      const approverId = studentId;
      
      const requester = await db.select()
        .from(students)
        .where(eq(students.id, requesterId))
        .limit(1);
      
      const approver = await db.select()
        .from(students)
        .where(eq(students.id, approverId))
        .limit(1);

      if (requester.length > 0 && approver.length > 0) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const requesterName = `${requester[0].lastName} ${requester[0].firstName}`;
        const approverName = `${approver[0].lastName} ${approver[0].firstName}`;

        try {
          await resend.emails.send({
            from: "TEAMO <noreply@sorte.work>",
            to: requester[0].email,
            subject: "兄弟アカウント連携が承認されました - TEAMO",
            html: `
              <h2>兄弟アカウント連携が承認されました</h2>
              <p>${requesterName} 様</p>
              <p>${approverName}さんが兄弟アカウント連携を承認しました。</p>
              <p>これで、ログインし直すことなく簡単にアカウントを切り替えることができます。</p>
              <p>アカウント切り替えは、画面右上のアカウントメニューから行えます。</p>
            `,
          });
          console.log("Sibling link approval email sent to:", requester[0].email);
        } catch (emailError) {
          console.error("Error sending approval email:", emailError);
          // Continue even if email fails
        }
      }

      res.json(updated[0]);
    } catch (error) {
      console.error("Error approving sibling link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete/reject a sibling link
  app.delete("/api/sibling-links/:linkId", isAuthenticated, async (req, res) => {
    try {
      const { linkId } = req.params;
      const { studentId } = req.body;

      if (!studentId) {
        return res.status(400).json({ error: "studentId is required" });
      }

      // Get the link to verify permissions
      const link = await db.select()
        .from(siblingLinks)
        .where(eq(siblingLinks.id, linkId))
        .limit(1);

      if (link.length === 0) {
        return res.status(404).json({ error: "Link not found" });
      }

      // Verify this student is part of the link
      if (link[0].studentId1 !== studentId && link[0].studentId2 !== studentId) {
        return res.status(403).json({ error: "この兄弟リンクの削除権限がありません" });
      }

      await db.delete(siblingLinks).where(eq(siblingLinks.id, linkId));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting sibling link:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get approved siblings for switching
  app.get("/api/siblings/:studentId", isAuthenticated, async (req, res) => {
    try {
      const { studentId } = req.params;

      // Get all approved links
      const approvedLinks = await db.select()
        .from(siblingLinks)
        .where(
          and(
            or(
              eq(siblingLinks.studentId1, studentId),
              eq(siblingLinks.studentId2, studentId)
            ),
            eq(siblingLinks.status, "approved")
          )
        );

      // Get sibling details
      const siblings = await Promise.all(approvedLinks.map(async (link) => {
        const siblingId = link.studentId1 === studentId ? link.studentId2 : link.studentId1;
        const sibling = await db.select()
          .from(students)
          .where(eq(students.id, siblingId))
          .limit(1);

        return sibling[0] || null;
      }));

      res.json(siblings.filter(s => s !== null));
    } catch (error) {
      console.error("Error fetching siblings:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get sibling status for all students in a team (for display purposes)
  app.get("/api/sibling-links/team/:teamId/status", isAuthenticated, async (req, res) => {
    try {
      const { teamId } = req.params;

      // Get all students in the team
      const teamStudents = await db.select().from(students).where(eq(students.teamId, teamId));
      const studentIds = teamStudents.map(s => s.id);
      
      // Get all approved links (no filtering by student ID in query)
      const allApprovedLinks = await db.select()
        .from(siblingLinks)
        .where(eq(siblingLinks.status, "approved"));

      // Filter links that involve students from this team
      const relevantLinks = allApprovedLinks.filter(link =>
        studentIds.includes(link.studentId1) || studentIds.includes(link.studentId2)
      );

      // Create a map of student ID to sibling information
      const siblingInfoMap: Record<string, { hasSibling: boolean, siblings: Array<{ id: string, lastName: string, firstName: string }> }> = {};
      
      for (const student of teamStudents) {
        // Find all sibling links for this student
        const studentLinks = relevantLinks.filter(link => 
          link.studentId1 === student.id || link.studentId2 === student.id
        );

        if (studentLinks.length === 0) {
          siblingInfoMap[student.id] = { hasSibling: false, siblings: [] };
        } else {
          // Get sibling details
          const siblings = await Promise.all(studentLinks.map(async (link) => {
            const siblingId = link.studentId1 === student.id ? link.studentId2 : link.studentId1;
            const sibling = await db.select()
              .from(students)
              .where(eq(students.id, siblingId))
              .limit(1);

            if (sibling.length > 0) {
              return {
                id: sibling[0].id,
                lastName: sibling[0].lastName,
                firstName: sibling[0].firstName
              };
            }
            return null;
          }));

          siblingInfoMap[student.id] = {
            hasSibling: true,
            siblings: siblings.filter(s => s !== null) as Array<{ id: string, lastName: string, firstName: string }>
          };
        }
      }

      res.json(siblingInfoMap);
    } catch (error) {
      console.error("Error fetching team sibling status:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
