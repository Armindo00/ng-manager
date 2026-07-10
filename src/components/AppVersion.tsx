import { getVersionLabel } from "../config/version";

type Props = {
  className?: string;
};

function AppVersion({ className = "app-version" }: Props) {
  return <p className={className}>{getVersionLabel()}</p>;
}

export default AppVersion;
