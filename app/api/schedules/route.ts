import { NextRequest, NextResponse } from "next/server";
import { getAllWeekSchedules, getWeekSchedule } from "@/lib/kv";

/**
 * GET /api/schedules
 *
 * Returns all week schedules or specific week if query param provided
 * Query params:
 *   - week: Optional week identifier (DD/MM-DD/MM)
 *
 * Response: Array of WeekSchedule objects or single WeekSchedule
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get("week");

    // If week parameter provided, return specific week
    if (week) {
      const schedule = await getWeekSchedule(week);

      if (!schedule) {
        return NextResponse.json(null);
      }

      return NextResponse.json(schedule);
    }

    // Otherwise, return all schedules
    const schedules = await getAllWeekSchedules();

    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Error fetching schedules:", error);

    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania planów treningowych" },
      { status: 500 }
    );
  }
}

// Enable caching for 1 hour
export const revalidate = 3600;
