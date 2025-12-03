export const timeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";

  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";

  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";

  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";

  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";

  return "just now";
};
