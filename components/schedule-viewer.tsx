"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrainingSessionCard } from "@/components/training-session-card";
import { WeekView } from "@/components/week-view";
import { SwipeableContainer } from "@/components/swipeable-container";
import { DaySchedule, WeekSchedule } from "@/lib/types";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Filter,
  CalendarDays,
  Home,
} from "lucide-react";

interface ScheduleViewerProps {
  initialSchedule: DaySchedule | null;
  initialDate: string; // DD.MM format
}

export function ScheduleViewer({
  initialSchedule,
  initialDate,
}: ScheduleViewerProps) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [schedule, setSchedule] = useState<DaySchedule | null>(initialSchedule);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [availableDates, setAvailableDates] = useState<
    Array<{ date: string; dayName: string }>
  >([]);
  const [showWeekView, setShowWeekView] = useState(false);

  // Load all schedules for navigation
  useEffect(() => {
    async function loadSchedules() {
      try {
        const res = await fetch("/api/schedules", {
          // Cache for 5 minutes
          next: { revalidate: 300 },
        });
        if (res.ok) {
          const data = await res.json();

          // Build list of available dates
          const dates: Array<{ date: string; dayName: string }> = [];
          data.forEach((week: WeekSchedule) => {
            week.days.forEach((day) => {
              if (day.trainingSessions.length > 0) {
                dates.push({ date: day.date, dayName: day.dayName });
              }
            });
          });
          setAvailableDates(dates);
        }
      } catch (error) {
        console.error("Failed to load schedules:", error);
      }
    }
    loadSchedules();
  }, []);

  // Get available training types from current schedule
  const trainingTypes = useMemo(() => {
    if (!schedule?.trainingSessions) return [];
    const types = new Set(
      schedule.trainingSessions.map((session) => session.type)
    );
    return Array.from(types);
  }, [schedule]);

  // Filter sessions by selected type
  const filteredSessions = useMemo(() => {
    if (!schedule?.trainingSessions) return [];
    if (selectedType === "all") return schedule.trainingSessions;
    return schedule.trainingSessions.filter(
      (session) => session.type === selectedType
    );
  }, [schedule, selectedType]);

  // Load schedule for a specific date
  async function loadSchedule(date: string) {
    setLoading(true);
    setShowWeekView(false); // Close week view when selecting date
    try {
      const res = await fetch(`/api/schedules/${date}`);
      if (res.ok) {
        const data = await res.json();
        setSchedule(data);
        setCurrentDate(date);
        setSelectedType("all"); // Reset filter
      }
    } catch (error) {
      console.error("Failed to load schedule:", error);
    } finally {
      setLoading(false);
    }
  }

  // Jump to today
  function goToToday() {
    const todayDate = new Date()
      .toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
      })
      .replace(/\//g, ".");
    loadSchedule(todayDate);
  }

  // Navigate to previous day
  function goToPreviousDay() {
    const currentIndex = availableDates.findIndex(
      (d) => d.date === currentDate
    );
    if (currentIndex > 0) {
      loadSchedule(availableDates[currentIndex - 1].date);
    }
  }

  // Navigate to next day
  function goToNextDay() {
    const currentIndex = availableDates.findIndex(
      (d) => d.date === currentDate
    );
    if (currentIndex < availableDates.length - 1) {
      loadSchedule(availableDates[currentIndex + 1].date);
    }
  }

  // Check if navigation is possible
  const canGoPrevious =
    availableDates.findIndex((d) => d.date === currentDate) > 0;
  const canGoNext =
    availableDates.findIndex((d) => d.date === currentDate) <
    availableDates.length - 1;

  // Get today's date in DD.MM format for highlighting
  const today = new Date()
    .toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
    })
    .replace(/\//g, ".");

  const isToday = currentDate === today;

  return (
    <div className="w-full space-y-6">
      {/* Header with date and navigation */}
      <div className="space-y-4">
        {/* Main navigation */}
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPreviousDay}
            disabled={!canGoPrevious || loading}
            className="shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              {isToday && (
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  Dzisiaj
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold">
              {schedule?.dayName}
            </h2>
            <p className="text-sm text-muted-foreground">{currentDate}</p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNextDay}
            disabled={!canGoNext || loading}
            className="shrink-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2">
          {!isToday && (
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Dzisiaj</span>
            </Button>
          )}
          <Button
            variant={showWeekView ? "default" : "outline"}
            size="sm"
            onClick={() => setShowWeekView(!showWeekView)}
            className="flex items-center gap-2"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">
              {showWeekView ? "Ukryj kalendarz" : "Pokaż kalendarz"}
            </span>
          </Button>
        </div>

        {/* Week view */}
        {showWeekView && (
          <div className="border rounded-lg p-4 bg-card">
            <WeekView onDateSelect={loadSchedule} currentDate={currentDate} />
          </div>
        )}

        {/* Filter by training type */}
        {trainingTypes.length > 1 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Wszystkie treningi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie treningi</SelectItem>
                {trainingTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Training sessions */}
      <SwipeableContainer
        onSwipeLeft={canGoNext ? goToNextDay : undefined}
        onSwipeRight={canGoPrevious ? goToPreviousDay : undefined}
      >
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : filteredSessions.length > 0 ? (
          <div className="space-y-4">
            {filteredSessions.map((session, idx) => (
              <TrainingSessionCard key={idx} session={session} />
            ))}
          </div>
        ) : schedule ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              {selectedType === "all"
                ? "Brak treningów na ten dzień"
                : "Brak treningów tego typu"}
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Wystąpił błąd podczas ładowania planu
            </p>
          </div>
        )}
      </SwipeableContainer>
    </div>
  );
}
