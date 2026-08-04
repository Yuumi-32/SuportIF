import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function AdminTextInput({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = true
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <FieldLabel label={label}>
      <Input
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
      />
    </FieldLabel>
  );
}

export function AdminTextarea({
  label,
  name,
  defaultValue,
  rows = 4,
  required = true
}: {
  label: string;
  name: string;
  defaultValue?: string | string[] | null;
  rows?: number;
  required?: boolean;
}) {
  const value = Array.isArray(defaultValue) ? defaultValue.join("\n") : defaultValue ?? "";

  return (
    <FieldLabel label={label}>
      <textarea
        name={name}
        rows={rows}
        defaultValue={value}
        required={required}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      />
    </FieldLabel>
  );
}

export function AdminSelect({
  label,
  name,
  defaultValue,
  options,
  required = true
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
}) {
  return (
    <FieldLabel label={label}>
      <select
        name={name}
        defaultValue={defaultValue ?? ""}
        required={required}
        className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
      >
        {!required ? <option value="">Nenhum</option> : null}
        {required ? <option value="">Selecione</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldLabel>
  );
}

export function AdminCheckbox({
  label,
  name,
  defaultChecked = false
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
      />
      {label}
    </label>
  );
}

export function AdminSubmitButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={cn(
        "inline-flex h-11 items-center justify-center rounded-md bg-violet-700 px-5 text-sm font-semibold text-white transition-colors hover:bg-violet-800",
        className
      )}
    >
      {children}
    </button>
  );
}
