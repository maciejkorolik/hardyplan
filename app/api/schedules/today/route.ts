import { NextResponse } from "next/server";
import { getTodaySchedule } from "@/lib/kv";

/**
 * GET /api/schedules/today
 *
 * Returns today's training schedule
 * Response: DaySchedule object or null
 */
export async function GET() {
  try {
    const schedule = await getTodaySchedule();

    if (!schedule) {
      return NextResponse.json(null, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    return NextResponse.json(schedule, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching today's schedule:", error);

    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania planu treningowego" },
      { status: 500 }
    );
  }
}

// Enable caching for 5 minutes
export const revalidate = 300;
