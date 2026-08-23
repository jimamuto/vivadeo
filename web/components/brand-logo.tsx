export function BrandLogo({ className = "" }: { className?: string }) {
  return <img className={`brand-logo ${className}`.trim()} src="/vivadeoavatar.png" alt="Vivadeo" />;
}
