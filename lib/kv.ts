import { Redis } from "@upstash/redis";
import type { WeekSchedule, DaySchedule } from "./types";

// Initialize Redis from environment
const redis = Redis.fromEnv();

/**
 * Storage Keys Structure:
 * - schedules:{week} → Full week schedule object
 * - schedules:list → Sorted set of all week identifiers (with timestamps)
 * - schedules:latest → Pointer to most recent week
 * - schedules:latest_update → Timestamp of last update
 * - logs:scraping:{date} → Daily scraping logs
 */

/**
 * Store a week schedule in KV
 * @param schedule - The week schedule to store
 * @returns Success boolean
 */
export async function storeWeekSchedule(
  schedule: WeekSchedule
): Promise<boolean> {
  try {
    const key = `schedules:${schedule.week}`;

    // Store the schedule (Upstash Redis handles JSON automatically)
    await redis.set(key, schedule);

    // Add to sorted set with timestamp as score
    const timestamp = new Date(schedule.scrapedAt).getTime();
    await redis.zadd("schedules:list", {
      score: timestamp,
      member: schedule.week,
    });

    // Update latest pointer and timestamp
    await redis.set("schedules:latest", schedule.week);
    await redis.set("schedules:latest_update", Date.now());

    return true;
  } catch (error) {
    console.error("Error storing week schedule:", error);
    return false;
  }
}

/**
 * Check if a week schedule already exists
 * @param week - Week identifier (DD/MM/YYYY-DD/MM/YYYY)
 * @returns Boolean indicating if schedule exists
 */
export async function weekScheduleExists(week: string): Promise<boolean> {
  try {
    const key = `schedules:${week}`;
    const exists = await redis.exists(key);
    return exists === 1;
  } catch (error) {
    console.error("Error checking if week schedule exists:", error);
    return false;
  }
}

/**
 * Get a specific week schedule
 * @param week - Week identifier (DD/MM/YYYY-DD/MM/YYYY)
 * @returns Week schedule or null
 */
export async function getWeekSchedule(
  week: string
): Promise<WeekSchedule | null> {
  try {
    const key = `schedules:${week}`;
    // Upstash Redis handles JSON deserialization automatically
    const data = await redis.get<WeekSchedule>(key);
    return data;
  } catch (error) {
    console.error("Error getting week schedule:", error);
    return null;
  }
}

/**
 * Get all week schedules
 * @returns Array of week schedules sorted by date (most recent first)
 */
export async function getAllWeekSchedules(): Promise<WeekSchedule[]> {
  try {
    // Get all week identifiers from sorted set (newest first)
    const weeks = await redis.zrange("schedules:list", 0, -1, { rev: true });

    if (!weeks || weeks.length === 0) {
      return [];
    }

    // Fetch all schedules
    const schedules = await Promise.all(
      weeks.map((week) => getWeekSchedule(week as string))
    );

    // Filter out nulls
    return schedules.filter(
      (schedule): schedule is WeekSchedule => schedule !== null
    );
  } catch (error) {
    console.error("Error getting all week schedules:", error);
    return [];
  }
}

/**
 * Get the latest week schedule
 * @returns Latest week schedule or null
 */
export async function getLatestWeekSchedule(): Promise<WeekSchedule | null> {
  try {
    const latestWeek = await redis.get<string>("schedules:latest");
    if (!latestWeek) {
      return null;
    }
    return getWeekSchedule(latestWeek);
  } catch (error) {
    console.error("Error getting latest week schedule:", error);
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
    // Get all schedules and search for the date
    const schedules = await getAllWeekSchedules();

    for (const schedule of schedules) {
      const day = schedule.days.find((d) => d.date === date);
      if (day) {
        return day;
      }
    }

    return null;
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
    const date = `${today.getDate().toString().padStart(2, "0")}.${(
      today.getMonth() + 1
    )
      .toString()
      .padStart(2, "0")}`;
    return getDaySchedule(date);
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
    const schedules = await getAllWeekSchedules();

    if (schedules.length === 0) {
      return {
        shouldSkip: false,
        reason: "No schedules in database",
        daysAhead: 0,
      };
    }

    // Calculate how many days ahead we have schedules for
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let maxDate = today;

    for (const schedule of schedules) {
      for (const day of schedule.days) {
        // Parse DD.MM format
        const [dayNum, monthNum] = day.date.split(".").map(Number);
        const year = today.getFullYear();
        const date = new Date(year, monthNum - 1, dayNum);

        // Handle year boundary
        if (date < today && monthNum === 1) {
          date.setFullYear(year + 1);
        }

        if (date > maxDate) {
          maxDate = date;
        }
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
