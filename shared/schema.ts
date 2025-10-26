import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, date, time, boolean, integer } from "drizzle-orm/pg-core";
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

export const sports = pgTable("sports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  order: integer("order").notNull().default(0), // 表示順
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSportSchema = createInsertSchema(sports).omit({ id: true, createdAt: true });
export type InsertSport = z.infer<typeof insertSportSchema>;
export type Sport = typeof sports.$inferSelect;

export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isSchoolOnly: boolean("is_school_only").default(false),
  displayOrder: integer("display_order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  teamCode: text("team_code").notNull().unique(),
  contactEmail: text("contact_email").notNull(),
  ownerCoachId: varchar("owner_coach_id"), // 代表コーチのID
  ownerName: text("owner_name"),
  ownerEmail: text("owner_email"),
  representativeEmail: text("representative_email"),
  address: text("address"),
  sportType: text("sport_type"), // サッカー、野球、バスケットボール、テニス、ダンス、バドミントン、ラグビー、水泳、その他
  monthlyFeeMember: integer("monthly_fee_member"), // チーム生の月会費
  monthlyFeeSchool: integer("monthly_fee_school"), // スクール生の月会費
  siblingDiscount: integer("sibling_discount"), // 兄弟割引額
  annualFee: integer("annual_fee"), // 年会費
  entranceFee: integer("entrance_fee"), // 入会金
  insuranceFee: integer("insurance_fee"), // 保険料
  annualFeeMonth: integer("annual_fee_month"), // 年会費課金月 (1-12)
  insuranceFeeMonth: integer("insurance_fee_month"), // 保険料課金月 (1-12)
  subscriptionPlan: text("subscription_plan").notNull().default("free"), // "free" | "basic"
  stripeCustomerId: text("stripe_customer_id"), // Stripe Customer ID
  stripeSubscriptionId: text("stripe_subscription_id"), // Stripe Subscription ID
  subscriptionStatus: text("subscription_status").default("active"), // "active" | "canceled" | "past_due" | "incomplete"
  subscriptionCancelAtPeriodEnd: boolean("subscription_cancel_at_period_end").default(false), // キャンセル予定かどうか
  subscriptionCurrentPeriodEnd: timestamp("subscription_current_period_end"), // 現在の請求期間終了日
  storageUsed: integer("storage_used").notNull().default(0), // 使用中のストレージ容量（バイト）
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const players = pgTable("players", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  teamId: varchar("team_id").notNull(),
  categoryId: varchar("category_id"),
  schoolName: text("school_name"),
  birthDate: date("birth_date"),
  photoUrl: text("photo_url"),
  playerType: text("player_type"), // "member" (部活生) or "school" (スクール生)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

// Keep students table for backward compatibility
export const students = pgTable("students", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  teamId: varchar("team_id").notNull(),
  categoryId: varchar("category_id"),
  schoolName: text("school_name"),
  birthDate: date("birth_date"),
  photoUrl: text("photo_url"),
  playerType: text("player_type"),
  jerseyNumber: integer("jersey_number"),
  lastName: text("last_name").notNull(), // 姓
  firstName: text("first_name").notNull(), // 名
  lastNameKana: text("last_name_kana"), // 姓 かな
  firstNameKana: text("first_name_kana"), // 名 かな
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStudentSchema = createInsertSchema(students).omit({ id: true, createdAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof students.$inferSelect;

export const coaches = pgTable("coaches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  teamId: varchar("team_id").notNull(),
  role: text("role").default("coach"), // "owner", "coach", "assistant" - 権限管理用
  position: text("position"), // 役職名（代表、ヘッドコーチ、U-8担当など）
  lastName: text("last_name").notNull(), // 性
  firstName: text("first_name").notNull(), // 名
  lastNameKana: text("last_name_kana"), // 性 かな
  firstNameKana: text("first_name_kana"), // 名 かな
  photoUrl: text("photo_url"), // プロフィール写真URL
  bio: text("bio"), // プロフィール/自己紹介
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true, createdAt: true });
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type Coach = typeof coaches.$inferSelect;

export const schedules = pgTable("schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  date: date("date").notNull(),
  startHour: integer("start_hour"),
  startMinute: integer("start_minute"),
  endHour: integer("end_hour"),
  endMinute: integer("end_minute"),
  gatherHour: integer("gather_hour"),
  gatherMinute: integer("gather_minute"),
  teamId: varchar("team_id"),
  categoryId: varchar("category_id"), // Kept for backward compatibility
  categoryIds: text("category_ids").array(), // Multiple categories support
  venue: text("venue"), // Made nullable - defaults to "未定" if not set
  notes: text("notes"),
  studentCanRegister: boolean("student_can_register").notNull().default(true),
  recurrenceRule: text("recurrence_rule"), // none, daily, weekly, monthly
  recurrenceInterval: integer("recurrence_interval").default(1), // 繰り返し間隔
  recurrenceDays: text("recurrence_days"), // 週の曜日 (JSON array: [0,1,2,3,4,5,6])
  recurrenceEndDate: date("recurrence_end_date"), // 繰り返し終了日
  parentScheduleId: varchar("parent_schedule_id"), // 繰り返しの親スケジュールID
  attachments: text("attachments"), // JSON array of file metadata: [{name, url, size, type}]
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
  teamId: varchar("team_id").notNull().references(() => teams.id),
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

export const folders = pgTable("folders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  name: text("name").notNull(),
  parentFolderId: varchar("parent_folder_id"), // null for root folders
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFolderSchema = createInsertSchema(folders).omit({ id: true, createdAt: true });
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export const sharedDocuments = pgTable("shared_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  folderId: varchar("folder_id"), // null for root documents
  title: text("title").notNull(),
  content: text("content"),
  fileUrl: text("file_url"),
  fileName: text("file_name"),
  fileSize: text("file_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSharedDocumentSchema = createInsertSchema(sharedDocuments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSharedDocument = z.infer<typeof insertSharedDocumentSchema>;
export type SharedDocument = typeof sharedDocuments.$inferSelect;

export const tuitionPayments = pgTable("tuition_payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull(),
  teamId: varchar("team_id").notNull(),
  year: integer("year").notNull(), // 2025
  month: integer("month").notNull(), // 1-12
  category: varchar("category"), // "team" | "school" | null (未選択)
  baseAmount: integer("base_amount").notNull().default(0), // 月謝（自動設定）
  discount: integer("discount").notNull().default(0), // 割引
  enrollmentOrAnnualFee: integer("enrollment_or_annual_fee").notNull().default(0), // 入会/年会費（旧フィールド・後方互換性のため残す）
  annualFee: integer("annual_fee").notNull().default(0), // 年会費
  entranceFee: integer("entrance_fee").notNull().default(0), // 入会金
  insuranceFee: integer("insurance_fee").notNull().default(0), // 保険料
  spotFee: integer("spot_fee").notNull().default(0), // スポット
  amount: integer("amount").notNull(), // 合計金額（手動編集可能）
  isPaid: boolean("is_paid").notNull().default(false),
  paidAt: timestamp("paid_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTuitionPaymentSchema = createInsertSchema(tuitionPayments).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTuitionPayment = z.infer<typeof insertTuitionPaymentSchema>;
export type TuitionPayment = typeof tuitionPayments.$inferSelect;

export const admins = pgTable("admins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminSchema = createInsertSchema(admins).omit({ id: true, createdAt: true });
export type InsertAdmin = z.infer<typeof insertAdminSchema>;
export type Admin = typeof admins.$inferSelect;

export const activityLogs = pgTable("activity_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  activityType: text("activity_type").notNull(), // "schedule_created", "schedule_updated", "attendance_submitted", etc.
  actorId: varchar("actor_id"), // ID of coach or student who performed the action
  actorType: text("actor_type"), // "coach" or "student"
  actorName: text("actor_name"), // Name for display
  targetType: text("target_type"), // "schedule", "student", "document", etc.
  targetId: varchar("target_id"), // ID of the target entity
  targetName: text("target_name"), // Name of target for display
  description: text("description"), // Human-readable description
  categoryIds: text("category_ids").array(), // Category IDs for schedules
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true, createdAt: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({ id: true, createdAt: true });
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export const coachCategories = pgTable("coach_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  coachId: varchar("coach_id").notNull(),
  categoryId: varchar("category_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoachCategorySchema = createInsertSchema(coachCategories).omit({ id: true, createdAt: true });
export type InsertCoachCategory = z.infer<typeof insertCoachCategorySchema>;
export type CoachCategory = typeof coachCategories.$inferSelect;

export const siblingLinks = pgTable("sibling_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId1: varchar("student_id_1").notNull(), // First student in the relationship
  studentId2: varchar("student_id_2").notNull(), // Second student in the relationship
  status: text("status").notNull().default("pending"), // "pending" or "approved"
  requestedBy: varchar("requested_by").notNull(), // ID of the student who sent the request
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const insertSiblingLinkSchema = createInsertSchema(siblingLinks).omit({ id: true, createdAt: true, approvedAt: true });
export type InsertSiblingLink = z.infer<typeof insertSiblingLinkSchema>;
export type SiblingLink = typeof siblingLinks.$inferSelect;
