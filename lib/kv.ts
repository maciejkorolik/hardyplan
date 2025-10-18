import { Redis } from "@upstash/redis";
import type { WeekSchedule, DaySchedule } from "./types";

// Initialize Redis from environment
const redis = Redis.fromEnv();

/**
 * Storage Keys Structure:
 * - schedules:day:{YYYY-MM-DD} → Individual day schedule
 * - schedules:days:list → Sorted set of all day dates (with timestamps)
 * - schedules:latest_update → Timestamp of last update
 * - schedules:week:{week} → Original week metadata (for reference)
 * - logs:scraping:{date} → Daily scraping logs
 */

/**
 * Convert DD.MM date to YYYY-MM-DD format using current year
 * Handles year boundaries (e.g., if current month is Jan and date is Dec, use previous year)
 * @param date - Date in DD.MM format
 * @returns Date in YYYY-MM-DD format
 */
function convertToISODate(date: string): string {
  const [day, month] = date.split(".").map(Number);
  const now = new Date();
  let year = now.getFullYear();

  // Handle year boundary: if we're in January and the date is December, use previous year
  if (now.getMonth() === 0 && month === 12) {
    year -= 1;
  }
  // Handle year boundary: if we're in December and the date is January, use next year
  if (now.getMonth() === 11 && month === 1) {
    year += 1;
  }

  const isoDate = `${year}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
  return isoDate;
}

/**
 * Store a week schedule as individual days in KV
 * @param schedule - The week schedule to store
 * @returns Number of days stored successfully
 */
export async function storeWeekSchedule(
  schedule: WeekSchedule
): Promise<number> {
  try {
    let storedCount = 0;
    const now = Date.now();

    // Store each day individually
    for (const day of schedule.days) {
      const isoDate = convertToISODate(day.date);
      const key = `schedules:day:${isoDate}`;

      // Store day schedule with metadata
      await redis.set(key, {
        ...day,
        isoDate,
        sourceUrl: schedule.sourceUrl,
        scrapedAt: schedule.scrapedAt,
      });

      // Add to sorted set with timestamp as score
      await redis.zadd("schedules:days:list", {
        score: now,
        member: isoDate,
      });

      storedCount++;
      console.log(`Stored day schedule: ${isoDate} (${day.dayName})`);
    }

    // Store week metadata for reference
    const weekKey = `schedules:week:${schedule.week}`;
    await redis.set(weekKey, {
      week: schedule.week,
      sourceUrl: schedule.sourceUrl,
      scrapedAt: schedule.scrapedAt,
      dayCount: schedule.days.length,
    });

    // Update latest update timestamp
    await redis.set("schedules:latest_update", now);

    console.log(
      `Successfully stored ${storedCount} days from week ${schedule.week}`
    );
    return storedCount;
  } catch (error) {
    console.error("Error storing week schedule:", error);
    return 0;
  }
}

/**
 * Check if a day schedule already exists
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns Boolean indicating if schedule exists
 */
export async function dayScheduleExists(isoDate: string): Promise<boolean> {
  try {
    const key = `schedules:day:${isoDate}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("Error checking if day schedule exists:", error);
    return false;
  }
}

/**
 * Check if a week schedule already exists (checks first day of week)
 * @param week - Week identifier (DD/MM/YYYY-DD/MM/YYYY)
 * @returns Boolean indicating if schedule exists
 */
export async function weekScheduleExists(week: string): Promise<boolean> {
  try {
    const weekKey = `schedules:week:${week}`;
    const exists = await redis.exists(weekKey);
    return exists === 1;
  } catch (error) {
    console.error("Error checking if week schedule exists:", error);
    return false;
  }
}

/**
 * Get all day schedules
 * @returns Array of day schedules sorted by date (most recent first)
 */
export async function getAllDaySchedules(): Promise<DaySchedule[]> {
  try {
    // Get all day dates from sorted set (newest first)
    const dates = await redis.zrange("schedules:days:list", 0, -1, {
      rev: true,
    });

    if (!dates || dates.length === 0) {
      return [];
    }

    // Fetch all day schedules
    const schedules = await Promise.all(
      dates.map((date) => getDayScheduleByISO(date as string))
    );

    // Filter out nulls
    return schedules.filter(
      (schedule): schedule is DaySchedule => schedule !== null
    );
  } catch (error) {
    console.error("Error getting all day schedules:", error);
    return [];
  }
}

/**
 * Get day schedule by ISO date
 * @param isoDate - Date in YYYY-MM-DD format
 * @returns Day schedule or null
 */
export async function getDayScheduleByISO(
  isoDate: string
): Promise<DaySchedule | null> {
  try {
    const key = `schedules:day:${isoDate}`;
    const data = await redis.get<DaySchedule>(key);
    return data;
  } catch (error) {
    console.error("Error getting day schedule by ISO:", error);
    return null;
  }
}

/**
 * Find a day schedule by date
 * @param date - Date in DD.MM format
 * @returns Day schedule or null
 */
export async function getDaySchedule(
  date: string
): Promise<DaySchedule | null> {
  try {
    // Convert DD.MM to YYYY-MM-DD
    const isoDate = convertToISODate(date);
    return getDayScheduleByISO(isoDate);
  } catch (error) {
    console.error("Error getting day schedule:", error);
    return null;
  }
}

/**
 * Get today's schedule
 * @returns Today's day schedule or null
 */
export async function getTodaySchedule(): Promise<DaySchedule | null> {
  try {
    const today = new Date();
    const isoDate = today.toISOString().split("T")[0]; // YYYY-MM-DD
    return getDayScheduleByISO(isoDate);
  } catch (error) {
    console.error("Error getting today schedule:", error);
    return null;
  }
}

/**
 * Log scraping operation
 * @param result - Scraping result object
 */
export async function logScrapingOperation(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
): Promise<void> {
  try {
    const today = new Date().toISOString().split("T")[0];
    const key = `logs:scraping:${today}`;
    // Upstash Redis handles JSON serialization automatically
    await redis.set(key, result, { ex: 60 * 60 * 24 * 30 }); // 30 days TTL
  } catch (error) {
    console.error("Error logging scraping operation:", error);
  }
}

/**
 * Check if we should skip scraping based on existing schedules
 * Skip if:
 * - We have schedules for the next 14+ days
 * - Last update was less than 5 days ago
 *
 * @returns Object with shouldSkip boolean and reason
 */
export async function shouldSkipScraping(): Promise<{
  shouldSkip: boolean;
  reason: string;
  daysAhead: number;
}> {
  try {
    // Get all day dates from sorted set
    const dates = await redis.zrange("schedules:days:list", 0, -1);

    if (!dates || dates.length === 0) {
      return {
        shouldSkip: false,
        reason: "No schedules in database",
        daysAhead: 0,
      };
    }

    // Calculate how many days ahead we have schedules for
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the latest date in our schedules
    let maxDate = today;

    for (const dateStr of dates) {
      const date = new Date(dateStr as string);
      if (date > maxDate) {
        maxDate = date;
      }
    }

    const daysAhead = Math.ceil(
      (maxDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Check last update time
    const lastUpdate = await redis.get<number>("schedules:latest_update");
    const daysSinceUpdate = lastUpdate
      ? Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24))
      : 999;

    // Skip if we have 14+ days ahead AND last update was less than 5 days ago
    if (daysAhead >= 14 && daysSinceUpdate < 5) {
      return {
        shouldSkip: true,
        reason: `Have ${daysAhead} days of schedules, last updated ${daysSinceUpdate} days ago`,
        daysAhead,
      };
    }

    return {
      shouldSkip: false,
      reason: `Only ${daysAhead} days ahead, last updated ${daysSinceUpdate} days ago`,
      daysAhead,
    };
  } catch (error) {
    console.error("Error checking if should skip scraping:", error);
    // On error, don't skip (safer to scrape)
    return {
      shouldSkip: false,
      reason: "Error checking schedules",
      daysAhead: 0,
    };
  }
}
