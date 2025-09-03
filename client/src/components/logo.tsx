import logoImage from '@assets/homebase-logo_1756861910640.png';

export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="HomeBase" 
      className={`${className} object-contain`}
    />
  );
}