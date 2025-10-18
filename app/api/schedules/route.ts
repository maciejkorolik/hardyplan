import { NextResponse } from "next/server";
import { getAllDaySchedules } from "@/lib/kv";

/**
 * GET /api/schedules
 *
 * Returns all day schedules (day-based storage)
 *
 * Response: Array of DaySchedule objects
 */
export async function GET() {
  try {
    // Get all day schedules (new day-based storage)
    const schedules = await getAllDaySchedules();

    return NextResponse.json(schedules, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania planów treningowych" },
      { status: 500 }
    );
  }
}

// Enable caching for 5 minutes
export const revalidate = 300;
