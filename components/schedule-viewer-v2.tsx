"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleTrainingCard } from "@/components/collapsible-training-card";
import { DaySelector } from "@/components/day-selector";
import { DaySchedule } from "@/lib/types";

interface ScheduleViewerProps {
  initialSchedule: DaySchedule | null;
  initialDate: string;
}

// Cache for API responses
const scheduleCache = new Map<
  string,
  { data: DaySchedule | DaySchedule[]; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function ScheduleViewerV2({
  initialSchedule,
  initialDate,
}: ScheduleViewerProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [schedule, setSchedule] = useState<DaySchedule | null>(initialSchedule);
  const [loading, setLoading] = useState(false);
  const [availableDates, setAvailableDates] = useState<
    Array<{ date: string; dayName: string; isoDate: string }>
  >([]);

  // Load all available dates
  useEffect(() => {
    async function loadDates() {
      try {
        const cached = scheduleCache.get("all-dates");
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          const dates = extractDatesFromSchedules(
            cached.data as unknown as DaySchedule[]
          );
          setAvailableDates(dates);
          return;
        }

        const res = await fetch("/api/schedules");
        if (res.ok) {
          const data: DaySchedule[] = await res.json();
          scheduleCache.set("all-dates", { data, timestamp: Date.now() });

          const dates = extractDatesFromSchedules(data);
          setAvailableDates(dates);
        }
      } catch (error) {
        console.error("Failed to load dates:", error);
      }
    }
    loadDates();
  }, []);

  // Extract dates from schedules
  function extractDatesFromSchedules(
    data: DaySchedule[]
  ): Array<{ date: string; dayName: string; isoDate: string }> {
    const dates: Array<{ date: string; dayName: string; isoDate: string }> = [];

    data.forEach((day: DaySchedule) => {
      if (day.trainingSessions && day.trainingSessions.length > 0) {
        dates.push({
          date: day.date,
          dayName: day.dayName,
          isoDate: day.isoDate || "",
        });
      }
    });

    return dates.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
  }

  // Load schedule for specific date
  async function loadSchedule(date: string) {
    setLoading(true);
    setCurrentDate(date);
    try {
      // Check cache first
      const cached = scheduleCache.get(date);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        // For specific dates, data should be DaySchedule
        if (!Array.isArray(cached.data)) {
          setSchedule(cached.data);
          setLoading(false);
          return;
        }
      }

      const res = await fetch(`/api/schedules/${date}`, {
        next: { revalidate: 300 }, // 5 minutes
      });

      if (res.ok) {
        const data: DaySchedule = await res.json();
        scheduleCache.set(date, { data, timestamp: Date.now() });
        setSchedule(data);
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      {/* Fixed Day selector */}
      <div className="fixed top-[73px] sm:top-[85px] left-0 right-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-3 pt-4">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 max-w-6xl">
          <DaySelector
            availableDates={availableDates}
            currentDate={currentDate}
            onDateSelect={loadSchedule}
          />
        </div>
      </div>

      {/* Spacer for fixed day selector */}
      <div className="h-[120px] sm:h-[130px]" />

      {/* Current date display - show instantly without animation */}
      <div className="mb-4">
        {schedule && (
          <div className="flex items-center gap-3 py-2">
            <span className="inline-block px-2 py-0.5 rounded-lg bg-muted text-lg font-semibold tracking-wide">
              {schedule.date}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {schedule.dayName}
            </h2>
          </div>
        )}
      </div>

      {/* Training sessions */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : schedule?.trainingSessions &&
          schedule.trainingSessions.length > 0 ? (
          <motion.div
            key={`sessions-${currentDate}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {schedule.trainingSessions.map((session, idx) => (
              <CollapsibleTrainingCard
                key={idx}
                session={session}
                defaultExpanded={false}
              />
            ))}
          </motion.div>
        ) : schedule ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <span className="text-2xl">📅</span>
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              Brak treningów na ten dzień
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="text-lg font-medium text-muted-foreground">
              Nie udało się załadować planu treningowego
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
