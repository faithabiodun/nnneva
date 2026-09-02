/** The seven destinations in the app sidebar, in the design's order. */
export const NAV = [
  { href: "/home", label: "Home", d: "M4 10.5 12 4l8 6.5V20h-5v-5.5H9V20H4z" },
  {
    href: "/agent",
    label: "Nnneva",
    d: "M12 3a9 9 0 1 0 4.6 16.7L21 21l-1.3-4.4A9 9 0 0 0 12 3z",
    // The sidebar carries the count of decisions waiting on her, so an approval
    // is visible from every screen and not only from Home.
    badge: true,
  },
  {
    href: "/tasks",
    label: "Tasks",
    d: "M9 6h11M9 12h11M9 18h11M4 6l1.4 1.4L8 4.8M4 12l1.4 1.4L8 10.8M4 18l1.4 1.4L8 16.8",
  },
  { href: "/appointments", label: "Appointments", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { href: "/activity", label: "Activity", d: "M3 12h4l3 7 4-14 3 7h4" },
  {
    href: "/memory",
    label: "Memory",
    d: "M12 4a4 4 0 0 0-4 4v.6a3 3 0 0 0 0 5.8V16a4 4 0 0 0 8 0v-1.6a3 3 0 0 0 0-5.8V8a4 4 0 0 0-4-4z",
  },
  {
    href: "/profile",
    label: "Profile",
    d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20.5c.6-3.6 3.7-5.5 7.5-5.5s6.9 1.9 7.5 5.5",
  },
] as const;
