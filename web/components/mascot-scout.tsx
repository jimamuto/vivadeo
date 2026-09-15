type MascotScoutProps = {
  className?: string;
  motion?: "look" | "still";
  size?: "small" | "medium" | "large";
};

export function MascotScout({ className = "", motion = "look", size = "medium" }: MascotScoutProps) {
  return (
    <figure className={`mascot-scout mascot-scout-${size} mascot-scout-${motion} ${className}`.trim()} aria-hidden="true">
      <span className="mascot-scout-art">
        <img src="/images/mascot/vivadeo-scout.png" alt="" draggable={false} />
      </span>
      <span className="mascot-scout-shadow" />
    </figure>
  );
}
