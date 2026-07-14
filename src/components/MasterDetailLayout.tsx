import type { ReactNode } from "react";

type MasterDetailLayoutProps = {
  list: ReactNode;
  detail: ReactNode;
  emptyDetail?: ReactNode;
  showDetail?: boolean;
};

export function MasterDetailLayout({
  list,
  detail,
  emptyDetail,
  showDetail = true,
}: MasterDetailLayoutProps) {
  return (
    <div className="master-detail-layout">
      <div className="master-detail-list">{list}</div>
      <div className="master-detail-panel">
        {showDetail ? detail : emptyDetail ?? <DetailPanelEmpty />}
      </div>
    </div>
  );
}

type SelectionListProps = {
  title?: string;
  toolbar?: ReactNode;
  empty?: ReactNode;
  children: ReactNode;
};

export function SelectionList({
  title,
  toolbar,
  empty,
  children,
}: SelectionListProps) {
  const hasChildren = Array.isArray(children)
    ? children.some(Boolean)
    : Boolean(children);

  return (
    <div className="selection-list card section-card">
      {(title || toolbar) && (
        <div className="selection-list-header">
          {title && <h2>{title}</h2>}
          {toolbar}
        </div>
      )}
      <div className="selection-list-items">
        {hasChildren ? children : empty}
      </div>
    </div>
  );
}

type SelectionListItemProps = {
  active?: boolean;
  onClick: () => void;
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  badge?: ReactNode;
};

export function SelectionListItem({
  active,
  onClick,
  title,
  subtitle,
  meta,
  badge,
}: SelectionListItemProps) {
  return (
    <button
      type="button"
      className={
        active ? "selection-list-item active" : "selection-list-item"
      }
      onClick={onClick}
    >
      <div className="selection-list-item-main">
        <strong>{title}</strong>
        {subtitle && <span className="selection-list-item-subtitle">{subtitle}</span>}
        {meta && <span className="selection-list-item-meta">{meta}</span>}
      </div>
      {badge && <div className="selection-list-item-badge">{badge}</div>}
    </button>
  );
}

type DetailPanelProps = {
  title?: string;
  onBack?: () => void;
  actions?: ReactNode;
  children: ReactNode;
};

export function DetailPanel({ title, onBack, actions, children }: DetailPanelProps) {
  return (
    <div className="detail-panel card section-card">
      {(title || onBack || actions) && (
        <div className="detail-panel-header">
          <div className="detail-panel-header-main">
            {onBack && (
              <button type="button" className="compact-btn" onClick={onBack}>
                ← Voltar
              </button>
            )}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="detail-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="detail-panel-body">{children}</div>
    </div>
  );
}

export function DetailPanelEmpty({ message = "Seleciona um item da lista." }) {
  return (
    <div className="detail-panel card section-card detail-panel-empty">
      <p className="muted">{message}</p>
    </div>
  );
}
