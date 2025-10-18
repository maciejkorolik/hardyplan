"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DaySelectorProps {
  availableDates: Array<{ date: string; dayName: string; isoDate: string }>;
  currentDate: string;
  onDateSelect: (date: string) => void;
}

const POLISH_DAYS = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];

export function DaySelector({
  availableDates,
  currentDate,
  onDateSelect,
}: DaySelectorProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Get dates: today + all future days
  const getDisplayDates = () => {
    const today = new Date();
    const todayISO = today.toISOString().split("T")[0];

    const displayDates: Array<{
      dayName: string;
      date: string;
      isoDate: string;
      isAvailable: boolean;
      isToday: boolean;
    }> = [];

    // Add today first
    const todayDayOfWeek = today.getDay();
    const todayDayName =
      POLISH_DAYS[todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1];
    const todayDateStr = `${String(today.getDate()).padStart(2, "0")}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    const todayAvailable = availableDates.find((d) => d.date === todayDateStr);

    displayDates.push({
      dayName: todayDayName,
      date: todayDateStr,
      isoDate: todayISO,
      isAvailable: !!todayAvailable,
      isToday: true,
    });

    // Add all future days from available dates (today onwards)
    const futureDates = availableDates
      .filter((d) => d.isoDate >= todayISO && d.date !== todayDateStr)
      .sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    futureDates.forEach((d) => {
      displayDates.push({
        dayName: d.dayName,
        date: d.date,
        isoDate: d.isoDate,
        isAvailable: true,
        isToday: false,
      });
    });

    return displayDates;
  };

  const displayDates = getDisplayDates();

  return (
    <div className="relative">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide scroll-smooth"
      >
        {displayDates.map((day, index) => {
          const isSelected = day.date === currentDate;

          return (
            <Button
              key={`${day.date}-${index}`}
              variant={isSelected ? "default" : "outline"}
              onClick={() => day.isAvailable && onDateSelect(day.date)}
              disabled={!day.isAvailable}
              className={cn(
                "flex-shrink-0 min-w-[90px] sm:min-w-[110px] flex-col h-[72px] sm:h-[88px] py-2 sm:py-3 px-3 sm:px-4 transition-all",
                day.isToday && "border-primary border-2 shadow-sm",
                isSelected && "shadow-md"
              )}
              id={day.isToday ? "today-button" : undefined}
            >
              <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-0.5 sm:mb-1">
                {day.dayName.slice(0, 3)}
              </span>
              <span className="text-sm sm:text-base font-semibold">
                {day.date}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
