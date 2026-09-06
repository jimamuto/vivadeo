export function BrandLogo({ className = "" }: { className?: string }) {
  return <span className={`brand-lockup ${className}`.trim()}><img className="brand-mark-image" src="/vivadeo-mark.png" alt="" /><img className="brand-logo" src="/vivadeoavatar.png" alt="Vivadeo" /></span>;
}
