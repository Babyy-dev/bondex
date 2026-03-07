import { Hotel, Clock, Mail } from "lucide-react";

export function GoodToKnow() {
  return (
    <div className="bg-[#FEFCF8] border border-[#EDE8DF] rounded-3xl p-5 mt-2">
      <p className="text-xs font-semibold text-[#C8A96E] mb-3 uppercase tracking-wide">Good to know</p>
      <div className="flex flex-col gap-3">
        {[
          { icon: Hotel, text: "Pick up at the hotel front desk – no need to wait at home." },
          { icon: Clock, text: "Hotel staff will keep it safe until your arrival." },
          { icon: Mail,  text: "If there are any changes, you will be notified by email." },
        ].map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-7 h-7 bg-[#EDE8DF] rounded-full flex items-center justify-center flex-shrink-0">
              <Icon size={13} className="text-[#7A6252]" />
            </div>
            <p className="text-sm text-[#7A6252] leading-snug">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
