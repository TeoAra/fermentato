import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Calendar, Star } from "lucide-react";

interface OpeningHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pubName: string;
  openingHours: any;
}

const dayNames: Record<string, string> = {
  monday: "Lunedì",
  tuesday: "Martedì",
  wednesday: "Mercoledì",
  thursday: "Giovedì",
  friday: "Venerdì",
  saturday: "Sabato",
  sunday: "Domenica",
};

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const getCurrentDay = () => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date().getDay()];
};

const computeIsOpen = (hours: any, currentTime: number): boolean => {
  if (!hours || hours.isClosed) return false;
  if (hours.open && hours.close) {
    const [oh, om] = hours.open.split(":").map(Number);
    const [ch, cm] = hours.close.split(":").map(Number);
    const open = oh * 60 + om;
    const close = ch * 60 + cm;
    if (close < open) return currentTime >= open || currentTime <= close;
    return currentTime >= open && currentTime <= close;
  }
  return true;
};

const getIsOpenNow = (openingHours: any): boolean => {
  if (!openingHours) return false;
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const todayDate = now.toISOString().slice(0, 10);
  const specialDays: any[] = openingHours.specialDays ?? [];
  const specialToday = specialDays.find((s: any) => s.date === todayDate);
  if (specialToday) return computeIsOpen(specialToday, currentTime);
  const currentDay = getCurrentDay();
  return computeIsOpen(openingHours[currentDay], currentTime);
};

const formatSpecialDate = (dateStr: string) => {
  try {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("it-IT", {
      weekday: "short", day: "numeric", month: "long",
    });
  } catch { return dateStr; }
};

export default function OpeningHoursDialog({ open, onOpenChange, pubName, openingHours }: OpeningHoursDialogProps) {
  const currentDay = getCurrentDay();
  const isOpenNow = getIsOpenNow(openingHours);
  const todayDate = new Date().toISOString().slice(0, 10);

  const upcomingSpecialDays = ((openingHours?.specialDays ?? []) as any[])
    .filter((s: any) => s.date >= todayDate)
    .sort((a: any, b: any) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-[#0B0D10]/95 backdrop-blur-md border border-white/20 dark:border-[#23262E]/30 shadow-2xl" data-testid="dialog-opening-hours">
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Orari di Apertura
              </DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">{pubName}</p>
            </div>
          </div>

          {/* Current Status */}
          <div className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border border-gray-200 dark:border-[#23262E]">
            <Badge
              className={`${
                isOpenNow
                  ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600"
                  : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600"
              } px-4 py-2 text-sm font-semibold`}
            >
              {isOpenNow ? (
                <><CheckCircle className="h-4 w-4 mr-2" />Aperto ora</>
              ) : (
                <><XCircle className="h-4 w-4 mr-2" />Chiuso ora</>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {/* Weekly Hours */}
        <div className="space-y-2 mt-4">
          {DAY_ORDER.map((dayKey) => {
            const dayHours = openingHours?.[dayKey];
            const isToday = dayKey === currentDay;
            const isClosed = !dayHours || dayHours.isClosed;

            return (
              <div
                key={dayKey}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  isToday
                    ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 shadow-sm"
                    : "bg-gray-50 dark:bg-[#1A1D24] hover:bg-gray-100 dark:hover:bg-[#12151A]"
                }`}
                data-testid={`hours-${dayKey}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${isToday ? "bg-gradient-to-br from-amber-500 to-orange-600" : "bg-gray-200 dark:bg-[#12151A]"}`}>
                    <Clock className={`h-3 w-3 ${isToday ? "text-white" : "text-gray-500 dark:text-gray-400"}`} />
                  </div>
                  <span className={`font-medium ${isToday ? "text-amber-800 dark:text-amber-200" : "text-gray-900 dark:text-white"}`}>
                    {dayNames[dayKey]}
                  </span>
                  {isToday && (
                    <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      Oggi
                    </Badge>
                  )}
                </div>

                <div className={`text-sm font-semibold ${isToday ? "text-amber-800 dark:text-amber-200" : "text-gray-600 dark:text-gray-400"}`}>
                  {isClosed ? (
                    <span className="text-red-600 dark:text-red-400 flex items-center">
                      <XCircle className="h-3 w-3 mr-1" />Chiuso
                    </span>
                  ) : dayHours?.open && dayHours?.close ? (
                    <span>{dayHours.open} - {dayHours.close}</span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />Aperto
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming Special Days */}
        {upcomingSpecialDays.length > 0 && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Star className="h-3 w-3" />
              Giorni speciali / Chiusure straordinarie
            </p>
            <div className="space-y-1.5">
              {upcomingSpecialDays.map((day: any) => (
                <div key={day.date} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40">
                  <div>
                    <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">{day.label || "Giorno speciale"}</span>
                    <span className="text-xs text-stone-500 dark:text-stone-400 ml-2">{formatSpecialDate(day.date)}</span>
                  </div>
                  <span className={`text-xs font-semibold ${day.isClosed ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {day.isClosed ? "Chiuso" : `${day.open} – ${day.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            <Clock className="h-3 w-3 inline mr-1" />
            Gli orari possono variare durante le festività
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
