"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainingSession } from "@/lib/types";
import { ChevronDown, ChevronRight, Clock, Dumbbell, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleTrainingCardProps {
  session: TrainingSession;
  defaultExpanded?: boolean;
}

export function CollapsibleTrainingCard({
  session,
  defaultExpanded = false,
}: CollapsibleTrainingCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Check if session includes "skakanka"
  const hasSkakanka = session.exercises.some((exercise) =>
    exercise.toLowerCase().includes("skakanka")
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Card className="w-full transition-all duration-200 hover:shadow-md py-0 overflow-hidden">
        <CardHeader
          className="cursor-pointer hover:bg-accent/50 transition-colors p-5 sm:p-6"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-start gap-3">
            <motion.button
              className={cn(
                "mt-0.5 p-1 rounded-md hover:bg-accent transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary"
              )}
              aria-label={isExpanded ? "Zwiń" : "Rozwiń"}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: isExpanded ? 0 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </motion.div>
            </motion.button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Dumbbell className="h-5 w-5 text-primary flex-shrink-0" />
                <h3 className="font-bold text-xl sm:text-2xl leading-tight">
                  {session.type}
                </h3>
                {hasSkakanka && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: 0.1,
                    }}
                  >
                    <Badge
                      variant="default"
                      className="bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 px-2 py-0.5"
                    >
                      <Zap className="h-3 w-3" />
                      <span className="text-xs font-bold">Skakanka!</span>
                    </Badge>
                  </motion.div>
                )}
              </div>

              {/* Always visible exercise list */}
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {session.exercises.join(" • ")}
              </p>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <CardContent className="pt-0 pb-5 px-5 sm:px-6">
                <div className="border-t pt-5 space-y-6">
                  {/* Exercises Grid */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Ćwiczenia
                      </h4>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {session.exercises.map((exercise, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-2 rounded-md hover:bg-accent/50 transition-colors"
                        >
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="text-sm sm:text-base leading-relaxed font-semibold">
                            {exercise}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Training Method & Duration Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Training Method */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 w-1 rounded-full bg-primary" />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Metoda treningowa
                        </h4>
                      </div>
                      <p className="text-base sm:text-lg font-medium">
                        {session.trainingMethod}
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Czas pracy w części głównej
                        </h4>
                      </div>
                      <p className="text-base sm:text-lg font-medium">
                        {session.mainPartDuration}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
