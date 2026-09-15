import Image from 'next/image';

export function BrandLogo({ className = "" }: { className?: string }) {
  return <span className={`brand-lockup ${className}`.trim()}><Image className="brand-mark-image" src="/vivadeo-mark.png" alt="" width={512} height={512} /><Image className="brand-logo" src="/vivadeoavatar.png" alt="Vivadeo" width={1254} height={1254} /></span>;
}
