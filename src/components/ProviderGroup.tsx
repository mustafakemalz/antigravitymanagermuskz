import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { LedProgress } from '@/components/ui/LedProgress';
import { cn } from '@/lib/utils';
import { clampQuotaPercentage } from '@/utils/quota-display';
import type { ProviderStats } from '@/utils/provider-grouping';

interface ProviderGroupProps {
  stats: ProviderStats;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  getQuotaTextColorClass: (percentage: number) => string;
  formatQuotaLabel: (percentage: number) => string;
  formatResetTimeLabel: (resetTime?: string) => string;
  formatResetTimeTitle: (resetTime?: string) => string | undefined;
  leftLabel: string;
}

function getLedTone(percentage: number): 'cyan' | 'warning' | 'danger' {
  if (percentage > 60) {
    return 'cyan';
  }

  if (percentage > 20) {
    return 'warning';
  }

  return 'danger';
}

export const ProviderGroup: React.FC<ProviderGroupProps> = ({
  stats,
  isCollapsed,
  onToggleCollapse,
  getQuotaTextColorClass,
  formatQuotaLabel,
  formatResetTimeLabel,
  formatResetTimeTitle,
  leftLabel,
}) => {
  const { t } = useTranslation();
  const { providerKey, providerInfo, visibleModels, avgPercentage, earliestReset } = stats;

  if (visibleModels.length === 0) {
    return null;
  }

  return (
    <div className="panel-card overflow-hidden">
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hover:bg-muted/30 flex w-full items-center gap-3 border-b border-cyan-400/10 px-3 py-3 text-left transition-colors"
      >
        {isCollapsed ? (
          <ChevronRight className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
        )}

        <span
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_10px_rgba(0,255,255,0.28)]"
          style={{ backgroundColor: providerInfo.color }}
        />

        <div className="min-w-0">
          <div className="terminal-meta !text-[10px]">{providerKey}</div>
          <div className="truncate text-xs font-semibold uppercase tracking-[0.14em]">
            {providerInfo.name}
          </div>
        </div>

        <span className="text-muted-foreground text-[10px] uppercase tracking-[0.12em]">
          {t('settings.providerGroupings.models', { count: visibleModels.length })}
        </span>

        <div className="flex-1" />

        <div className="flex min-w-[180px] items-center gap-3">
          {earliestReset && (
            <span
              className="text-muted-foreground text-[10px] uppercase tracking-[0.12em]"
              title={formatResetTimeTitle(earliestReset)}
            >
              {formatResetTimeLabel(earliestReset)}
            </span>
          )}

          <div className="flex items-baseline gap-1">
            <span className={cn('text-xs font-bold', getQuotaTextColorClass(avgPercentage))}>
              {formatQuotaLabel(avgPercentage)}
            </span>
            {Number.isFinite(avgPercentage) && avgPercentage > 0 && (
              <span className="text-muted-foreground text-[10px] uppercase tracking-[0.12em]">
                {t('settings.providerGroupings.avgLabel')}
              </span>
            )}
          </div>

          <div className="w-24">
            <LedProgress
              value={clampQuotaPercentage(avgPercentage)}
              tone={getLedTone(avgPercentage)}
            />
          </div>
        </div>
      </button>

      {!isCollapsed && (
        <div className="space-y-2 px-3 py-3">
          {visibleModels.map((model, index) => (
            <div
              key={model.id}
              className={cn(
                'panel-card grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5',
                index < visibleModels.length - 1 && 'border-cyan-400/10',
              )}
            >
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  model.percentage > 0
                    ? 'bg-primary shadow-[0_0_10px_rgba(0,255,255,0.75)]'
                    : 'bg-border',
                )}
              />

              <div className="min-w-0">
                <div
                  className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]"
                  title={model.id}
                >
                  {model.id.replace('models/', '')}
                </div>
                <div
                  className="text-muted-foreground mt-1 text-[10px] uppercase tracking-[0.12em]"
                  title={formatResetTimeTitle(model.resetTime)}
                >
                  [{formatResetTimeLabel(model.resetTime)}]
                </div>
                <div className="mt-2">
                  <LedProgress
                    value={clampQuotaPercentage(model.percentage)}
                    tone={getLedTone(model.percentage)}
                  />
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span className={cn('text-xs font-bold', getQuotaTextColorClass(model.percentage))}>
                  {formatQuotaLabel(model.percentage)}
                </span>
                {model.percentage > 0 && (
                  <span className="text-muted-foreground text-[10px] uppercase tracking-[0.12em]">
                    {leftLabel}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
