type Props = {
  label?: string;
};

function LoadingBlock({ label = "A carregar..." }: Props) {
  return (
    <div className="loading-block" role="status" aria-live="polite">
      <span className="loading-block-bar" aria-hidden />
      <span className="loading-block-bar short" aria-hidden />
      <span className="loading-block-label">{label}</span>
    </div>
  );
}

export default LoadingBlock;
