import Link from 'next/link';
import { ProfileMenu } from '@/components/navigation/ProfileMenu';
import { Logo } from '@/components/icons/Logo'; // A simple text logo for now

export function AppHeader() {
  // In a real app, userName would come from auth context or props
  const userName = "User"; 

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/home" className="flex items-center gap-2" aria-label="Go to homepage">
          <Logo className="h-6 w-6 text-primary" />
          <span className="font-headline text-lg font-semibold text-foreground">Little Steps</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground hidden sm:block">
            Welcome, <span className="font-semibold text-foreground">{userName}</span>
          </p>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
