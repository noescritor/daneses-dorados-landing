interface BadgeIconProps {
  size?: number;
  className?: string;
}

export default function BadgeIcon({ size = 56, className = "" }: BadgeIconProps) {
  return (
    <img
      src="/logo-daneses.svg"
      alt="Daneses Dorados Morelos"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
