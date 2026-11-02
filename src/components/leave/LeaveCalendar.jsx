import { buildMonthGrid, coversDate, toDateKey } from "@/utils/leaveDates";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const shortName = (fullName) => {
  const parts = (fullName || "").trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "";
  return `${parts[0]} ${parts[1][0]}.`;
};

export default function LeaveCalendar({ year, month, requests, currentUserId, onDayClick }) {
  const days = buildMonthGrid(year, month);
  const todayKey = toDateKey(new Date());

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-zinc-800">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] md:text-xs uppercase tracking-widest text-zinc-500 font-semibold">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map(({ key, date, inMonth }) => {
          const dayRequests = requests.filter((r) => coversDate(r, key));
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => onDayClick(key)}
              className={`min-h-[74px] md:min-h-[102px] border-b border-r border-zinc-800/70 p-1 md:p-1.5 text-left align-top transition-colors hover:bg-zinc-800/40 ${
                inMonth ? "" : "opacity-40"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  isToday ? "bg-green-600 text-white" : "text-zinc-300"
                }`}
              >
                {date.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayRequests.slice(0, 3).map((r) => (
                  <div
                    key={r.id}
                    className={`truncate text-[9px] md:text-[10px] px-1 py-0.5 rounded font-semibold ${
                      r.user_id === currentUserId
                        ? "bg-blue-900/50 text-blue-200"
                        : r.status === "approved"
                        ? "bg-green-900/40 text-green-300"
                        : "bg-amber-900/40 text-amber-300"
                    }`}
                  >
                    {shortName(r.user_name)}
                  </div>
                ))}
                {dayRequests.length > 3 && (
                  <div className="text-[9px] text-zinc-500 pl-1">+{dayRequests.length - 3}</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}