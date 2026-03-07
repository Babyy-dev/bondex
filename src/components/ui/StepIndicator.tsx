"use client";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full">
      {steps.map((step, index) => {
        const num = index + 1;
        const isDone   = num < currentStep;
        const isActive = num === currentStep;
        return (
          <div key={step} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isDone || isActive ? "#1A120B" : "#EDE8DF",
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                  isDone || isActive ? "text-white" : "text-[#A89080]"
                )}
              >
                {isDone ? <Check size={14} /> : num}
              </motion.div>
              <span className={cn(
                "text-[10px] font-medium hidden sm:block",
                isActive ? "text-[#1A120B]" : "text-[#A89080]"
              )}>
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 mx-1 h-0.5 relative overflow-hidden bg-[#EDE8DF] rounded-full">
                <motion.div
                  initial={false}
                  animate={{ scaleX: num < currentStep ? 1 : 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-0 bg-[#1A120B] origin-left rounded-full"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
