import { Link } from 'wouter';
import logoIcon from '@assets/homebase-app-logo-color_1765291048899.png';

export default function Logo({ className = "h-[28px] sm:h-[32px] w-auto", clickable = true }: { className?: string; clickable?: boolean }) {
  const image = (
    <img 
      src={logoIcon} 
      alt="My HomeBase" 
      className={`${className} object-contain`}
    />
  );

  if (clickable) {
    return (
      <Link href="/" className="inline-block cursor-pointer" data-testid="logo-home-link">
        {image}
      </Link>
    );
  }

  return image;
}
