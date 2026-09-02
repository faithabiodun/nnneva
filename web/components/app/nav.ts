/** The seven destinations in the app sidebar, in the design's order. */
export const NAV = [
  { href: "/home", label: "Home", d: "M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" },
  { href: "/agent", label: "Nnneva", d: "M4 5.5h16v10H8.5L4 19z" },
  { href: "/tasks", label: "Tasks", d: "M4.5 7.5h15M4.5 12h15M4.5 16.5h9" },
  { href: "/appointments", label: "Appointments", d: "M4 6.5h16v13H4zM4 10.5h16M8.5 4v3M15.5 4v3" },
  { href: "/activity", label: "Activity", d: "M3.5 12h4l2.5-6 4 12 2.5-6h4" },
  { href: "/memory", label: "Memory", d: "M12 4.5a4 4 0 0 0-4 4v1a3 3 0 0 0 0 6v1a3 3 0 0 0 6 0V8.5a4 4 0 0 0-2-4Z" },
  { href: "/profile", label: "Profile", d: "M12 12a3.6 3.6 0 1 0 0-7.2A3.6 3.6 0 0 0 12 12ZM5 20c0-3.3 3.1-5.4 7-5.4s7 2.1 7 5.4" },
] as const;
