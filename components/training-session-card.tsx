import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrainingSession } from "@/lib/types";
import { Clock, Dumbbell } from "lucide-react";

interface TrainingSessionCardProps {
  session: TrainingSession;
}

export function TrainingSessionCard({ session }: TrainingSessionCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-all duration-200 active:scale-[0.99]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary shrink-0" />
            <span className="break-words">{session.type}</span>
          </CardTitle>
          <Badge
            variant="secondary"
            className="flex items-center gap-1 shrink-0 text-xs"
          >
            <Clock className="h-3 w-3" />
            {session.mainPartDuration}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Exercises */}
        <div>
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-2">
            Ćwiczenia:
          </h4>
          <ul className="space-y-2">
            {session.exercises.map((exercise, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-primary mt-1 shrink-0 text-lg">•</span>
                <span className="text-sm sm:text-base leading-relaxed break-words">
                  {exercise}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Training Method */}
        <div className="pt-3 border-t">
          <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground mb-1">
            Metoda treningowa:
          </h4>
          <p className="text-sm sm:text-base font-medium">
            {session.trainingMethod}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
