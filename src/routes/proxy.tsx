import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ipc } from '@/ipc/manager';
import { useEffect, useState, type ReactNode } from 'react';
import { useAppConfig } from '@/hooks/useAppConfig';
import { ProxyConfig } from '@/types/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ControlToggle } from '@/components/ui/ControlToggle';
import { LedProgress } from '@/components/ui/LedProgress';
import { PanelButton } from '@/components/ui/PanelButton';
import { PanelCard, PanelCardContent, PanelCardHeader } from '@/components/ui/PanelCard';
import { PanelSectionHeader } from '@/components/ui/PanelSectionHeader';
import { TerminalStat } from '@/components/ui/TerminalStat';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Copy,
  CheckCircle,
  Zap,
  Cpu,
  Sparkles,
  BrainCircuit,
  Code,
  Terminal,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  Router,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ProxyProtocol = 'openai' | 'anthropic';

interface ExampleModel {
  id: string;
  name: string;
  icon: ReactNode;
}

const EXAMPLE_MODELS: ExampleModel[] = [
  { id: 'gemini-3-flash', name: 'Gemini 3 Flash', icon: <Zap size={14} /> },
  { id: 'gemini-3.1-pro-low', name: 'Gemini 3.1 Pro (Low)', icon: <Cpu size={14} /> },
  { id: 'gemini-3.1-pro-high', name: 'Gemini 3.1 Pro (High)', icon: <Cpu size={14} /> },
  {
    id: 'claude-sonnet-4-6-thinking',
    name: 'Claude Sonnet 4.6 (Thinking)',
    icon: <Sparkles size={14} />,
  },
  {
    id: 'claude-opus-4-6-thinking',
    name: 'Claude Opus 4.6 (Thinking)',
    icon: <BrainCircuit size={14} />,
  },
];

const ANTHROPIC_ROUTE_OPTIONS = [
  'claude-sonnet-4-6-thinking',
  'claude-opus-4-6-thinking',
  'gemini-3-flash',
  'gemini-3.1-pro-low',
  'gemini-3.1-pro-high',
] as const;

const DEFAULT_ANTHROPIC_MAPPING: Record<string, string> = {
  'claude-sonnet-4-6-20260219': 'claude-sonnet-4-6-thinking',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4-6-thinking',
  'claude-opus-4-6-20260201': 'claude-opus-4-6-thinking',
  opus: 'claude-opus-4-6-thinking',
};

function resolveAnthropicMappingValue(
  anthropicMapping: Record<string, string>,
  keys: string[],
  fallback: string,
): string {
  for (const key of keys) {
    const value = anthropicMapping[key];
    if (value) {
      return value;
    }
  }
  return fallback;
}

function getProxyTone(enabled: boolean): 'cyan' | 'warning' {
  return enabled ? 'cyan' : 'warning';
}

function ProxyPage() {
  const { t } = useTranslation();
  const { config, isLoading, saveConfig } = useAppConfig();

  const { data: localIps } = useQuery({
    queryKey: ['system', 'localIps'],
    queryFn: async () => {
      try {
        const ips = await ipc.client.system.get_local_ips();
        return ips as { address: string; name: string; isRecommended: boolean }[];
      } catch (e) {
        console.error('Failed to get local IPs:', e);
        return [{ address: '127.0.0.1', name: 'localhost', isRecommended: false }];
      }
    },
    staleTime: Infinity,
    retry: 3,
  });

  const [selectedIp, setSelectedIp] = useState<string>('');
  const [proxyConfig, setProxyConfig] = useState<ProxyConfig | undefined>(undefined);
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<ProxyProtocol>('openai');
  const [activeModelTab, setActiveModelTab] = useState('gemini-3.1-pro-high');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (localIps && localIps.length > 0 && !selectedIp) {
      const recommended = localIps.find((ip) => ip.isRecommended);
      setSelectedIp(recommended?.address || localIps[0].address);
    }
  }, [localIps, selectedIp]);

  useEffect(() => {
    if (config) {
      const syncServerStatus = async () => {
        try {
          const status = await ipc.client.gateway.status();
          const actualEnabled = status.running;

          if (config.proxy.enabled !== actualEnabled) {
            const syncedConfig = { ...config.proxy, enabled: actualEnabled };
            setProxyConfig(syncedConfig);
            await saveConfig({ ...config, proxy: syncedConfig });
          } else {
            setProxyConfig(config.proxy);
          }
        } catch {
          setProxyConfig(config.proxy);
        }
      };
      syncServerStatus();
    }
  }, [config, saveConfig]);

  const updateProxyConfig = async (newProxyConfig: ProxyConfig) => {
    setProxyConfig(newProxyConfig);
    if (config) {
      await saveConfig({ ...config, proxy: newProxyConfig });
    }
  };

  const apiKey = proxyConfig?.api_key || 'YOUR_API_KEY';
  const baseUrl = `http://localhost:${proxyConfig?.port || 8045}`;

  const updateAnthropicMapping = (mappingPatch: Record<string, string>) => {
    if (!proxyConfig) {
      return;
    }
    updateProxyConfig({
      ...proxyConfig,
      anthropic_mapping: {
        ...proxyConfig.anthropic_mapping,
        ...mappingPatch,
      },
    });
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const getCurlExample = (modelId: string) => {
    if (selectedProtocol === 'anthropic') {
      return `curl ${baseUrl}/v1/messages \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKey}" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{
    "model": "${modelId}",
    "max_tokens": 1024,
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;
    }
    return `curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -d '{
    "model": "${modelId}",
    "messages": [{"role": "user", "content": "Hello"}]
  }'`;
  };

  const getPythonExample = (modelId: string) => {
    if (selectedProtocol === 'anthropic') {
      return `from anthropic import Anthropic

client = Anthropic(
    base_url="${baseUrl}",
    api_key="${apiKey}"
)

response = client.messages.create(
    model="${modelId}",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.content[0].text)`;
    }
    return `from openai import OpenAI

client = OpenAI(
    base_url="${baseUrl}/v1",
    api_key="${apiKey}"
)

response = client.chat.completions.create(
    model="${modelId}",
    messages=[{"role": "user", "content": "Hello"}]
)
print(response.choices[0].message.content)`;
  };

  if (isLoading || !proxyConfig) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PanelCard active={proxyConfig.enabled}>
        <PanelCardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="terminal-meta">Network Ops Console</div>
              <h2 className="mt-2 text-3xl font-semibold uppercase tracking-[0.18em]">
                {t('proxy.title')}
              </h2>
              <p className="text-muted-foreground mt-3 max-w-3xl text-sm">
                {t('proxy.description')}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <TerminalStat
                label="Gateway"
                value={proxyConfig.enabled ? t('proxy.service.running') : t('proxy.service.stopped')}
                tone={proxyConfig.enabled ? 'cyan' : 'warning'}
              />
              <TerminalStat label="Port" value={proxyConfig.port} />
              <TerminalStat label="Timeout" value={`${proxyConfig.request_timeout}s`} />
            </div>
          </div>
        </PanelCardHeader>

        <PanelCardContent className="space-y-4">
          {proxyConfig.enabled && (
            <div className="panel-card px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <TerminalStat
                  className="min-w-[220px] flex-1"
                  label={t('proxy.config.local_access')}
                  value={`http://${selectedIp || 'localhost'}:${proxyConfig.port}/v1`}
                  tone="cyan"
                />
                {localIps && localIps.length > 1 && (
                  <div className="min-w-[220px]">
                    <Label className="terminal-meta">{t('proxy.config.select_ip')}</Label>
                    <Select value={selectedIp} onValueChange={setSelectedIp}>
                      <SelectTrigger className="panel-input mt-2">
                        <SelectValue placeholder={t('proxy.config.select_ip')} />
                      </SelectTrigger>
                      <SelectContent>
                        {localIps.map((ip) => (
                          <SelectItem key={ip.address} value={ip.address}>
                            {ip.address} ({ip.name}){ip.isRecommended ? ' *' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {!proxyConfig.api_key && (
                <div className="text-secondary mt-3 text-xs uppercase tracking-[0.14em]">
                  {t('proxy.config.no_token_warning')}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <PanelCard active={proxyConfig.enabled}>
              <PanelCardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="terminal-meta">{t('proxy.service.title')}</div>
                    <div className="mt-2 text-sm uppercase tracking-[0.16em]">
                      {t('proxy.service.description')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'h-3 w-3 rounded-full',
                        proxyConfig.enabled
                          ? 'bg-primary shadow-[0_0_12px_rgba(0,255,255,0.75)]'
                          : 'bg-secondary shadow-[0_0_12px_rgba(255,136,0,0.4)]',
                      )}
                    />
                    <span className="text-xs uppercase tracking-[0.14em]">
                      {proxyConfig.enabled ? t('proxy.service.running') : t('proxy.service.stopped')}
                    </span>
                  </div>
                </div>
              </PanelCardHeader>
              <PanelCardContent className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <PanelButton
                    warning={proxyConfig.enabled}
                    onClick={async () => {
                      const { ipc: localIpc } = await import('@/ipc/manager');
                      if (proxyConfig.enabled) {
                        await localIpc.client.gateway.stop();
                        updateProxyConfig({ ...proxyConfig, enabled: false });
                      } else {
                        await localIpc.client.gateway.start({ port: proxyConfig.port });
                        updateProxyConfig({ ...proxyConfig, enabled: true });
                      }
                    }}
                  >
                    <Shield className="h-4 w-4" />
                    {proxyConfig.enabled ? t('proxy.service.stop') : t('proxy.service.start')}
                  </PanelButton>

                  <div className="min-w-[160px] flex-1">
                    <Label htmlFor="gateway-port" className="terminal-meta">
                      {t('proxy.config.port')}
                    </Label>
                    <Input
                      id="gateway-port"
                      className="panel-input mt-2"
                      type="number"
                      value={proxyConfig.port}
                      onChange={(e) =>
                        updateProxyConfig({
                          ...proxyConfig,
                          port: parseInt(e.target.value, 10) || 8045,
                        })
                      }
                      disabled={proxyConfig.enabled}
                    />
                  </div>

                  <div className="min-w-[160px] flex-1">
                    <Label htmlFor="gateway-timeout" className="terminal-meta">
                      {t('proxy.config.timeout')}
                    </Label>
                    <Input
                      id="gateway-timeout"
                      className="panel-input mt-2"
                      type="number"
                      value={proxyConfig.request_timeout}
                      onChange={(e) =>
                        updateProxyConfig({
                          ...proxyConfig,
                          request_timeout: parseInt(e.target.value, 10) || 120,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="panel-card px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-cyan-300" />
                    <span className="terminal-meta">{t('proxy.config.api_key')}</span>
                  </div>
                  <div className="relative">
                    <Input
                      value={proxyConfig.api_key || ''}
                      readOnly
                      type={showKey ? 'text' : 'password'}
                      className="panel-input h-12 pr-12 font-mono text-sm tracking-[0.12em]"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1/2 right-2 h-9 w-9 -translate-y-1/2 rounded-sm"
                      onClick={() => setShowKey(!showKey)}
                      title={showKey ? t('proxy.config.hide_key') : t('proxy.config.show_key')}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <PanelButton
                      className="h-9 px-3"
                      onClick={() => navigator.clipboard.writeText(proxyConfig.api_key || '')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {t('proxy.copy')}
                    </PanelButton>
                    <PanelButton className="h-9 px-3" onClick={() => setIsRegenerateDialogOpen(true)}>
                      <Router className="h-3.5 w-3.5" />
                      {t('proxy.regenerate')}
                    </PanelButton>
                  </div>
                </div>

                <div className="panel-card flex items-center justify-between px-4 py-4">
                  <div className="space-y-1">
                    <Label className="terminal-meta">{t('proxy.config.auto_start')}</Label>
                    <p className="text-muted-foreground text-xs">
                      {t('proxy.config.auto_start_desc')}
                    </p>
                  </div>
                  <ControlToggle
                    checked={proxyConfig.auto_start}
                    onCheckedChange={(checked) =>
                      updateProxyConfig({ ...proxyConfig, auto_start: checked })
                    }
                  />
                </div>
              </PanelCardContent>
            </PanelCard>

            <PanelCard>
              <PanelCardHeader>
                <div className="terminal-meta">Gateway Telemetry</div>
              </PanelCardHeader>
              <PanelCardContent className="space-y-4">
                <TerminalStat label="State" value={proxyConfig.enabled ? 'Online' : 'Offline'} tone={proxyConfig.enabled ? 'cyan' : 'warning'} />
                <div className="panel-card px-3 py-3">
                  <div className="terminal-meta">Availability</div>
                  <LedProgress value={proxyConfig.enabled ? 100 : 18} tone={getProxyTone(proxyConfig.enabled)} className="mt-3" />
                </div>
                <TerminalStat label="Access" value={selectedIp || 'localhost'} />
                <TerminalStat label="Protocol Mode" value={selectedProtocol.toUpperCase()} />
              </PanelCardContent>
            </PanelCard>
          </div>
        </PanelCardContent>
      </PanelCard>

      <PanelCard>
        <PanelCardHeader>
          <div className="terminal-meta">{t('proxy.mapping.title')}</div>
          <div className="mt-2 text-sm uppercase tracking-[0.16em]">
            {t('proxy.mapping.description')}
          </div>
        </PanelCardHeader>
        <PanelCardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="panel-card px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.75)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Claude Sonnet 4.6
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{t('proxy.mapping.maps_to')}</p>
              <Select
                value={resolveAnthropicMappingValue(
                  proxyConfig.anthropic_mapping,
                  ['claude-sonnet-4-6-20260219', 'claude-sonnet-4-5-20250929'],
                  'claude-sonnet-4-6-thinking',
                )}
                onValueChange={(value) =>
                  updateAnthropicMapping({
                    'claude-sonnet-4-6-20260219': value,
                    'claude-sonnet-4-5-20250929': value,
                  })
                }
              >
                <SelectTrigger className="panel-input mt-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANTHROPIC_ROUTE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="panel-card px-4 py-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_12px_rgba(255,136,0,0.5)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Claude Opus 4.6
                </span>
              </div>
              <p className="text-muted-foreground text-xs">{t('proxy.mapping.maps_to')}</p>
              <Select
                value={resolveAnthropicMappingValue(
                  proxyConfig.anthropic_mapping,
                  ['claude-opus-4-6-20260201', 'opus'],
                  'claude-opus-4-6-thinking',
                )}
                onValueChange={(value) =>
                  updateAnthropicMapping({
                    'claude-opus-4-6-20260201': value,
                    opus: value,
                  })
                }
              >
                <SelectTrigger className="panel-input mt-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANTHROPIC_ROUTE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <PanelButton
              className="h-9 px-3"
              onClick={() =>
                updateProxyConfig({
                  ...proxyConfig,
                  anthropic_mapping: { ...DEFAULT_ANTHROPIC_MAPPING },
                })
              }
            >
              {t('proxy.mapping.restore')}
            </PanelButton>
          </div>
        </PanelCardContent>
      </PanelCard>

      <PanelCard>
        <PanelCardHeader>
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-cyan-300" />
            <span className="terminal-meta">{t('proxy.examples.title')}</span>
          </div>
          <div className="mt-2 text-sm uppercase tracking-[0.16em]">
            {t('proxy.examples.description')}
          </div>
        </PanelCardHeader>
        <PanelCardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                'panel-card cursor-pointer px-4 py-4 text-left transition-all',
                selectedProtocol === 'openai' && 'panel-card-active',
              )}
              onClick={() => setSelectedProtocol('openai')}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.75)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {t('settings.examples.openai_protocol')}
                </span>
              </div>
              <div className="panel-input px-3 py-2 text-xs font-mono">POST /v1/chat/completions</div>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('settings.examples.openai_tools')}
              </p>
            </button>

            <button
              type="button"
              className={cn(
                'panel-card cursor-pointer px-4 py-4 text-left transition-all',
                selectedProtocol === 'anthropic' && 'panel-card-active',
              )}
              onClick={() => setSelectedProtocol('anthropic')}
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-secondary shadow-[0_0_12px_rgba(255,136,0,0.5)]" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  {t('settings.examples.anthropic_protocol')}
                </span>
              </div>
              <div className="panel-input px-3 py-2 text-xs font-mono">POST /v1/messages</div>
              <p className="text-muted-foreground mt-2 text-xs">
                {t('settings.examples.anthropic_tools')}
              </p>
            </button>
          </div>

          <div className="panel-section-header">Model Slots</div>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setActiveModelTab(model.id)}
                className={cn(
                  'panel-button h-9 px-3 text-[11px]',
                  activeModelTab === model.id && 'panel-card-active',
                )}
              >
                {model.icon}
                <span>{model.name}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="panel-card px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  <Terminal className="h-4 w-4" />
                  cURL
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getCurlExample(activeModelTab), 'curl')}
                  className="text-primary flex items-center gap-1 text-xs"
                >
                  {copied === 'curl' ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === 'curl' ? t('proxy.copied') : t('proxy.copy')}
                </button>
              </div>
              <pre className="panel-input overflow-x-auto px-3 py-3 font-mono text-xs whitespace-pre-wrap">
                {getCurlExample(activeModelTab)}
              </pre>
            </div>

            <div className="panel-card px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]">
                  <Code className="h-4 w-4" />
                  Python
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getPythonExample(activeModelTab), 'python')}
                  className="text-primary flex items-center gap-1 text-xs"
                >
                  {copied === 'python' ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === 'python' ? t('proxy.copied') : t('proxy.copy')}
                </button>
              </div>
              <pre className="panel-input overflow-x-auto px-3 py-3 font-mono text-xs whitespace-pre-wrap">
                {getPythonExample(activeModelTab)}
              </pre>
            </div>
          </div>
        </PanelCardContent>
      </PanelCard>

      <Dialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('proxy.regenerateConfirm.title')}</DialogTitle>
            <DialogDescription>{t('proxy.regenerateConfirm.description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <PanelButton
              className="h-9 px-3"
              onClick={() => setIsRegenerateDialogOpen(false)}
            >
              {t('proxy.regenerateConfirm.cancel')}
            </PanelButton>
            <PanelButton
              warning
              className="h-9 px-3"
              onClick={async () => {
                const { ipc: localIpc } = await import('@/ipc/manager');
                const result = await localIpc.client.gateway.generateKey();
                updateProxyConfig({ ...proxyConfig, api_key: result.api_key });
                setIsRegenerateDialogOpen(false);
              }}
            >
              {t('proxy.regenerateConfirm.confirm')}
            </PanelButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const Route = createFileRoute('/proxy')({
  component: ProxyPage,
});
