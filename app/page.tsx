import { ScheduleViewerV2 } from "@/components/schedule-viewer-v2";
import { getTodaySchedule } from "@/lib/kv";

async function getInitialSchedule() {
  try {
    // Call database directly instead of HTTP fetch for server-side rendering
    const schedule = await getTodaySchedule();

    const date =
      schedule?.date ||
      new Date()
        .toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
        })
        .replace(/\//g, ".");

    return { schedule, date };
  } catch (error) {
    console.error("Failed to fetch today's schedule:", error);
    return {
      schedule: null,
      date: new Date()
        .toLocaleDateString("pl-PL", {
          day: "2-digit",
          month: "2-digit",
        })
        .replace(/\//g, "."),
    };
  }
}

export default async function Home() {
  const { schedule, date } = await getInitialSchedule();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-5 sm:py-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Co dziś w Hardym?
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 md:py-10 max-w-6xl min-h-[calc(100vh-12rem)]">
        <ScheduleViewerV2 initialSchedule={schedule} initialDate={date} />
      </main>

      {/* Footer */}
      <footer className="border-t mt-12 sm:mt-16 py-6 sm:py-8">
        <div className="container mx-auto px-4 text-center space-y-3">
          <p className="text-xs sm:text-sm text-muted-foreground">
            Automatycznie aktualizowane codziennie o 8:00
          </p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              Ta aplikacja nie jest powiązana z klubem treningowym Hardy Wyższa
              Forma.
            </p>
            <p>
              Stworzona przez{" "}
              <a
                href="https://www.maciejkorolik.com"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Maciej Korolik
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
