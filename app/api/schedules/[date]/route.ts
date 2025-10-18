import { NextRequest, NextResponse } from "next/server";
import { getDaySchedule } from "@/lib/kv";

/**
 * GET /api/schedules/[date]
 *
 * Returns schedule for specific date
 * Params:
 *   - date: Date in DD.MM format
 *
 * Response: DaySchedule object or null
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;

    // Validate date format (DD.MM)
    const datePattern = /^\d{2}\.\d{2}$/;
    if (!datePattern.test(date)) {
      return NextResponse.json(
        { error: "Nieprawidłowy format daty. Użyj formatu DD.MM" },
        { status: 400 }
      );
    }

    const schedule = await getDaySchedule(date);

    if (!schedule) {
      return NextResponse.json(null, {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      });
    }

    return NextResponse.json(schedule, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Error fetching day schedule:", error);

    return NextResponse.json(
      { error: "Wystąpił błąd podczas pobierania planu treningowego" },
      { status: 500 }
    );
  }
}

// Enable caching for 1 hour
export const revalidate = 3600;
