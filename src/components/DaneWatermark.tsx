import Group from "@/imports/Group";

interface DaneWatermarkProps {
  className?: string;
}

export default function DaneWatermark({ className = "" }: DaneWatermarkProps) {
  return (
    <div className={`relative ${className}`}>
      <Group />
    </div>
  );
}
