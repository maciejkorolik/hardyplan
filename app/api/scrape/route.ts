import { NextRequest, NextResponse } from "next/server";
import { scrapeAllBlogPosts } from "@/lib/firecrawl";
import { parseAllSchedules } from "@/lib/llm-parser";
import {
  storeWeekSchedule,
  weekScheduleExists,
  logScrapingOperation,
  shouldSkipScraping,
} from "@/lib/kv";
import type { ScrapingResult } from "@/lib/types";

/**
 * POST /api/scrape
 *
 * Cron job endpoint for daily schedule scraping
 * Requires CRON_SECRET authorization
 *
 * Process:
 * 1. Scrape blog category page for post URLs
 * 2. Scrape each blog post for markdown content
 * 3. Parse markdown with LLM
 * 4. Store in KV (skip duplicates)
 * 5. Log operation
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Starting daily scraping process...");

    // Check if we should skip scraping (optimization)
    const skipCheck = await shouldSkipScraping();
    console.log(`Skip check: ${skipCheck.reason}`);

    if (skipCheck.shouldSkip) {
      const result: ScrapingResult = {
        success: true,
        schedulesProcessed: 0,
        errors: [],
        urls: [],
        timestamp: new Date().toISOString(),
      };

      await logScrapingOperation({
        ...result,
        skipped: true,
        skipReason: skipCheck.reason,
        daysAhead: skipCheck.daysAhead,
      });

      return NextResponse.json({
        ...result,
        skipped: true,
        skipReason: skipCheck.reason,
        daysAhead: skipCheck.daysAhead,
      });
    }

    // Step 1 & 2: Scrape blog posts
    const posts = await scrapeAllBlogPosts();

    if (posts.length === 0) {
      const result: ScrapingResult = {
        success: false,
        schedulesProcessed: 0,
        errors: ["No blog posts found"],
        urls: [],
        timestamp: new Date().toISOString(),
      };

      await logScrapingOperation(result);

      return NextResponse.json(result, { status: 200 });
    }

    console.log(`Scraped ${posts.length} blog posts`);

    // Step 3: Parse with LLM
    const schedules = await parseAllSchedules(posts);

    console.log(`Successfully parsed ${schedules.length} schedules`);

    // Step 4: Store in KV as individual days (skip duplicates)
    const storedSchedules: string[] = [];
    const skippedSchedules: string[] = [];
    const errors: string[] = [];
    let totalDaysStored = 0;

    for (const schedule of schedules) {
      try {
        // Check if schedule already exists
        const exists = await weekScheduleExists(schedule.week);

        if (exists) {
          console.log(
            `Schedule for week ${schedule.week} already exists, skipping`
          );
          skippedSchedules.push(schedule.week);
          continue;
        }

        // Store new schedule (splits into individual days)
        const daysStored = await storeWeekSchedule(schedule);

        if (daysStored > 0) {
          console.log(
            `Successfully stored ${daysStored} days from week ${schedule.week}`
          );
          storedSchedules.push(schedule.week);
          totalDaysStored += daysStored;
        } else {
          errors.push(`Failed to store schedule for week ${schedule.week}`);
        }
      } catch (error) {
        const errorMessage = `Error processing schedule ${schedule.week}: ${
          error instanceof Error ? error.message : String(error)
        }`;
        console.error(errorMessage);
        errors.push(errorMessage);
      }
    }

    // Step 5: Log operation
    const result: ScrapingResult = {
      success: errors.length === 0,
      schedulesProcessed: storedSchedules.length,
      errors,
      urls: posts.map((p) => p.url),
      timestamp: new Date().toISOString(),
    };

    await logScrapingOperation(result);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`Scraping completed in ${duration}s`);
    console.log(
      `Stored: ${storedSchedules.length}, Skipped: ${skippedSchedules.length}, Errors: ${errors.length}`
    );

    return NextResponse.json({
      ...result,
      duration: `${duration}s`,
      stored: storedSchedules,
      skipped: skippedSchedules,
      totalDaysStored,
    });
  } catch (error) {
    console.error("Fatal error in scraping process:", error);

    const result: ScrapingResult = {
      success: false,
      schedulesProcessed: 0,
      errors: [error instanceof Error ? error.message : String(error)],
      urls: [],
      timestamp: new Date().toISOString(),
    };

    await logScrapingOperation(result);

    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania danych", details: result },
      { status: 500 }
    );
  }
}
