"use client";

type Option = { value: string; label: string };
type OrderAction = (formData: FormData) => void | Promise<void>;

export default function OrderAutoSelect({
  id,
  name,
  value,
  label,
  options,
  action,
}: {
  id: string;
  name: string;
  value: string;
  label: string;
  options: Option[];
  action: OrderAction;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name={name}
        aria-label={`${label} ${id}`}
        value={value}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        style={{ width: "100%", minWidth: "126px", padding: "7px 8px", borderRadius: "6px", fontSize: "0.82rem" }}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </form>
  );
}