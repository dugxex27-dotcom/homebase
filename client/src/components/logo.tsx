import logoImage from '@assets/homebase-logo-white-text_1756769633567.png';

export default function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img 
      src={logoImage} 
      alt="HomeBase" 
      className={`${className} object-contain`}
    />
  );
}