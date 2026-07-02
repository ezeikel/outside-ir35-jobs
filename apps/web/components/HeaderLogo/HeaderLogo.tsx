import Link from 'next/link';
import BrandMark from '@/components/BrandMark/BrandMark';

// The brand mark + wordmark, in the Register display face (Instrument Serif) to
// match the rest of the site. Responsive label via CSS (no JS media query → no
// hydration flash): full name on sm+, short mark on mobile.
const HeaderLogo = () => (
  <Link
    href="/"
    className="flex items-center gap-2 font-display text-2xl leading-none tracking-tight"
  >
    <BrandMark className="h-7 w-auto" />
    <span className="hidden sm:inline">Outside IR35 Jobs</span>
    <span className="sm:hidden">OIR35J</span>
  </Link>
);

export default HeaderLogo;
