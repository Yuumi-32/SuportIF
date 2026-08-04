import { cn } from "@/lib/utils";

type FeedbackBoxProps = {
  isCorrect?: boolean;
  title: string;
  children: React.ReactNode;
};

export function FeedbackBox({ isCorrect, title, children }: FeedbackBoxProps) {
  return (
    <div
      className={cn(
        "rounded-md border px-4 py-3 text-sm leading-6 shadow-sm",
        isCorrect === true && "border-violet-200 bg-violet-50 text-violet-950",
        isCorrect === false && "border-amber-200 bg-amber-50 text-amber-950",
        isCorrect === undefined && "border-slate-200 bg-slate-50 text-slate-700"
      )}
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
