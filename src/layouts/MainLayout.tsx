import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from '@tanstack/react-router';
import { SplashScreen } from '@/components/SplashScreen';
import { cn } from '@/lib/utils';
import { StatusBar } from '@/components/StatusBar';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  LayoutDashboard,
  Network,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PanelButton } from '@/components/ui/PanelButton';
import { PanelCard } from '@/components/ui/PanelCard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ErrorBoundary } from 'react-error-boundary';
import { useToast } from '@/components/ui/use-toast';
import { getLocalizedErrorMessage } from '@/utils/errorMessages';

export const MainLayout: React.FC = () => {
  const pixelProfile = new URL('../assets/pixel_profile.png', import.meta.url).href;
  const location = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const hasShownRouteErrorToastRef = useRef(false);

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1500);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const navItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: t('nav.accounts'),
      shortLabel: 'Manager',
      meta: 'Primary',
    },
    {
      to: '/proxy',
      icon: Network,
      label: t('nav.proxy'),
      shortLabel: 'Proxy',
      meta: 'Console',
    },
    {
      to: '/settings',
      icon: SlidersHorizontal,
      label: t('nav.settings'),
      shortLabel: 'Config',
      meta: 'Hardware',
    },
  ];

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <aside
          className={cn(
            'nav-rail group relative flex flex-col transition-all duration-300 ease-in-out',
            isCollapsed ? 'w-[88px]' : 'w-[248px]',
          )}
        >
          <PanelButton
            className="absolute top-5 -right-3 z-20 h-7 w-7 px-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </PanelButton>

          <div className="border-b border-white/10 px-4 py-5">
            <PanelCard active className={cn('px-4 py-4', isCollapsed && 'px-3')}>
              <div className="flex items-center gap-4 overflow-hidden">
                <img
                  src={pixelProfile}
                  alt="Muskz Command"
                  className="h-11 w-11 shrink-0 border border-white/10 object-cover"
                />
                {!isCollapsed && (
                  <div className="min-w-0">
                    <div className="terminal-meta">MUSKZ COMMAND</div>
                    <div className="truncate text-sm font-semibold uppercase tracking-[0.16em]">
                      COMMAND
                    </div>
                  </div>
                )}
              </div>
            </PanelCard>
          </div>

          <nav className="flex-1 px-4 py-5">
            <TooltipProvider delayDuration={0}>
              <div className="space-y-3">
                {navItems.map((item, index) => {
                  const isActive = location.pathname === item.to;

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.to}>
                        <TooltipTrigger asChild>
                          <Link
                            to={item.to}
                            className={cn(
                              'mx-auto flex h-11 w-11 items-center justify-center rounded-none border transition-all',
                              index === 0 ? '' : 'opacity-90',
                              isActive ? 'panel-card-active' : 'panel-card',
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            <span className="sr-only">{item.label}</span>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(
                        'flex items-center gap-4 rounded-none border px-4 py-4 transition-all',
                        isActive ? 'panel-card-active' : 'panel-card',
                        index > 0 && 'opacity-90',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-white/80" />
                      <div className="min-w-0">
                        <div className="terminal-meta !text-[10px]">{item.meta}</div>
                        <div className="truncate text-xs font-semibold uppercase tracking-[0.14em]">
                          {item.shortLabel}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </TooltipProvider>
          </nav>

          <div className="border-t border-white/10 p-4">
            <StatusBar isCollapsed={isCollapsed} />
          </div>
        </aside>

        <main className="flex-1 overflow-auto transition-all duration-300">
          <ErrorBoundary
            resetKeys={[location.pathname]}
            onReset={() => {
              hasShownRouteErrorToastRef.current = false;
            }}
            onError={(error) => {
              if (hasShownRouteErrorToastRef.current) {
                return;
              }

              toast({
                title: t('error.generic'),
                description: getLocalizedErrorMessage(error, t),
                variant: 'destructive',
              });
              hasShownRouteErrorToastRef.current = true;
            }}
            fallbackRender={({ resetErrorBoundary }) => (
              <div className="mx-auto max-w-3xl p-6">
                <PanelCard className="p-8 text-center">
                  <div className="text-lg font-semibold">{t('error.generic')}</div>
                  <div className="text-muted-foreground mt-2 text-sm">{t('action.retry')}</div>
                  <Button className="panel-button mt-4" variant="outline" onClick={resetErrorBoundary}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('action.retry')}
                  </Button>
                </PanelCard>
              </div>
            )}
          >
            <div className="mx-auto w-full max-w-6xl px-8 py-8 md:px-10 md:py-10">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};
