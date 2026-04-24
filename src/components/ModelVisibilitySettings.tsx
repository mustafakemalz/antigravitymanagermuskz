import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppConfig } from '@/hooks/useAppConfig';
import { useCloudAccounts } from '@/hooks/useCloudAccounts';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Loader2, Search, RotateCcw, Save } from 'lucide-react';
import { filter, flatMap, includes, size, sortBy, sumBy, uniq, values } from 'lodash-es';
import type { CloudAccount } from '@/types/cloudAccount';
import { ControlToggle } from '@/components/ui/ControlToggle';
import { PanelButton } from '@/components/ui/PanelButton';
import { PanelCard, PanelCardContent, PanelCardHeader } from '@/components/ui/PanelCard';
import { TerminalStat } from '@/components/ui/TerminalStat';

function collectAvailableModelIds(accounts: CloudAccount[] | undefined): string[] {
  if (!accounts) {
    return [];
  }

  const modelNames = flatMap(accounts, (account) => {
    if (!account.quota?.models) {
      return [];
    }

    return Object.keys(account.quota.models);
  });

  return sortBy(uniq(modelNames));
}

function filterModelIdsByQuery(modelIds: string[], query: string): string[] {
  const normalizedSearchQuery = query.toLowerCase();

  return filter(modelIds, (modelId) => includes(modelId.toLowerCase(), normalizedSearchQuery));
}

export function ModelVisibilitySettings() {
  const { t } = useTranslation();
  const { config, saveConfig } = useAppConfig();
  const { data: accounts, isLoading: accountsLoading } = useCloudAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [modelVisibilityMap, setModelVisibilityMap] = useState<Record<string, boolean>>({});
  const [providerGroupingEnabled, setProviderGroupingEnabled] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (config?.model_visibility) {
      setModelVisibilityMap(config.model_visibility);
    }
    if (config?.provider_groupings_enabled !== undefined) {
      setProviderGroupingEnabled(config.provider_groupings_enabled);
    }
  }, [config?.model_visibility, config?.provider_groupings_enabled]);

  const availableModelIds = useMemo(() => {
    return collectAvailableModelIds(accounts);
  }, [accounts]);

  const filteredModelIds = useMemo(() => {
    return filterModelIdsByQuery(availableModelIds, searchQuery);
  }, [availableModelIds, searchQuery]);

  const hiddenModelCount = useMemo(() => {
    return sumBy(values(modelVisibilityMap), (isVisible) => (isVisible === false ? 1 : 0));
  }, [modelVisibilityMap]);

  const isModelVisible = (modelId: string): boolean => {
    return modelVisibilityMap[modelId] !== false;
  };

  const resetVisibilityOverrides = () => {
    setModelVisibilityMap({});
  };

  const saveVisibilitySettings = async () => {
    if (!config) {
      return;
    }

    setIsSavingSettings(true);
    try {
      const nextConfig = {
        ...config,
        model_visibility: modelVisibilityMap,
        provider_groupings_enabled: providerGroupingEnabled,
      };
      await saveConfig(nextConfig);
    } catch (error) {
      console.error('Failed to save model visibility settings:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleProviderGroupingToggle = (checked: boolean) => {
    setProviderGroupingEnabled(checked);
  };

  const handleModelVisibilityChange = (modelId: string, checked: boolean) => {
    setModelVisibilityMap((prev) => ({
      ...prev,
      [modelId]: checked,
    }));
  };

  if (accountsLoading) {
    return (
      <PanelCard>
        <PanelCardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">{t('common.loading')}</span>
        </PanelCardContent>
      </PanelCard>
    );
  }

  return (
    <PanelCard>
      <PanelCardHeader>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="terminal-meta">{t('settings.modelVisibility.title')}</div>
            <div className="mt-2 text-sm uppercase tracking-[0.16em]">
              {t('settings.modelVisibility.description')}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <TerminalStat
              label={t('settings.modelVisibility.totalModels')}
              value={availableModelIds.length}
            />
            <TerminalStat
              label={t('settings.modelVisibility.visibleModels')}
              value={availableModelIds.length - hiddenModelCount}
              tone="cyan"
            />
            <TerminalStat
              label={t('settings.modelVisibility.hiddenModels')}
              value={hiddenModelCount}
              tone="warning"
            />
          </div>
        </div>
      </PanelCardHeader>

      <PanelCardContent className="space-y-4">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder={t('settings.modelVisibility.searchPlaceholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="panel-input pl-10"
          />
        </div>

        <div className="panel-card flex items-center justify-between px-4 py-4">
          <div className="space-y-0.5">
            <Label htmlFor="provider-groupings" className="terminal-meta">
              {t('settings.providerGroupings.enabled')}
            </Label>
            <p className="text-muted-foreground text-xs">
              {t('settings.providerGroupings.description')}
            </p>
          </div>
          <ControlToggle
            id="provider-groupings"
            checked={providerGroupingEnabled}
            onCheckedChange={handleProviderGroupingToggle}
          />
        </div>

        <div className="panel-card max-h-[32rem] space-y-2 overflow-y-auto p-3">
          {filteredModelIds.length === 0 ? (
            <div className="text-muted-foreground py-10 text-center">
              {searchQuery
                ? t('settings.modelVisibility.noModelsFound')
                : t('settings.modelVisibility.noModels')}
            </div>
          ) : (
            filteredModelIds.map((modelId) => {
              const isVisible = isModelVisible(modelId);
              return (
                <div
                  key={modelId}
                  className="panel-card flex items-center gap-3 px-3 py-3"
                >
                  <Checkbox
                    id={`model-${modelId}`}
                    checked={isVisible}
                    onCheckedChange={(checked) =>
                      handleModelVisibilityChange(modelId, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`model-${modelId}`}
                    className="flex-1 cursor-pointer text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    {modelId}
                  </label>
                  {!isVisible && (
                    <Badge variant="secondary" className="rounded-sm text-[10px] uppercase tracking-[0.12em]">
                      {t('settings.modelVisibility.hidden')}
                    </Badge>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <PanelButton
            className="h-9 px-3"
            onClick={resetVisibilityOverrides}
            disabled={size(modelVisibilityMap) === 0}
          >
            <RotateCcw className="h-4 w-4" />
            {t('settings.modelVisibility.reset')}
          </PanelButton>
          <PanelButton
            className="h-9 px-3"
            onClick={saveVisibilitySettings}
            disabled={isSavingSettings}
          >
            {isSavingSettings ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSavingSettings
              ? t('settings.modelVisibility.saving')
              : t('settings.modelVisibility.save')}
          </PanelButton>
        </div>
      </PanelCardContent>
    </PanelCard>
  );
}
