type Props = {
  message: string;
  type?: "success" | "error";
};

function Toast({ message, type = "success" }: Props) {
  return (
    <div className={"toast toast-" + type} role="status">
      {message}
    </div>
  );
}

export default Toast;
