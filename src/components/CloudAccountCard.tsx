import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { LedProgress } from '@/components/ui/LedProgress';
import { PanelButton } from '@/components/ui/PanelButton';
import {
  PanelCard,
  PanelCardContent,
  PanelCardFooter,
  PanelCardHeader,
} from '@/components/ui/PanelCard';
import { PanelSectionHeader } from '@/components/ui/PanelSectionHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Box,
  Eye,
  EyeOff,
  Fingerprint,
  MoreVertical,
  Power,
  RefreshCw,
  Trash,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ProviderGroup } from '@/components/ProviderGroup';
import { getValidationBlockedStatusLabel } from '@/components/accountValidationStatus';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useSetAccountProxy } from '@/hooks/useCloudAccounts';
import { useProviderGrouping } from '@/hooks/useProviderGrouping';
import { cn } from '@/lib/utils';
import { CloudAccount, CloudQuotaModelInfo } from '@/types/cloudAccount';
import {
  clampQuotaPercentage,
  formatAiCreditsAmount,
  formatResetTimeLabel,
  formatResetTimeTitle,
  getQuotaStatus,
  type QuotaStatus,
} from '@/utils/quota-display';
import { isValidProxyUrl } from '@/utils/url';

type ModelQuotaEntry = [string, CloudQuotaModelInfo];

const GEMINI_LEGACY_MODEL_PATTERN = /gemini-[12](\.|$|-)/i;
const GEMINI_PRO_COMBINED_MODEL_ID = 'gemini-3.1-pro-low/high';

const MODEL_DISPLAY_REPLACEMENTS: Array<[string, string]> = [
  [GEMINI_PRO_COMBINED_MODEL_ID, 'Gemini 3.1 Pro (Low/High)'],
  ['gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview'],
  ['gemini-3-pro-image', 'Gemini 3 Pro Image'],
  ['gemini-3.1-pro', 'Gemini 3.1 Pro'],
  ['gemini-3-pro', 'Gemini 3 Pro'],
  ['gemini-3-flash', 'Gemini 3 Flash'],
  ['claude-sonnet-4-6-thinking', 'Claude 4.6 Sonnet (Thinking)'],
  ['claude-sonnet-4-6', 'Claude 4.6 Sonnet'],
  ['claude-sonnet-4-5-thinking', 'Claude 4.5 Sonnet (Thinking)'],
  ['claude-sonnet-4-5', 'Claude 4.5 Sonnet'],
  ['claude-opus-4-6-thinking', 'Claude 4.6 Opus (Thinking)'],
  ['claude-opus-4-5-thinking', 'Claude 4.5 Opus (Thinking)'],
  ['claude-3-5-sonnet', 'Claude 3.5 Sonnet'],
];

const QUOTA_TEXT_COLOR_CLASS_BY_STATUS: Record<QuotaStatus, string> = {
  high: 'text-white',
  medium: 'text-white/80',
  low: 'text-white/55',
};

function isGeminiProLowModel(modelName: string): boolean {
  const normalizedModelName = modelName.toLowerCase();
  return normalizedModelName.includes('gemini-3.1-pro-low');
}

function isGeminiProHighModel(modelName: string): boolean {
  const normalizedModelName = modelName.toLowerCase();
  return normalizedModelName.includes('gemini-3.1-pro-high');
}

function formatCreditsExpiry(expiryDate: string): string {
  if (!expiryDate) {
    return '';
  }

  try {
    const date = new Date(expiryDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return expiryDate;
  }
}

function isGeminiProFamilyModel(modelName: string): boolean {
  const normalizedModelName = modelName.toLowerCase();
  return normalizedModelName.includes('gemini-3.1-pro');
}

function mergeGeminiProQuotaEntries(
  entries: ModelQuotaEntry[],
): Record<string, CloudQuotaModelInfo> {
  const mergedModels: Record<string, CloudQuotaModelInfo> = {};
  const hasProLowModel = entries.some(([modelName]) => isGeminiProLowModel(modelName));
  const hasProHighModel = entries.some(([modelName]) => isGeminiProHighModel(modelName));
  const proLowModelInfo = entries.find(([modelName]) => isGeminiProLowModel(modelName))?.[1];

  for (const [modelName, modelInfo] of entries) {
    if (isGeminiProLowModel(modelName) && hasProHighModel) {
      continue;
    }

    if (isGeminiProHighModel(modelName) && hasProLowModel) {
      const mergedPercentage = proLowModelInfo
        ? Math.min(modelInfo.percentage, proLowModelInfo.percentage)
        : modelInfo.percentage;

      mergedModels[GEMINI_PRO_COMBINED_MODEL_ID] = {
        ...modelInfo,
        ...proLowModelInfo,
        percentage: mergedPercentage,
        display_name: 'Gemini 3.1 Pro',
        resetTime:
          modelInfo.resetTime && proLowModelInfo?.resetTime
            ? modelInfo.resetTime < proLowModelInfo.resetTime
              ? modelInfo.resetTime
              : proLowModelInfo.resetTime
            : modelInfo.resetTime || proLowModelInfo?.resetTime || '',
      };
      continue;
    }

    mergedModels[modelName] = modelInfo;
  }

  return mergedModels;
}

function formatModelDisplayName(modelName: string): string {
  let displayName = modelName.replace('models/', '');
  for (const [source, target] of MODEL_DISPLAY_REPLACEMENTS) {
    displayName = displayName.replace(source, target);
  }

  return displayName
    .replace(/-/g, ' ')
    .split(' ')
    .map((word) => (word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

interface CloudAccountCardProps {
  account: CloudAccount;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onManageIdentity: (id: string) => void;
  isSelected?: boolean;
  onToggleSelection?: (id: string, selected: boolean) => void;
  isRefreshing?: boolean;
  isDeleting?: boolean;
  isSwitching?: boolean;
}

function getLedTone(percentage: number): 'cyan' | 'warning' | 'danger' {
  const quotaStatus = getQuotaStatus(percentage);

  if (quotaStatus === 'high') {
    return 'cyan';
  }

  if (quotaStatus === 'medium') {
    return 'warning';
  }

  return 'danger';
}

export function CloudAccountCard({
  account,
  onRefresh,
  onDelete,
  onSwitch,
  onManageIdentity,
  isSelected = false,
  onToggleSelection,
  isRefreshing,
  isDeleting,
  isSwitching,
}: CloudAccountCardProps) {
  const { t } = useTranslation();
  const { config, saveConfig } = useAppConfig();
  const {
    enabled: providerGroupingsEnabled,
    getAccountStats,
    isProviderCollapsed,
    toggleProviderCollapse,
  } = useProviderGrouping();
  const setAccountProxy = useSetAccountProxy();

  const [proxyUrl, setProxyUrl] = useState(account.proxy_url || '');
  const [proxySaved, setProxySaved] = useState(false);

  const getQuotaTextColorClass = (percentage: number) => {
    const quotaStatus = getQuotaStatus(percentage);
    return QUOTA_TEXT_COLOR_CLASS_BY_STATUS[quotaStatus];
  };

  const formatQuotaLabel = (percentage: number) => {
    if (percentage === 0) {
      return t('cloud.card.rateLimitedQuota');
    }

    return `${percentage}%`;
  };

  const formatResetTimeLabelText = (resetTime?: string) => {
    return formatResetTimeLabel(resetTime, {
      prefix: t('cloud.card.resetPrefix'),
      unknown: t('cloud.card.resetUnknown'),
    });
  };

  const formatResetTimeTitleText = (resetTime?: string) => {
    return formatResetTimeTitle(resetTime, t('cloud.card.resetTime'));
  };

  const allModelEntries = Object.entries(account.quota?.models || {}) as ModelQuotaEntry[];

  const visibleModelEntries = Object.entries(account.quota?.models || {}).filter(
    ([modelName]) => config?.model_visibility?.[modelName] !== false,
  ) as ModelQuotaEntry[];

  const mergedModelQuotas = mergeGeminiProQuotaEntries(visibleModelEntries);

  const geminiModels = Object.entries(mergedModelQuotas)
    .filter(([name]) => name.includes('gemini') && !GEMINI_LEGACY_MODEL_PATTERN.test(name))
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const claudeModels = Object.entries(mergedModelQuotas)
    .filter(([name]) => name.includes('claude'))
    .sort((a, b) => b[1].percentage - a[1].percentage);

  const hasHighTier = geminiModels.some(
    ([name, info]) => isGeminiProFamilyModel(name) && info.percentage > 50,
  );
  const hasVisibleQuotaModels = geminiModels.length > 0 || claudeModels.length > 0;

  const renderQuotaModelGroup = (title: string, models: ModelQuotaEntry[]) => {
    if (models.length === 0) {
      return null;
    }

    return (
      <div key={title} className="space-y-2">
        <PanelSectionHeader label={title} />
        <div className="space-y-3">
          {models.map(([modelName, info]) => {
            const isHot = info.percentage > 0;

            return (
              <div
                key={modelName}
                className={cn(
                  'panel-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-5',
                  isHot ? 'border-white/15' : 'opacity-80',
                )}
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-none',
                    isHot ? 'bg-white' : 'bg-white/20',
                  )}
                />
                <div className="min-w-0">
                  <div
                    className="truncate text-xs font-semibold uppercase tracking-[0.12em]"
                    title={modelName}
                  >
                    {formatModelDisplayName(modelName)}
                  </div>
                  <div
                    className="text-muted-foreground mt-1 text-[10px] uppercase tracking-[0.14em]"
                    title={formatResetTimeTitleText(info.resetTime)}
                  >
                    [{formatResetTimeLabelText(info.resetTime)}]
                  </div>
                  <LedProgress className="mt-4" value={clampQuotaPercentage(info.percentage)} tone={getLedTone(info.percentage)} />
                </div>
                <div className="text-right">
                  <div
                    className={cn('text-sm font-semibold', getQuotaTextColorClass(info.percentage))}
                  >
                    {formatQuotaLabel(info.percentage)}
                  </div>
                  <div className="terminal-meta !text-[10px] !tracking-[0.16em]">USE</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const emptyQuotaState = (
    <div className="text-muted-foreground flex flex-col items-center justify-center py-6">
      <Box className="mb-2 h-8 w-8 opacity-20" />
      <span className="text-xs">{t('cloud.card.noQuota')}</span>
    </div>
  );

  const providerStats = providerGroupingsEnabled ? getAccountStats(account) : null;
  const providerGroupedQuotaSection =
    providerStats && providerStats.visibleModels > 0 ? (
      <>
        <div className="panel-card flex items-center justify-between px-5 py-4 text-xs">
          <span className="font-medium">{t('settings.providerGroupings.overall')}</span>
          <div className="flex items-center gap-4">
            <span
              className={cn(
                'font-mono font-bold',
                getQuotaTextColorClass(providerStats.overallPercentage),
              )}
            >
              {formatQuotaLabel(providerStats.overallPercentage)}
            </span>
            <div className="w-24">
              <LedProgress
                value={clampQuotaPercentage(providerStats.overallPercentage)}
                tone={getLedTone(providerStats.overallPercentage)}
              />
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {providerStats.providers.map((group) => (
            <ProviderGroup
              key={group.providerKey}
              stats={group}
              isCollapsed={isProviderCollapsed(account.id, group.providerKey)}
              onToggleCollapse={() => toggleProviderCollapse(account.id, group.providerKey)}
              getQuotaTextColorClass={getQuotaTextColorClass}
              formatQuotaLabel={formatQuotaLabel}
              formatResetTimeLabel={formatResetTimeLabelText}
              formatResetTimeTitle={formatResetTimeTitleText}
              leftLabel={t('cloud.card.left')}
            />
          ))}
        </div>
      </>
    ) : (
      emptyQuotaState
    );

  const aiCredits = account.quota?.ai_credits;
  const shouldShowAiCredits =
    !!aiCredits && Number.isFinite(aiCredits.credits) && aiCredits.credits >= 0;

  const validationBlockedStatusLabel = getValidationBlockedStatusLabel(
    account.status,
    account.status_reason,
    t,
  );

  return (
    <PanelCard
      active={account.is_active}
      className={cn(
        'group flex h-full flex-col overflow-hidden',
        isSelected && 'ring-1 ring-white/20',
        account.is_active && 'border-white/20 bg-[#121212]',
      )}
    >
      <PanelCardHeader className="relative border-b border-white/10 pb-4">
        {onToggleSelection && (
          <div
            className={cn(
              'absolute top-4 left-4 z-10 border border-white/10 bg-black/60 p-2 transition-opacity',
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
            )}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onToggleSelection(account.id, checked as boolean)}
              className="h-4 w-4"
            />
          </div>
        )}

        <div className="flex items-start gap-4">
          <div className="relative mt-0.5 shrink-0">
            {account.avatar_url ? (
              <img
                src={account.avatar_url}
                alt={account.name || ''}
                className="h-12 w-12 border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center border border-white/10 bg-[#121212] text-white">
                {account.name?.[0]?.toUpperCase() || 'A'}
              </div>
            )}
            <div
              className={cn(
                'absolute -right-1 -bottom-1 h-2.5 w-2.5 border border-black',
                account.is_active ? 'bg-white' : 'bg-white/20',
              )}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="terminal-meta">ACCOUNT_UNIT</div>
            <div className="truncate text-base font-semibold uppercase tracking-[0.16em]">
              {account.name || t('cloud.card.unknown')}
            </div>
            <div className="text-muted-foreground mt-1 truncate text-xs">{account.email}</div>

            {shouldShowAiCredits && aiCredits && (
              <div className="mt-3 text-[10px] uppercase tracking-[0.16em] text-white/70">
                {t('cloud.card.aiCreditsValue', {
                  amount: formatAiCreditsAmount(aiCredits.credits),
                })}
                {aiCredits.expiryDate && (
                  <span className="text-muted-foreground ml-2">
                    [{formatCreditsExpiry(aiCredits.expiryDate)}]
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {allModelEntries.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="panel-button h-9 w-9 px-0">
                    {(() => {
                      const hiddenCount = allModelEntries.filter(
                        ([modelName]) => config?.model_visibility?.[modelName] === false,
                      ).length;

                      return hiddenCount > 0 ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      );
                    })()}
                    <span className="sr-only">{t('cloud.card.modelVisibility')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-64" align="end">
                  <DropdownMenuLabel>{t('cloud.card.modelVisibility')}</DropdownMenuLabel>
                  <div className="max-h-64 overflow-auto px-2 py-1">
                    {allModelEntries.map(([modelName]) => {
                      const isVisible = config?.model_visibility?.[modelName] !== false;

                      return (
                        <DropdownMenuItem
                          key={modelName}
                          onSelect={(e) => e.preventDefault()}
                          className="flex cursor-pointer items-center gap-2"
                        >
                          <Checkbox
                            checked={isVisible}
                            onCheckedChange={(checked) => {
                              if (config) {
                                const newVisibility = { ...config.model_visibility };
                                newVisibility[modelName] = checked as boolean;
                                saveConfig({ ...config, model_visibility: newVisibility });
                              }
                            }}
                          />
                          <span className="truncate text-xs" title={modelName}>
                            {formatModelDisplayName(modelName)}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="panel-button h-9 w-9 px-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('cloud.card.actions')}</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onSwitch(account.id)} disabled={isSwitching}>
                  <Power className="mr-2 h-4 w-4" />
                  {t('cloud.card.useAccount')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onRefresh(account.id)} disabled={isRefreshing}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t('cloud.card.refresh')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onManageIdentity(account.id)}>
                  <Fingerprint className="mr-2 h-4 w-4" />
                  {t('cloud.card.identityProfile')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(account.id)}
                  className="text-destructive focus:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash className="mr-2 h-4 w-4" />
                  {t('cloud.card.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </PanelCardHeader>

      <PanelCardContent className="flex-1 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge
              variant={
                account.status === 'rate_limited' || account.status === 'expired'
                  ? 'destructive'
                  : 'outline'
              }
              className="rounded-none border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-[0.16em]"
            >
              {account.provider.toUpperCase()}
            </Badge>

            {account.is_active && (
              <span className="inline-flex items-center gap-2 border border-white/12 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/80">
                <span className="h-1.5 w-1.5 bg-white" />
                ACTIVE
              </span>
            )}

            {validationBlockedStatusLabel && (
              <span className="text-destructive text-[10px] uppercase tracking-[0.14em]">
                {validationBlockedStatusLabel}
              </span>
            )}
          </div>

          {account.is_active ? (
            <PanelButton className="h-8 px-3 text-white" disabled>
              <Power className="h-3.5 w-3.5" />
              {t('cloud.card.active')}
            </PanelButton>
          ) : (
            <PanelButton
              className="h-8 px-3"
              onClick={() => onSwitch(account.id)}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
              {t('cloud.card.use')}
            </PanelButton>
          )}
        </div>

        {hasHighTier && (
          <div className="panel-card px-5 py-4 text-[10px] uppercase tracking-[0.18em] text-white/70">
            HIGH-TIER CHANNEL ONLINE
          </div>
        )}

        <div className="space-y-5">
          {providerGroupingsEnabled ? (
            providerGroupedQuotaSection
          ) : hasVisibleQuotaModels ? (
            <div className="space-y-4">
              {renderQuotaModelGroup(t('cloud.card.groupGoogleGemini'), geminiModels)}
              {renderQuotaModelGroup(t('cloud.card.groupAnthropicClaude'), claudeModels)}
            </div>
          ) : (
            emptyQuotaState
          )}
        </div>
      </PanelCardContent>

      <PanelCardFooter className="border-t border-white/10 bg-black/20 px-6 py-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-4">
          <span className="terminal-meta">
            LAST_SYNC {formatDistanceToNow(account.last_used * 1000, { addSuffix: true })}
          </span>

          <div className="flex items-center gap-3">
            <Input
              value={proxyUrl}
              onChange={(e) => {
                setProxyUrl(e.target.value);
                setProxySaved(false);
              }}
              onBlur={() => {
                const trimmed = proxyUrl.trim();

                if (trimmed && !isValidProxyUrl(trimmed)) {
                  setProxyUrl(account.proxy_url || '');
                  return;
                }

                if (trimmed !== (account.proxy_url || '')) {
                  setAccountProxy.mutate({
                    accountId: account.id,
                    proxyUrl: trimmed || null,
                  });
                  setProxySaved(true);
                  setTimeout(() => setProxySaved(false), 2000);
                }
              }}
              placeholder={t('cloud.card.proxyPlaceholder')}
              className="panel-input h-10 w-48 text-xs"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
            />
            {proxySaved && (
              <span className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                {t('cloud.card.proxySaved')}
              </span>
            )}
          </div>
        </div>
      </PanelCardFooter>
    </PanelCard>
  );
}

interface CompactCloudAccountCardProps {
  account: CloudAccount;
  onRefresh: (id: string) => void;
  onDelete: (id: string) => void;
  onSwitch: (id: string) => void;
  onManageIdentity: (id: string) => void;
  isRefreshing?: boolean;
  isDeleting?: boolean;
  isSwitching?: boolean;
}

export function CompactCloudAccountCard({
  account,
  onRefresh,
  onDelete,
  onSwitch,
  onManageIdentity,
  isRefreshing,
  isDeleting,
  isSwitching,
}: CompactCloudAccountCardProps) {
  const { t } = useTranslation();
  const { config, saveConfig } = useAppConfig();

  const visibleModelEntries = Object.entries(account.quota?.models || {}).filter(
    ([modelName]) => config?.model_visibility?.[modelName] !== false,
  ) as ModelQuotaEntry[];

  const allModelEntries = Object.entries(account.quota?.models || {}) as ModelQuotaEntry[];
  const mergedModelQuotas = mergeGeminiProQuotaEntries(visibleModelEntries);

  const compactModels = Object.entries(mergedModelQuotas)
    .sort((a, b) => b[1].percentage - a[1].percentage)
    .slice(0, 6);

  const aiCredits = account.quota?.ai_credits;
  const shouldShowAiCredits =
    !!aiCredits && Number.isFinite(aiCredits.credits) && aiCredits.credits >= 0;

  const validationBlockedStatusLabel = getValidationBlockedStatusLabel(
    account.status,
    account.status_reason,
    t,
  );

  return (
    <PanelCard
      active={account.is_active}
      className={cn(
        'group relative overflow-hidden px-5 py-4',
        account.is_active && 'border-white/20 bg-[#121212]',
      )}
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          {account.avatar_url ? (
            <img
              src={account.avatar_url}
              alt={account.name || ''}
              className="h-9 w-9 border border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-[#121212] text-xs font-semibold text-white">
              {account.name?.[0]?.toUpperCase() || 'A'}
            </div>
          )}

          <div
            className={cn(
              'absolute -right-1 -bottom-1 h-2 w-2 border border-black',
              account.is_active ? 'bg-white' : 'bg-white/20',
            )}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="truncate text-xs font-semibold uppercase tracking-[0.14em]">
              {account.name || t('cloud.card.unknown')}
            </span>
            <Badge
              variant={
                account.status === 'rate_limited' || account.status === 'expired'
                  ? 'destructive'
                  : 'outline'
              }
              className="rounded-none border-white/10 bg-white/[0.03] text-[9px] uppercase tracking-[0.14em]"
            >
              {account.provider.toUpperCase()}
            </Badge>
            {account.is_active && (
              <span className="inline-flex items-center gap-1 border border-white/12 bg-white/[0.03] px-2 py-1 text-[9px] uppercase tracking-[0.14em] text-white/80">
                <span className="h-1.5 w-1.5 bg-white" />
                ACTIVE
              </span>
            )}
          </div>

          <div className="text-muted-foreground mt-2 flex items-center gap-3 text-[10px]">
            <span className="truncate">{account.email}</span>
            {validationBlockedStatusLabel && (
              <span className="text-destructive shrink-0 uppercase tracking-[0.12em]">
                {validationBlockedStatusLabel}
              </span>
            )}
            {shouldShowAiCredits && aiCredits && (
              <span className="shrink-0 text-white/70 uppercase tracking-[0.14em]">
                {formatAiCreditsAmount(aiCredits.credits)}
              </span>
            )}
          </div>

          {compactModels.length > 0 && (
            <div className="mt-4 flex items-center gap-2">
              {compactModels.map(([modelName, info]) => (
                <TooltipProvider key={modelName}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-14">
                        <LedProgress
                          value={clampQuotaPercentage(info.percentage)}
                          tone={getLedTone(info.percentage)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {formatModelDisplayName(modelName)}: {info.percentage}%
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {allModelEntries.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="panel-button h-8 w-8 px-0">
                  {(() => {
                    const hiddenCount = allModelEntries.filter(
                      ([modelName]) => config?.model_visibility?.[modelName] === false,
                    ).length;

                    return hiddenCount > 0 ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    );
                  })()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                <DropdownMenuLabel>{t('cloud.card.modelVisibility')}</DropdownMenuLabel>
                <div className="max-h-64 overflow-auto px-2 py-1">
                  {allModelEntries.map(([modelName]) => {
                    const isVisible = config?.model_visibility?.[modelName] !== false;

                    return (
                      <DropdownMenuItem
                        key={modelName}
                        onSelect={(e) => e.preventDefault()}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={isVisible}
                          onCheckedChange={(checked) => {
                            if (config) {
                              const newVisibility = { ...config.model_visibility };
                              newVisibility[modelName] = checked as boolean;
                              saveConfig({ ...config, model_visibility: newVisibility });
                            }
                          }}
                        />
                        <span className="truncate text-xs" title={modelName}>
                          {formatModelDisplayName(modelName)}
                        </span>
                      </DropdownMenuItem>
                    );
                  })}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {account.is_active ? (
            <PanelButton className="h-8 px-2.5 text-white" disabled>
              <Power className="h-3.5 w-3.5" />
            </PanelButton>
          ) : (
            <PanelButton
              className="h-8 px-2.5"
              onClick={() => onSwitch(account.id)}
              disabled={isSwitching}
            >
              {isSwitching ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Power className="h-3.5 w-3.5" />
              )}
            </PanelButton>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="panel-button h-8 w-8 px-0">
                <MoreVertical className="h-3.5 w-3.5" />
                <span className="sr-only">Menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{t('cloud.card.actions')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onSwitch(account.id)} disabled={isSwitching}>
                <Power className="mr-2 h-4 w-4" />
                {t('cloud.card.useAccount')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRefresh(account.id)} disabled={isRefreshing}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('cloud.card.refresh')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onManageIdentity(account.id)}>
                <Fingerprint className="mr-2 h-4 w-4" />
                {t('cloud.card.identityProfile')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
              >
                <Trash className="mr-2 h-4 w-4" />
                {t('cloud.card.delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </PanelCard>
  );
}
