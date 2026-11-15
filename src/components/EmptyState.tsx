import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

function EmptyState({ title, description, action }: Props) {
  return (
    <div className="empty-state">
      <strong className="empty-state-title">{title}</strong>
      {description ? <p className="empty-state-copy">{description}</p> : null}
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
