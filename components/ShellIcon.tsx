type ShellIconProps = {
  name:
    | "dashboard"
    | "vault"
    | "projects"
    | "requests"
    | "network"
    | "insights"
    | "manufacturing"
    | "machine"
    | "calendar"
    | "plug"
    | "settings"
    | "account"
    | "logout";
  className?: string;
};

const commonProps = {
  "aria-hidden": true,
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  strokeWidth: 1.9,
  viewBox: "0 0 24 24",
};

export default function ShellIcon({ name, className = "h-5 w-5" }: ShellIconProps) {
  switch (name) {
    case "dashboard":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 5.5h6v6H4z" />
          <path d="M14 5.5h6v3.75h-6z" />
          <path d="M14 13h6v5.5h-6z" />
          <path d="M4 15h6v3.5H4z" />
        </svg>
      );
    case "vault":
      return (
        <svg {...commonProps} className={className}>
          <path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5z" />
          <path d="m5 7.5 7 3.5 7-3.5" />
          <path d="M12 11v9" />
        </svg>
      );
    case "projects":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 6.5h6l1.5 2H20v8.75A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25z" />
          <path d="M8 13h8" />
          <path d="M8 16h5" />
        </svg>
      );
    case "requests":
      return (
        <svg {...commonProps} className={className}>
          <path d="M7 4.5h7l3 3V19H7z" />
          <path d="M14 4.5v3h3" />
          <path d="M9.5 11h5" />
          <path d="M9.5 14h5" />
          <path d="M9.5 17h3" />
        </svg>
      );
    case "network":
      return (
        <svg {...commonProps} className={className}>
          <path d="M8 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M17 20.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M17 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
          <path d="M10.5 7h4" />
          <path d="m10 9 5 6" />
        </svg>
      );
    case "insights":
      return (
        <svg {...commonProps} className={className}>
          <path d="M5 19V9" />
          <path d="M12 19V5" />
          <path d="M19 19v-7" />
          <path d="M3.5 19.5h17" />
        </svg>
      );
    case "manufacturing":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4 19V9l4 2.25V9l4 2.25V5h4v6.25L20 9v10z" />
          <path d="M7 15h2" />
          <path d="M12 15h2" />
          <path d="M17 15h1" />
        </svg>
      );
    case "machine":
      return (
        <svg {...commonProps} className={className}>
          <path d="M4.5 18.5h15" />
          <path d="M6 18.5V8l4.5 3V8l4.5 3V5.5h3v13" />
          <path d="M8 15h2" />
          <path d="M13 15h2" />
          <path d="M17 15h1" />
          <path d="M15 5.5h3" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...commonProps} className={className}>
          <path d="M6.5 4v3" />
          <path d="M17.5 4v3" />
          <path d="M4.5 8h15" />
          <path d="M5.75 5.5h12.5A1.75 1.75 0 0 1 20 7.25v10.5a1.75 1.75 0 0 1-1.75 1.75H5.75A1.75 1.75 0 0 1 4 17.75V7.25A1.75 1.75 0 0 1 5.75 5.5Z" />
          <path d="M8 12h2" />
          <path d="M14 12h2" />
          <path d="M8 16h2" />
        </svg>
      );
    case "plug":
      return (
        <svg {...commonProps} className={className}>
          <path d="M8 4v5" />
          <path d="M16 4v5" />
          <path d="M7 9h10v3a5 5 0 0 1-10 0z" />
          <path d="M12 17v3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" />
          <path d="M18.5 13.5v-3l-2-.45a5.9 5.9 0 0 0-.8-1.9l1.1-1.75-2.1-2.1-1.75 1.1a5.9 5.9 0 0 0-1.9-.8L10.6 2.5h-3l-.45 2.1a5.9 5.9 0 0 0-1.9.8L3.5 4.3 1.4 6.4l1.1 1.75a5.9 5.9 0 0 0-.8 1.9L-.4 10.5v3l2.1.45a5.9 5.9 0 0 0 .8 1.9L1.4 17.6l2.1 2.1 1.75-1.1a5.9 5.9 0 0 0 1.9.8l.45 2.1h3l.45-2.1a5.9 5.9 0 0 0 1.9-.8l1.75 1.1 2.1-2.1-1.1-1.75a5.9 5.9 0 0 0 .8-1.9z" transform="translate(3)" />
        </svg>
      );
    case "account":
      return (
        <svg {...commonProps} className={className}>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" />
        </svg>
      );
    case "logout":
      return (
        <svg {...commonProps} className={className}>
          <path d="M10 5H5.75A1.75 1.75 0 0 0 4 6.75v10.5A1.75 1.75 0 0 0 5.75 19H10" />
          <path d="M15 8.5 18.5 12 15 15.5" />
          <path d="M9 12h9" />
        </svg>
      );
    default:
      return null;
  }
}
