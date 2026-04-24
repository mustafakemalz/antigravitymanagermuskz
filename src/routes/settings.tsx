import { createFileRoute } from '@tanstack/react-router';
import { useTheme } from '@/components/theme-provider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { getAppVersion, getPlatform } from '@/actions/app';
import { useTranslation } from 'react-i18next';
import { setAppLanguage } from '@/actions/language';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, FolderOpen, HardDrive, MonitorCog, BellRing, Shield, Activity } from 'lucide-react';
import { ModelVisibilitySettings } from '@/components/ModelVisibilitySettings';
import { useEffect, useState } from 'react';
import { ProxyConfig } from '@/types/config';
import { openLogDirectory } from '@/actions/system';
import { ControlToggle } from '@/components/ui/ControlToggle';
import { PanelButton } from '@/components/ui/PanelButton';
import { PanelCard, PanelCardContent, PanelCardHeader } from '@/components/ui/PanelCard';
import { TerminalStat } from '@/components/ui/TerminalStat';
import { cn } from '@/lib/utils';

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { config, isLoading, saveConfig } = useAppConfig();
  const { toast } = useToast();

  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | undefined>(undefined);

  useEffect(() => {
    if (config) {
      setProxyConfig(config.proxy);
    }
  }, [config]);

  const { data: appVersion } = useQuery({
    queryKey: ['app', 'version'],
    queryFn: getAppVersion,
  });

  const { data: platform } = useQuery({
    queryKey: ['app', 'platform'],
    queryFn: getPlatform,
  });

  const isAutoStartSupported =
    platform === 'win32' || platform === 'darwin' || platform === 'linux';
  const isMac = platform === 'darwin';

  const handleLanguageChange = (value: string) => {
    setAppLanguage(value, i18n);
  };

  const updateProxyConfig = async (newProxyConfig: ProxyConfig) => {
    setProxyConfig(newProxyConfig);
    if (config) {
      await saveConfig({ ...config, proxy: newProxyConfig });
    }
  };

  if (isLoading || !proxyConfig || !config) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PanelCard>
        <PanelCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="terminal-meta">Hardware Config</div>
              <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[0.18em]">
                {t('settings.title')}
              </h2>
              <p className="text-muted-foreground mt-3 max-w-3xl text-sm">
                {t('settings.description')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TerminalStat label="Version" value={appVersion || t('common.unknown')} />
              <TerminalStat label="Platform" value={platform || t('common.unknown')} />
              <TerminalStat label="Theme" value={theme.toUpperCase()} />
            </div>
          </div>
        </PanelCardHeader>
      </PanelCard>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="panel-card grid h-auto w-full grid-cols-3 p-1">
          <TabsTrigger value="general" className="rounded-sm text-xs uppercase tracking-[0.14em]">
            {t('settings.general')}
          </TabsTrigger>
          <TabsTrigger value="models" className="rounded-sm text-xs uppercase tracking-[0.14em]">
            {t('settings.models')}
          </TabsTrigger>
          <TabsTrigger value="proxy" className="rounded-sm text-xs uppercase tracking-[0.14em]">
            {t('settings.proxy_tab')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-5">
          <PanelCard>
            <PanelCardHeader>
              <div className="flex items-center gap-2">
                <MonitorCog className="h-4 w-4 text-cyan-300" />
                <span className="terminal-meta">{t('settings.appearance.title')}</span>
              </div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.appearance.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="dark-mode" className="terminal-meta">
                    {t('settings.darkMode')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.darkModeDescription')}
                  </p>
                </div>
                <ControlToggle
                  id="dark-mode"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>

              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="language" className="terminal-meta">
                    {t('settings.language.title')}
                  </Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.language.description')}
                  </p>
                </div>
                <Select value={i18n.language} onValueChange={handleLanguageChange} key={i18n.language}>
                  <SelectTrigger className="panel-input w-[200px]">
                    <SelectValue placeholder={t('settings.language.title')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">{t('settings.language.english')}</SelectItem>
                    <SelectItem value="zh-CN">{t('settings.language.chinese')}</SelectItem>
                    <SelectItem value="ru">{t('settings.language.russian')}</SelectItem>
                    <SelectItem value="vi">{t('settings.language.vietnamese')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </PanelCardContent>
          </PanelCard>

          <PanelCard>
            <PanelCardHeader>
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-cyan-300" />
                <span className="terminal-meta">{t('settings.account.title')}</span>
              </div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.account.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label className="terminal-meta">{t('settings.account.auto_refresh')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.account.auto_refresh_desc')}
                  </p>
                </div>
                <ControlToggle
                  checked={config.auto_refresh || false}
                  onCheckedChange={async (checked) => {
                    await saveConfig({ ...config, auto_refresh: checked });
                  }}
                />
              </div>

              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label className="terminal-meta">{t('settings.account.auto_sync')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.account.auto_sync_desc')}
                  </p>
                </div>
                <ControlToggle
                  checked={config.auto_sync || false}
                  onCheckedChange={async (checked) => {
                    await saveConfig({ ...config, auto_sync: checked });
                  }}
                />
              </div>
            </PanelCardContent>
          </PanelCard>

          {isAutoStartSupported && (
            <PanelCard>
              <PanelCardHeader>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  <span className="terminal-meta">{t('settings.startup.title')}</span>
                </div>
                <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                  {t('settings.startup.description')}
                </div>
              </PanelCardHeader>
              <PanelCardContent className="space-y-4">
                <div className="panel-card flex items-center justify-between px-4 py-4">
                  <div className="space-y-1">
                    <Label className="terminal-meta">{t('settings.startup.auto_startup')}</Label>
                    <p className="text-muted-foreground text-xs">
                      {t('settings.startup.auto_startup_desc')}
                    </p>
                  </div>
                  <ControlToggle
                    checked={config.auto_startup || false}
                    onCheckedChange={async (checked) => {
                      await saveConfig({ ...config, auto_startup: checked });
                    }}
                  />
                </div>
                {isMac && (
                  <p className="text-muted-foreground text-xs">{t('settings.startup.macos_hint')}</p>
                )}
              </PanelCardContent>
            </PanelCard>
          )}

          <PanelCard>
            <PanelCardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-300" />
                <span className="terminal-meta">{t('settings.privacy.title')}</span>
              </div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.privacy.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label className="terminal-meta">{t('settings.privacy.error_reporting')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.privacy.error_reporting_desc')}
                  </p>
                </div>
                <ControlToggle
                  checked={config.error_reporting_enabled || false}
                  onCheckedChange={async (checked) => {
                    await saveConfig({ ...config, error_reporting_enabled: checked });
                  }}
                />
              </div>
              <p className="text-muted-foreground text-xs">{t('settings.privacy.restart_note')}</p>
            </PanelCardContent>
          </PanelCard>

          <PanelCard>
            <PanelCardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-cyan-300" />
                <span className="terminal-meta">{t('settings.notifications.title')}</span>
              </div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.notifications.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label className="terminal-meta">{t('settings.notifications.quotaAlert')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.notifications.quotaAlertDesc')}
                  </p>
                </div>
                <ControlToggle
                  checked={config.quota_alert_enabled || false}
                  onCheckedChange={async (checked) => {
                    try {
                      await saveConfig({ ...config, quota_alert_enabled: checked });
                    } catch {
                      toast({
                        title: t('common.error'),
                        description: t('settings.notifications.saveFailed'),
                        variant: 'destructive',
                      });
                    }
                  }}
                />
              </div>

              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label className="terminal-meta">{t('settings.notifications.quotaThreshold')}</Label>
                  <p className="text-muted-foreground text-xs">
                    {t('settings.notifications.quotaThresholdDesc')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={config.quota_alert_threshold ?? 20}
                    onChange={async (e) => {
                      const parsed = parseInt(e.target.value, 10);
                      if (isNaN(parsed) || parsed < 0 || parsed > 100) {
                        return;
                      }

                      try {
                        await saveConfig({ ...config, quota_alert_threshold: parsed });
                      } catch {
                        toast({
                          title: t('common.error'),
                          description: t('settings.notifications.thresholdSaveFailed'),
                          variant: 'destructive',
                        });
                      }
                    }}
                    className="panel-input h-10 w-20 text-center"
                  />
                  <span className="text-muted-foreground text-sm">%</span>
                </div>
              </div>
            </PanelCardContent>
          </PanelCard>

          <PanelCard>
            <PanelCardHeader>
              <div className="terminal-meta">{t('settings.about.title')}</div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.about.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <TerminalStat label={t('settings.version')} value={appVersion || t('common.unknown')} />
                <TerminalStat label={t('settings.platform')} value={platform || t('common.unknown')} />
                <TerminalStat label={t('settings.license')} value="CC BY-NC-SA 4.0" />
              </div>

              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div>
                  <div className="terminal-meta">{t('action.openLogs')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('settings.openLogDir')}</div>
                </div>
                <PanelButton className="h-9 px-3" onClick={() => openLogDirectory()}>
                  <FolderOpen className="h-4 w-4" />
                  {t('settings.openLogDir')}
                </PanelButton>
              </div>
            </PanelCardContent>
          </PanelCard>
        </TabsContent>

        <TabsContent value="models" className="space-y-5">
          <ModelVisibilitySettings />
        </TabsContent>

        <TabsContent value="proxy" className="space-y-5">
          <PanelCard>
            <PanelCardHeader>
              <div className="terminal-meta">{t('settings.proxy.title')}</div>
              <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                {t('settings.proxy.description')}
              </div>
            </PanelCardHeader>
            <PanelCardContent className="space-y-4">
              <div className="panel-card flex items-center justify-between px-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="upstream-proxy-enabled" className="terminal-meta">
                    {t('settings.proxy.enable')}
                  </Label>
                </div>
                <ControlToggle
                  id="upstream-proxy-enabled"
                  checked={proxyConfig.upstream_proxy.enabled}
                  onCheckedChange={(checked) =>
                    updateProxyConfig({
                      ...proxyConfig,
                      upstream_proxy: { ...proxyConfig.upstream_proxy, enabled: checked },
                    })
                  }
                />
              </div>
              <div className="panel-card px-4 py-4">
                <Label htmlFor="upstream-proxy-url" className="terminal-meta">
                  {t('settings.proxy.url')}
                </Label>
                <Input
                  id="upstream-proxy-url"
                  className="panel-input mt-2"
                  placeholder="http://127.0.0.1:7890"
                  value={proxyConfig.upstream_proxy.url}
                  onChange={(e) =>
                    updateProxyConfig({
                      ...proxyConfig,
                      upstream_proxy: { ...proxyConfig.upstream_proxy, url: e.target.value },
                    })
                  }
                  disabled={!proxyConfig.upstream_proxy.enabled}
                />
              </div>
            </PanelCardContent>
          </PanelCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
});
