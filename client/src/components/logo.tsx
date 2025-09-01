import logoImage from '@assets/homebase-logo_1756685782582.png';

export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="HomeBase" 
      className={`${className} object-contain`}
    />
  );
}