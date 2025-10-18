import { z } from "zod";

/**
 * Training Session Schema
 * Represents a single training session with exercises, method, and duration
 */
export const TrainingSessionSchema = z.object({
  type: z.string(), // Training type name (NOT an enum - varies per day)
  exercises: z.array(z.string()), // Exercise names in Polish
  trainingMethod: z.string(), // e.g., "2 x EMOM", "4 rundy, co 2,5 min wykonaj parę ćwiczeń"
  mainPartDuration: z.string(), // e.g., "21 min"
});

export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

/**
 * Day Schedule Schema
 * Represents training schedule for a single day
 */
export const DayScheduleSchema = z.object({
  date: z.string(), // DD.MM format
  dayName: z.string(), // Polish day name
  isoDate: z.string().optional(), // YYYY-MM-DD format (for day-based storage)
  sourceUrl: z.string().optional(), // Original blog post URL
  scrapedAt: z.string().optional(), // ISO timestamp
  trainingSessions: z.array(TrainingSessionSchema),
});

export type DaySchedule = z.infer<typeof DayScheduleSchema>;

/**
 * Week Schedule Schema
 * Represents a full week's training schedule with metadata
 */
export const WeekScheduleSchema = z.object({
  week: z.string(), // DD/MM/YYYY-DD/MM/YYYY format (e.g., "20/10/2024-26/10/2024")
  sourceUrl: z.string(), // Original blog post URL
  scrapedAt: z.string(), // ISO timestamp
  days: z.array(DayScheduleSchema),
});

export type WeekSchedule = z.infer<typeof WeekScheduleSchema>;

/**
 * Scraping Result
 * Used for tracking scraping operation results
 */
export interface ScrapingResult {
  success: boolean;
  schedulesProcessed: number;
  errors: string[];
  urls: string[];
  timestamp: string;
}
