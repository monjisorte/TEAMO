import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, time, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  teamCode: text("team_code").notNull().unique(),
  contactEmail: text("contact_email").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  teamId: varchar("team_id").notNull(),
  categoryId: varchar("category_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  categoryId: varchar("category_id").notNull(),
  venue: text("venue").notNull(),
  gatherTime: text("gather_time").notNull(),
  notes: text("notes"),
  studentCanRegister: boolean("student_can_register").notNull().default(true),
});

export const insertScheduleSchema = createInsertSchema(schedules).omit({ id: true });
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedules.$inferSelect;

export const studentCategories = pgTable("student_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  categoryId: varchar("category_id").notNull(),
});

export const insertStudentCategorySchema = createInsertSchema(studentCategories).omit({ id: true });
export type InsertStudentCategory = z.infer<typeof insertStudentCategorySchema>;
export type StudentCategory = typeof studentCategories.$inferSelect;

export const attendances = pgTable("attendances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull(),
  studentId: varchar("student_id").notNull(),
  status: text("status").notNull(), // "○", "△", "×"
  comment: text("comment"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAttendanceSchema = createInsertSchema(attendances).omit({ id: true, updatedAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendances.$inferSelect;

export const venues = pgTable("venues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address"),
});

export const insertVenueSchema = createInsertSchema(venues).omit({ id: true });
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venues.$inferSelect;

export const scheduleFiles = pgTable("schedule_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scheduleId: varchar("schedule_id").notNull(),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: text("file_size"),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertScheduleFileSchema = createInsertSchema(scheduleFiles).omit({ id: true, uploadedAt: true });
export type InsertScheduleFile = z.infer<typeof insertScheduleFileSchema>;
export type ScheduleFile = typeof scheduleFiles.$inferSelect;

export const sharedDocuments = pgTable("shared_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  fileUrl: text("file_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;
export type SharedDocument = typeof sharedDocuments.$inferSelect;
