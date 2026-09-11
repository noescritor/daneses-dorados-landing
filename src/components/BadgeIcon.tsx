import Group6 from "@/imports/Group6";

interface BadgeIconProps {
  size?: number;
  className?: string;
}

export default function BadgeIcon({ size = 56, className = "" }: BadgeIconProps) {
  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <Group6 />
    </div>
  );
}
