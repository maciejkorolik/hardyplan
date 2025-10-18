"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { WeekSchedule } from "@/lib/types";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

interface WeekViewProps {
  onDateSelect: (date: string) => void;
  currentDate: string;
}

export function WeekView({ onDateSelect, currentDate }: WeekViewProps) {
  const [schedules, setSchedules] = useState<WeekSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function loadSchedules() {
      try {
        const res = await fetch("/api/schedules");
        if (res.ok) {
          const data = await res.json();
          setSchedules(data);

          // Auto-expand current week
          const currentWeek = data.find((week: WeekSchedule) =>
            week.days.some((day) => day.date === currentDate)
          );
          if (currentWeek) {
            setExpandedWeeks(new Set([currentWeek.week]));
          }
        }
      } catch (error) {
        console.error("Failed to load schedules:", error);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, [currentDate]);

  function toggleWeek(week: string) {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] w-full">
      <div className="space-y-3 pr-4">
        {schedules.map((schedule) => {
          const isExpanded = expandedWeeks.has(schedule.week);
          const daysWithTraining = schedule.days.filter(
            (day) => day.trainingSessions.length > 0
          );

          return (
            <Card key={schedule.week} className="overflow-hidden">
              <CardHeader className="pb-3">
                <button
                  onClick={() => toggleWeek(schedule.week)}
                  className="flex items-center justify-between w-full text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-lg">
                      Tydzień {schedule.week}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {daysWithTraining.length} dni
                    </Badge>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-2 pt-0">
                  {daysWithTraining.map((day) => {
                    const isSelected = day.date === currentDate;
                    const trainingTypes = day.trainingSessions.map(
                      (s) => s.type
                    );

                    return (
                      <Button
                        key={day.date}
                        variant={isSelected ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => onDateSelect(day.date)}
                      >
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="font-semibold">{day.dayName}</span>
                            <span className="text-xs">{day.date}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {trainingTypes.map((type, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs"
                              >
                                {type}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
