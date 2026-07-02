interface IconProps {
  name: string;
  filled?: boolean;
  size?: number;
  className?: string;
  label?: string;
}

export function Icon({ name, filled, size = 22, className = '', label }: IconProps) {
  return (
    <span
      className={`msr ${filled ? 'fill' : ''} ${className}`}
      style={{ fontSize: size }}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'img' : undefined}
    >
      {name}
    </span>
  );
}
