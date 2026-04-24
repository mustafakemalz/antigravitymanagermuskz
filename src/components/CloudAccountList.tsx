import {
  useCloudAccounts,
  useRefreshQuota,
  useDeleteCloudAccount,
  useAddGoogleAccount,
  useSwitchCloudAccount,
  useAutoSwitchEnabled,
  useSetAutoSwitchEnabled,
  useOAuthClients,
  useSetActiveOAuthClient,
  startAuthFlow,
} from '@/hooks/useCloudAccounts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filter, flatMap, isEmpty, isNumber, size, sumBy } from 'lodash-es';
import { Cloud, Loader2, Plus, RefreshCw, Trash2, X, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CloudAccountCard, CompactCloudAccountCard } from '@/components/CloudAccountCard';
import { IdentityProfileDialog } from '@/components/IdentityProfileDialog';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelButton } from '@/components/ui/PanelButton';
import { PanelCard, PanelCardContent, PanelCardHeader } from '@/components/ui/PanelCard';
import { PanelSectionHeader } from '@/components/ui/PanelSectionHeader';
import { ControlToggle } from '@/components/ui/ControlToggle';
import { LedProgress } from '@/components/ui/LedProgress';
import { TerminalStat } from '@/components/ui/TerminalStat';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppConfig } from '@/hooks/useAppConfig';
import { cn } from '@/lib/utils';
import { CloudAccount } from '@/types/cloudAccount';
import { getLocalizedErrorMessage } from '@/utils/errorMessages';
import { shouldAutoSubmitGoogleAuthCode } from '@/utils/googleAuthSubmission';
import {
  clampQuotaPercentage,
  formatAiCreditsAmount,
  getAccountSortValue,
  getQuotaStatus,
  roundQuotaPercentage,
  type QuotaStatus,
} from '@/utils/quota-display';

export type GridLayout = 'auto' | '2-col' | '3-col' | 'list' | 'compact';

const GRID_LAYOUT_CLASSES: Record<GridLayout, string> = {
  auto: 'grid gap-5 lg:grid-cols-2 2xl:grid-cols-3',
  '2-col': 'grid gap-5 grid-cols-2',
  '3-col': 'grid gap-5 grid-cols-3',
  list: 'grid gap-5 grid-cols-1',
  compact: 'flex flex-col gap-3',
};

export function CloudAccountList() {
  const { t } = useTranslation();
  const { data: accounts, isLoading, isError, error, errorUpdatedAt, refetch } = useCloudAccounts();
  const { config } = useAppConfig();
  const refreshMutation = useRefreshQuota();
  const deleteMutation = useDeleteCloudAccount();
  const addMutation = useAddGoogleAccount();
  const switchMutation = useSwitchCloudAccount();

  const { data: autoSwitchEnabled, isLoading: isSettingsLoading } = useAutoSwitchEnabled();
  const setAutoSwitchMutation = useSetAutoSwitchEnabled();
  const { data: oauthClients = [], isLoading: isOAuthClientsLoading } = useOAuthClients();
  const setActiveOAuthClientMutation = useSetActiveOAuthClient();

  const { toast } = useToast();
  const lastLoadErrorToastAtRef = useRef<number>(0);
  const lastSubmittedAuthCodeRef = useRef<string | null>(null);

  const gridLayout: GridLayout = (config?.grid_layout as GridLayout) || 'auto';

  type SortOption =
    | 'recently-used'
    | 'quota-overall'
    | 'quota-claude'
    | 'quota-pro3'
    | 'quota-flash';

  const currentSort: SortOption = (config?.account_sort as SortOption) || 'recently-used';

  const sortedAccounts = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return [];
    }

    const activeAccounts = accounts.filter((account) => account.is_active);
    const otherAccounts = accounts.filter((account) => !account.is_active);

    const sortedActive = [...activeAccounts].sort((a, b) => (b.last_used ?? 0) - (a.last_used ?? 0));
    const sortedOthers = [...otherAccounts].sort((a, b) => {
      if (currentSort === 'recently-used') {
        return (b.last_used ?? 0) - (a.last_used ?? 0);
      }

      return getAccountSortValue(b, currentSort) - getAccountSortValue(a, currentSort);
    });

    return [...sortedActive, ...sortedOthers];
  }, [accounts, currentSort]);

  const overallQuotaPercentage = useMemo(() => {
    if (!accounts || accounts.length === 0) {
      return null;
    }

    const visibilitySettings = config?.model_visibility ?? {};
    const visibleModelInfos = flatMap(accounts, (account) => {
      if (!account.quota?.models) {
        return [];
      }

      return Object.entries(account.quota.models)
        .filter(([modelName]) => visibilitySettings[modelName] !== false)
        .map(([, info]) => info);
    });

    if (isEmpty(visibleModelInfos)) {
      return null;
    }

    const averagePercentage =
      sumBy(visibleModelInfos, (modelInfo) => modelInfo.percentage) / visibleModelInfos.length;

    return roundQuotaPercentage(averagePercentage);
  }, [accounts, config?.model_visibility]);

  const overallQuotaStatus =
    overallQuotaPercentage === null ? null : getQuotaStatus(overallQuotaPercentage);
  const effectiveQuotaStatus: QuotaStatus = overallQuotaStatus ?? 'low';

  const overallQuotaTone =
    effectiveQuotaStatus === 'high'
      ? 'cyan'
      : effectiveQuotaStatus === 'medium'
        ? 'warning'
        : 'danger';

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [selectedOAuthClientKey, setSelectedOAuthClientKey] = useState('');
  const [identityAccount, setIdentityAccount] = useState<CloudAccount | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalAccounts = size(accounts);
  const activeAccounts = filter(accounts, (account) => account.is_active).length;
  const rateLimitedAccounts = filter(accounts, (account) => account.status === 'rate_limited').length;

  const submitAuthCode = useCallback(
    (incomingAuthCode?: string) => {
      const codeToUse = incomingAuthCode || authCode;

      if (!codeToUse) {
        return;
      }

      lastSubmittedAuthCodeRef.current = codeToUse;
      addMutation.mutate(
        {
          authCode: codeToUse,
          oauthClientKey:
            selectedOAuthClientKey || oauthClients.find((client) => client.is_active)?.key,
        },
        {
          onSuccess: () => {
            setIsAddDialogOpen(false);
            setAuthCode('');
            lastSubmittedAuthCodeRef.current = null;
            toast({ title: t('cloud.toast.addSuccess') });
          },
          onError: (err) => {
            toast({
              title: t('cloud.toast.addFailed.title'),
              description: getLocalizedErrorMessage(err, t),
              variant: 'destructive',
            });
          },
        },
      );
    },
    [addMutation, authCode, oauthClients, selectedOAuthClientKey, t, toast],
  );

  useEffect(() => {
    if (selectedOAuthClientKey !== '') {
      return;
    }

    const activeClientKey = oauthClients.find((client) => client.is_active)?.key;

    if (activeClientKey) {
      setSelectedOAuthClientKey(activeClientKey);
    }
  }, [oauthClients, selectedOAuthClientKey]);

  useEffect(() => {
    if (window.electron?.onGoogleAuthCode) {
      const cleanup = window.electron.onGoogleAuthCode((code) => {
        lastSubmittedAuthCodeRef.current = null;
        setAuthCode(code);
      });

      return cleanup;
    }
  }, []);

  useEffect(() => {
    if (
      shouldAutoSubmitGoogleAuthCode({
        authCode,
        isAddDialogOpen,
        isPending: addMutation.isPending,
        lastSubmittedAuthCode: lastSubmittedAuthCodeRef.current,
      })
    ) {
      submitAuthCode(authCode);
    }
  }, [addMutation.isPending, authCode, isAddDialogOpen, submitAuthCode]);

  useEffect(() => {
    if (!isError || !errorUpdatedAt || errorUpdatedAt === lastLoadErrorToastAtRef.current) {
      return;
    }

    toast({
      title: t('cloud.error.loadFailed'),
      description: getLocalizedErrorMessage(error, t),
      variant: 'destructive',
    });
    lastLoadErrorToastAtRef.current = errorUpdatedAt;
  }, [error, errorUpdatedAt, isError, t, toast]);

  const handleRefresh = (id: string) => {
    refreshMutation.mutate(
      { accountId: id },
      {
        onSuccess: (updatedAccount) => {
          const credits = updatedAccount.quota?.ai_credits?.credits;

          if (isNumber(credits)) {
            toast({
              title: t('cloud.toast.quotaRefreshed'),
              description: t('cloud.toast.refreshCreditsAvailable', {
                amount: formatAiCreditsAmount(credits),
              }),
            });
            return;
          }

          toast({
            title: t('cloud.toast.quotaRefreshed'),
            description: t('cloud.toast.refreshCreditsUnavailable'),
          });
        },
        onError: () => toast({ title: t('cloud.toast.refreshFailed'), variant: 'destructive' }),
      },
    );
  };

  const handleSwitch = (id: string) => {
    switchMutation.mutate(
      { accountId: id },
      {
        onSuccess: () =>
          toast({
            title: t('cloud.toast.switched.title'),
            description: t('cloud.toast.switched.description'),
          }),
        onError: (err) =>
          toast({
            title: t('cloud.toast.switchFailed'),
            description: getLocalizedErrorMessage(err, t),
            variant: 'destructive',
          }),
      },
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(t('cloud.toast.deleteConfirm'))) {
      deleteMutation.mutate(
        { accountId: id },
        {
          onSuccess: () => {
            toast({ title: t('cloud.toast.deleted') });
            setSelectedIds((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          },
          onError: () => toast({ title: t('cloud.toast.deleteFailed'), variant: 'destructive' }),
        },
      );
    }
  };

  const handleManageIdentity = (id: string) => {
    const target = (accounts || []).find((item) => item.id === id) || null;
    setIdentityAccount(target);
  };

  const handleToggleAutoSwitch = (checked: boolean) => {
    setAutoSwitchMutation.mutate(
      { enabled: checked },
      {
        onSuccess: () =>
          toast({
            title: checked ? t('cloud.toast.autoSwitchOn') : t('cloud.toast.autoSwitchOff'),
          }),
        onError: () =>
          toast({ title: t('cloud.toast.updateSettingsFailed'), variant: 'destructive' }),
      },
    );
  };

  const openGoogleAuthSignIn = async () => {
    try {
      lastSubmittedAuthCodeRef.current = null;
      const effectiveClientKey =
        selectedOAuthClientKey || oauthClients.find((client) => client.is_active)?.key;

      await startAuthFlow(
        effectiveClientKey
          ? {
              oauthClientKey: effectiveClientKey,
            }
          : undefined,
      );
    } catch (e) {
      toast({
        title: t('cloud.toast.startAuthFailed'),
        description: String(e),
        variant: 'destructive',
      });
    }
  };

  const setSelectionState = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);

      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }

      return next;
    });
  };

  const refreshSelectedAccounts = async () => {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(
      ids.map((id) => refreshMutation.mutateAsync({ accountId: id })),
    );

    const successful = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.filter((result) => result.status === 'rejected').length;

    if (failed === 0) {
      toast({
        title: t('cloud.toast.quotaRefreshed'),
        description: t('cloud.toast.batchRefreshSuccess', { count: successful }),
      });
    } else {
      toast({
        title: t('cloud.toast.batchRefreshPartial.title'),
        description: t('cloud.toast.batchRefreshPartial.description', {
          successful,
          failed,
        }),
        variant: 'destructive',
      });
    }

    setSelectedIds(new Set());
  };

  const deleteSelectedAccounts = async () => {
    if (confirm(t('cloud.batch.confirmDelete', { count: selectedIds.size }))) {
      const ids = Array.from(selectedIds);
      const results = await Promise.allSettled(
        ids.map((id) => deleteMutation.mutateAsync({ accountId: id })),
      );

      const successful = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.filter((result) => result.status === 'rejected').length;

      if (failed === 0) {
        toast({
          title: t('cloud.toast.deleted'),
          description: t('cloud.toast.batchDeleteSuccess', { count: successful }),
        });
      } else {
        toast({
          title: t('cloud.toast.batchDeletePartial.title'),
          description: t('cloud.toast.batchDeletePartial.description', {
            successful,
            failed,
          }),
          variant: 'destructive',
        });
      }

      setSelectedIds(new Set());
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="panel-card col-span-full p-8 text-center"
        data-testid="cloud-load-error-fallback"
      >
        <Cloud className="text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-40" />
        <div className="text-sm font-medium">{t('cloud.error.loadFailed')}</div>
        <div className="text-muted-foreground mt-2 text-xs">{t('action.retry')}</div>
        <PanelButton
          className="mt-4"
          onClick={() => void refetch()}
          data-testid="cloud-load-error-retry"
        >
          <RefreshCw className="h-4 w-4" />
          {t('action.retry')}
        </PanelButton>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24">
      <PanelCard active={!!autoSwitchEnabled}>
        <PanelCardHeader className="border-b border-white/10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-2xl">
              <div className="terminal-meta">COMMAND_ARRAY</div>
              <h2 className="mt-3 text-3xl font-semibold uppercase tracking-[0.22em]">
                {t('cloud.title')}
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-7">
                {t('cloud.description')}
              </p>
            </div>

            <div className="flex min-w-[320px] items-center justify-end gap-4">
              <div className={cn('panel-card px-5 py-4', autoSwitchEnabled && 'border-white/20')}>
                <div className="flex items-center gap-4">
                  <Zap className="h-4 w-4 text-white/70" />
                  <div>
                    <div className="terminal-meta">Auto-Switch</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.18em]">
                      {autoSwitchEnabled ? 'Autonomous Mode' : 'Manual Mode'}
                    </div>
                  </div>
                  <ControlToggle
                    checked={!!autoSwitchEnabled}
                    onCheckedChange={handleToggleAutoSwitch}
                    disabled={isSettingsLoading || setAutoSwitchMutation.isPending}
                  />
                </div>
              </div>

              <Dialog
                open={isAddDialogOpen}
                onOpenChange={(open) => {
                  setIsAddDialogOpen(open);
                  if (!open) {
                    setAuthCode('');
                    lastSubmittedAuthCodeRef.current = null;
                  }
                }}
              >
                <DialogTrigger asChild>
                  <PanelButton className="h-12 px-6">
                    <Plus className="h-4 w-4" />
                    {t('cloud.addAccount')}
                  </PanelButton>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t('cloud.authDialog.title')}</DialogTitle>
                    <DialogDescription>{t('cloud.authDialog.description')}</DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="oauth-client-select">
                        {t('cloud.authDialog.oauthClient')}
                      </Label>
                      <Select
                        value={selectedOAuthClientKey || undefined}
                        onValueChange={(value) => {
                          setSelectedOAuthClientKey(value);
                          setActiveOAuthClientMutation.mutate(
                            { clientKey: value },
                            {
                              onError: (authError) => {
                                toast({
                                  title: t('cloud.toast.updateSettingsFailed'),
                                  description: getLocalizedErrorMessage(authError, t),
                                  variant: 'destructive',
                                });
                              },
                            },
                          );
                        }}
                        disabled={isOAuthClientsLoading || setActiveOAuthClientMutation.isPending}
                      >
                        <SelectTrigger id="oauth-client-select" className="panel-input">
                          <SelectValue
                            placeholder={t('cloud.authDialog.oauthClientPlaceholder')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {oauthClients.map((client) => (
                            <SelectItem key={client.key} value={client.key}>
                              {client.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <PanelButton className="col-span-4" onClick={openGoogleAuthSignIn}>
                        <Cloud className="h-4 w-4" />
                        {t('cloud.authDialog.openLogin')}
                      </PanelButton>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code">{t('cloud.authDialog.authCode')}</Label>
                      <Input
                        id="code"
                        className="panel-input"
                        placeholder={t('cloud.authDialog.placeholder')}
                        value={authCode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setAuthCode(e.target.value);
                        }}
                      />
                      <p className="text-muted-foreground text-xs">
                        {t('cloud.authDialog.instruction')}
                      </p>
                    </div>
                  </div>

                  <DialogFooter>
                    <PanelButton
                      onClick={() => submitAuthCode()}
                      disabled={addMutation.isPending || !authCode}
                    >
                      {addMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                      {t('cloud.authDialog.verify')}
                    </PanelButton>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </PanelCardHeader>

        <PanelCardContent className="grid gap-5 md:grid-cols-4">
          <TerminalStat label={t('cloud.card.actions')} value={totalAccounts} />
          <TerminalStat label={t('cloud.card.active')} value={activeAccounts} tone="cyan" />
          <TerminalStat
            label={t('cloud.card.rateLimited')}
            value={rateLimitedAccounts}
            tone="warning"
          />
          <div className="panel-card px-5 py-5">
            <div className="terminal-meta">{t('cloud.globalQuota')}</div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <span className="text-xl font-semibold">{overallQuotaPercentage ?? '--'}%</span>
              {overallQuotaPercentage !== null && (
                <span className="text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  {effectiveQuotaStatus}
                </span>
              )}
            </div>
            {overallQuotaPercentage !== null && (
              <LedProgress
                className="mt-4"
                value={clampQuotaPercentage(overallQuotaPercentage)}
                tone={overallQuotaTone}
              />
            )}
          </div>
        </PanelCardContent>
      </PanelCard>

      <div>
        <PanelSectionHeader
          label="ACCOUNT_MODULES"
          value={autoSwitchEnabled ? 'Autonomous routing enabled' : 'Manual routing'}
          className="mb-4"
        />
        <div className={GRID_LAYOUT_CLASSES[gridLayout]}>
          {sortedAccounts.map((account) =>
            gridLayout === 'compact' ? (
              <CompactCloudAccountCard
                key={account.id}
                account={account}
                onRefresh={handleRefresh}
                onDelete={handleDelete}
                onSwitch={handleSwitch}
                onManageIdentity={handleManageIdentity}
                isRefreshing={
                  refreshMutation.isPending && refreshMutation.variables?.accountId === account.id
                }
                isDeleting={
                  deleteMutation.isPending && deleteMutation.variables?.accountId === account.id
                }
                isSwitching={
                  switchMutation.isPending && switchMutation.variables?.accountId === account.id
                }
              />
            ) : (
              <CloudAccountCard
                key={account.id}
                account={account}
                onRefresh={handleRefresh}
                onDelete={handleDelete}
                onSwitch={handleSwitch}
                onManageIdentity={handleManageIdentity}
                isSelected={selectedIds.has(account.id)}
                onToggleSelection={setSelectionState}
                isRefreshing={
                  refreshMutation.isPending && refreshMutation.variables?.accountId === account.id
                }
                isDeleting={
                  deleteMutation.isPending && deleteMutation.variables?.accountId === account.id
                }
                isSwitching={
                  switchMutation.isPending && switchMutation.variables?.accountId === account.id
                }
              />
            ),
          )}

          {sortedAccounts.length === 0 && (
            <div className="panel-card col-span-full py-14 text-center">
              <Cloud className="text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-40" />
              <div className="text-sm">{t('cloud.list.noAccounts')}</div>
            </div>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="panel-card fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 px-6 py-4">
          <div className="flex items-center gap-3 border-r border-white/10 pr-5">
            <span className="terminal-meta !text-foreground !text-xs">
              {t('cloud.batch.selected', { count: selectedIds.size })}
            </span>
            <PanelButton className="h-7 w-7 px-0" onClick={() => setSelectedIds(new Set())}>
              <X className="h-4 w-4" />
            </PanelButton>
          </div>

          <div className="flex items-center gap-2">
            <PanelButton className="h-8 px-3" onClick={refreshSelectedAccounts}>
              <RefreshCw className="h-3 w-3" />
              {t('cloud.batch.refresh')}
            </PanelButton>
            <PanelButton warning className="h-8 px-3" onClick={deleteSelectedAccounts}>
              <Trash2 className="h-3 w-3" />
              {t('cloud.batch.delete')}
            </PanelButton>
          </div>
        </div>
      )}

      <IdentityProfileDialog
        account={identityAccount}
        open={Boolean(identityAccount)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIdentityAccount(null);
          }
        }}
      />
    </div>
  );
}
