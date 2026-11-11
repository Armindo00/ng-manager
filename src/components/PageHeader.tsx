type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
};

function PageHeader({ eyebrow, title, description }: Props) {
  return (
    <header className="page-header">
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {description ? <p className="page-description">{description}</p> : null}
    </header>
  );
}

export default PageHeader;
