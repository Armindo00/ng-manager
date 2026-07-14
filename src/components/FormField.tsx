import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
};

function FormField({ label, htmlFor, children, className }: Props) {
  return (
    <label
      className={["field-label", className].filter(Boolean).join(" ")}
      htmlFor={htmlFor}
    >
      {label}
      {children}
    </label>
  );
}

export default FormField;
