import { cn } from "@/lib/utils";

interface UserAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  username: string;
  size?: "sm" | "md" | "lg";
}

export function UserAvatar({ username, size = "md", className, ...props }: UserAvatarProps) {
  const firstLetter = username?.[0]?.toUpperCase() || "?";
  
  const sizeClasses = {
    sm: "h-8 w-8 text-sm",
    md: "h-9 w-9 text-base",
    lg: "h-10 w-10 text-lg"
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {firstLetter}
    </div>
  );
} 