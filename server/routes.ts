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
import { teams, students, coaches, studentCategories, attendances, schedules, categories, sharedDocuments, folders, tuitionPayments, venues } from "@shared/schema";
import { eq, and, inArray, isNull, or } from "drizzle-orm";
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

  // Schedule Endpoints
  app.get("/api/schedules", async (req, res) => {
    try {
      const allSchedules = await db.select().from(schedules);
      res.json(allSchedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/schedules", async (req, res) => {
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

  app.put("/api/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { updateType, ...updateData } = req.body; // updateType: "this" | "all"

      if (updateType === "all") {
        // Get the schedule to find its parent or use itself as parent
        const schedule = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
        if (schedule.length === 0) {
          return res.status(404).json({ error: "Schedule not found" });
        }

        const parentId = schedule[0].parentScheduleId || schedule[0].id;

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
      res.json(updated[0]);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/schedules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { deleteType } = req.query; // deleteType: "this" | "all"

      if (deleteType === "all") {
        // Get the schedule to find its parent or use itself as parent
        const schedule = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
        if (schedule.length === 0) {
          return res.status(404).json({ error: "Schedule not found" });
        }

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

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Attendance Endpoints
  app.get("/api/attendances", async (req, res) => {
    try {
      const allAttendances = await db.select().from(attendances);
      res.json(allAttendances);
    } catch (error) {
      console.error("Error fetching attendances:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Category Endpoints
  app.get("/api/categories/:teamId", async (req, res) => {
    try {
      const { teamId } = req.params;
      
      if (!teamId) {
        return res.status(400).json({ error: "teamId is required" });
      }
      
      const teamCategories = await db.select()
        .from(categories)
        .where(eq(categories.teamId, teamId));
      
      res.json(teamCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/categories", async (req, res) => {
    try {
      const { teamId, name, description } = req.body;

      if (!teamId || !name) {
        return res.status(400).json({ error: "teamId and name are required" });
      }

      const newCategory = await db.insert(categories).values({
        teamId,
        name,
        description,
      }).returning();

      res.status(201).json(newCategory[0]);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/categories/:id", async (req, res) => {
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
  app.get("/api/teams", async (req, res) => {
    try {
      const allTeams = await db.select().from(teams);
      res.json(allTeams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/teams", async (req, res) => {
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
        teamCode,
      }).returning();

      // Create coach account for the owner
      const hashedPassword = await hashPassword(password);
      const newCoach = await db.insert(coaches).values({
        name: ownerName,
        email: ownerEmail,
        password: hashedPassword,
        teamId: newTeam[0].id,
        role: "owner",
      }).returning();

      res.status(201).json({
        team: newTeam[0],
        coach: {
          id: newCoach[0].id,
          name: newCoach[0].name,
          email: newCoach[0].email,
          teamId: newCoach[0].teamId,
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

  // Coach Authentication
  app.post("/api/coach/register", async (req, res) => {
    try {
      console.log("Coach register request received:", req.body);
      const { name, email, password, teamId } = req.body;

      if (!name || !email || !password || !teamId) {
        console.log("Missing required fields:", { name: !!name, email: !!email, password: !!password, teamId: !!teamId });
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
        name,
        email,
        password: hashedPassword,
        teamId,
      }).returning();

      res.status(201).json({ coach: { id: newCoach[0].id, name: newCoach[0].name, email: newCoach[0].email } });
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
          name: coach[0].name, 
          email: coach[0].email,
          teamId: coach[0].teamId 
        } 
      });
    } catch (error) {
      console.error("Error logging in coach:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/coach/:coachId", async (req, res) => {
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
  app.get("/api/teams/:teamId/coaches", async (req, res) => {
    try {
      const { teamId } = req.params;

      const teamCoaches = await db.select({
        id: coaches.id,
        name: coaches.name,
        email: coaches.email,
        role: coaches.role,
        createdAt: coaches.createdAt,
      }).from(coaches).where(eq(coaches.teamId, teamId));

      res.json(teamCoaches);
    } catch (error) {
      console.error("Error fetching coaches:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/coaches/:coachId", async (req, res) => {
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

  app.patch("/api/coaches/:coachId/password", async (req, res) => {
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
  app.get("/api/teams/:teamId/venues", async (req, res) => {
    try {
      const { teamId } = req.params;

      const teamVenues = await db.select().from(venues).where(eq(venues.teamId, teamId));
      res.json(teamVenues);
    } catch (error) {
      console.error("Error fetching venues:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/venues", async (req, res) => {
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

  app.delete("/api/venues/:venueId", async (req, res) => {
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

  // Student Profile
  app.get("/api/student/:studentId", async (req, res) => {
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

  app.patch("/api/student/:studentId", async (req, res) => {
    try {
      const { studentId } = req.params;
      const { name, schoolName, birthDate, photoUrl } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (schoolName !== undefined) updateData.schoolName = schoolName;
      if (birthDate !== undefined) updateData.birthDate = birthDate;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      await db.update(students).set(updateData).where(eq(students.id, studentId));

      const updatedStudent = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
      const { password, ...studentData } = updatedStudent[0];
      
      res.json(studentData);
    } catch (error) {
      console.error("Error updating student profile:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all student-category relationships
  app.get("/api/student-categories", async (req, res) => {
    try {
      const allStudentCategories = await db.select().from(studentCategories);
      res.json(allStudentCategories);
    } catch (error) {
      console.error("Error fetching student-categories:", error);
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

  // Update attendance (for moving participants between schedules)
  app.put("/api/attendances/:id", async (req, res) => {
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

  // Team Info Update
  app.put("/api/teams/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

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
  app.get("/api/folders", async (req, res) => {
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

  app.post("/api/folders", async (req, res) => {
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

  app.delete("/api/folders/:id", async (req, res) => {
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
  app.get("/api/documents", async (req, res) => {
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

  app.delete("/api/documents/:id", async (req, res) => {
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
  app.get("/api/students", async (req, res) => {
    try {
      // Disable caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      const allStudents = await db.select().from(students);
      res.json(allStudents);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/students/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Delete related data first
      await db.delete(attendances).where(eq(attendances.studentId, id));
      await db.delete(studentCategories).where(eq(studentCategories.studentId, id));

      // Delete the student
      await db.delete(students).where(eq(students.id, id));

      res.status(200).json({ message: "Student deleted successfully" });
    } catch (error) {
      console.error("Error deleting student:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tuition Payments
  app.get("/api/tuition-payments", async (req, res) => {
    try {
      const { year, month } = req.query;

      let result;
      if (year && month) {
        result = await db.select().from(tuitionPayments).where(and(
          eq(tuitionPayments.year, parseInt(year as string)),
          eq(tuitionPayments.month, parseInt(month as string))
        ));
      } else {
        result = await db.select().from(tuitionPayments);
      }

      res.json(result);
    } catch (error) {
      console.error("Error fetching tuition payments:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tuition-payments", async (req, res) => {
    try {
      const { studentId, amount, isPaid, year, month, category } = req.body;

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
            amount, 
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
          amount,
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

  const httpServer = createServer(app);

  return httpServer;
}
