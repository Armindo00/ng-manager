type Props = {
  message: string;
  type?: "success" | "error";
};

function Toast({ message, type = "success" }: Props) {
  return (
    <div className={"toast toast-" + type}>
      {type === "success" ? "✅" : "❌"} {message}
    </div>
  );
}

export default Toast;
