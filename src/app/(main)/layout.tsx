import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNavigationBar } from '@/components/navigation/BottomNavigationBar';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1 overflow-y-auto pb-16"> {/* padding-bottom for bottom nav on all screen sizes */}
        <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <BottomNavigationBar />
    </div>
  );
}
