import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, XCircle, Calendar } from "lucide-react";

interface OpeningHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pubName: string;
  openingHours: any;
}

const dayNames = {
  monday: "Lunedì",
  tuesday: "Martedì", 
  wednesday: "Mercoledì",
  thursday: "Giovedì",
  friday: "Venerdì",
  saturday: "Sabato",
  sunday: "Domenica"
};

const getCurrentDay = () => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
};

const isCurrentlyOpen = (openingHours: any, dayKey: string) => {
  if (!openingHours || !openingHours[dayKey]) return false;
  
  const dayHours = openingHours[dayKey];
  if (dayHours.isClosed) return false;
  
  if (dayHours.open && dayHours.close) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [openHour, openMin] = dayHours.open.split(':').map(Number);
    const [closeHour, closeMin] = dayHours.close.split(':').map(Number);
    const openTime = openHour * 60 + openMin;
    const closeTime = closeHour * 60 + closeMin;
    
    if (closeTime < openTime) {
      // Hours cross midnight
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  }
  
  return true;
};

export default function OpeningHoursDialog({ open, onOpenChange, pubName, openingHours }: OpeningHoursDialogProps) {
  const currentDay = getCurrentDay();
  const isOpenNow = isCurrentlyOpen(openingHours, currentDay);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/20 dark:border-gray-700/30 shadow-2xl" data-testid="dialog-opening-hours">
        <DialogHeader className="space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                Orari di Apertura
              </DialogTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {pubName}
              </p>
            </div>
          </div>
          
          {/* Current Status */}
          <div className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-blue-900 border border-gray-200 dark:border-gray-700">
            <Badge 
              className={`${
                isOpenNow 
                  ? 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600' 
                  : 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-300 dark:border-red-600'
              } px-4 py-2 text-sm font-semibold`}
            >
              {isOpenNow ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aperto ora
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Chiuso ora
                </>
              )}
            </Badge>
          </div>
        </DialogHeader>

        {/* Opening Hours List */}
        <div className="space-y-2 mt-6">
          {Object.entries(dayNames).map(([dayKey, dayName]) => {
            const dayHours = openingHours?.[dayKey];
            const isToday = dayKey === currentDay;
            const isClosed = !dayHours || dayHours.isClosed;
            
            return (
              <div 
                key={dayKey}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  isToday 
                    ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 shadow-sm' 
                    : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                data-testid={`hours-${dayKey}`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    isToday 
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <Clock className={`h-3 w-3 ${
                      isToday ? 'text-white' : 'text-gray-500 dark:text-gray-400'
                    }`} />
                  </div>
                  <span className={`font-medium ${
                    isToday 
                      ? 'text-amber-800 dark:text-amber-200' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {dayName}
                  </span>
                  {isToday && (
                    <Badge variant="outline" className="text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                      Oggi
                    </Badge>
                  )}
                </div>
                
                <div className={`text-sm font-semibold ${
                  isToday 
                    ? 'text-amber-800 dark:text-amber-200' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {isClosed ? (
                    <span className="text-red-600 dark:text-red-400 flex items-center">
                      <XCircle className="h-3 w-3 mr-1" />
                      Chiuso
                    </span>
                  ) : dayHours?.open && dayHours?.close ? (
                    <span>
                      {dayHours.open} - {dayHours.close}
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aperto
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
            <Clock className="h-3 w-3 inline mr-1" />
            Gli orari possono variare durante le festività
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}