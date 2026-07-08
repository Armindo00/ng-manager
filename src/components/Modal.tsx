type Props = {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
};

function Modal({ title, children, onClose }: Props) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{title}</h2>

          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}

export default Modal;
