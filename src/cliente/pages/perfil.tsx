import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bell, Check, ChevronRight, LogOut, Store, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/confirm-dialog';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../lib/errors';
import { maskCPF } from '../../lib/masks';
import { Screen } from '../components/screen';
import { InstallPrompt } from '../components/install-prompt';
import { useClienteAuth } from '../context/cliente-auth';
import { selecionarEmpresa, useEmpresaAtual } from '../hooks/use-empresa';
import { portalApi } from '../services/portal';
import { setPendingResgate } from '../lib/pending-resgate';
import {
  ativarPushNotifications,
  desativarPushNotifications,
  isPushSubscribed,
  isPushSupported,
} from '../lib/push';
import type { EmpresaVinculo } from '../../types/api';

const num = new Intl.NumberFormat('pt-BR');

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[13px] text-fg-subtle">{label}</span>
      <span className="min-w-0 truncate text-[14px] font-semibold text-fg">{value}</span>
    </div>
  );
}

function NotificacoesToggle() {
  const toast = useToast();
  const supported = isPushSupported();
  const [permission, setPermission] = useState<NotificationPermission | null>(() =>
    supported ? Notification.permission : null,
  );
  // Permissão concedida não é o mesmo que estar inscrito — depois de desativar,
  // a permissão do navegador continua "granted" (não dá pra revogar por código),
  // só a assinatura é que some. Por isso rastreia os dois separadamente.
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    isPushSubscribed().then((value) => {
      if (!cancelled) setSubscribed(value);
    });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  if (permission === null) return null;

  const ativar = async () => {
    setLoading(true);
    try {
      const resultado = await ativarPushNotifications();
      if (resultado === 'ativado') {
        toast.success('Notificações ativadas');
        setPermission('granted');
        setSubscribed(true);
      } else if (resultado === 'negado') {
        setPermission('denied');
      }
    } catch {
      toast.error('Não foi possível ativar', 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  const desativar = async () => {
    setLoading(true);
    try {
      await desativarPushNotifications();
      toast.success('Notificações desativadas');
      setSubscribed(false);
    } catch {
      toast.error('Não foi possível desativar', 'Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-fg-muted">
          <Bell className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-fg">Notificações</p>
          <p className="truncate text-[12px] text-fg-subtle">
            {subscribed
              ? 'Ativadas neste aparelho'
              : permission === 'denied'
                ? 'Bloqueadas — ative nas configurações do navegador'
                : 'Receba avisos de promoções e recompensas'}
          </p>
        </div>
      </div>
      {subscribed ? (
        <button
          type="button"
          onClick={desativar}
          disabled={loading}
          className="shrink-0 text-[13px] font-semibold text-fg-subtle underline underline-offset-2"
        >
          {loading ? 'Desativando…' : 'Desativar'}
        </button>
      ) : permission !== 'denied' ? (
        <button
          type="button"
          onClick={ativar}
          disabled={loading}
          className="shrink-0 text-[13px] font-semibold text-primary-subtle-fg"
        >
          {loading ? 'Ativando…' : 'Ativar'}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Lista todas as padarias do cliente e deixa trocar qual está "ativa" (a que
 * aparece no Cartão/Recompensas/Extrato) — só aparece quando há mais de uma,
 * já que trocar de QR em QR pra alternar entre padarias era exatamente a
 * confusão que motivou isso existir.
 */
function PadariasSection({ empresas, atual }: { empresas: EmpresaVinculo[]; atual?: EmpresaVinculo }) {
  if (empresas.length <= 1) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5">
        <p className="text-[13px] font-semibold text-fg">Suas padarias</p>
      </div>
      <div className="divide-y divide-border">
        {empresas.map((e) => {
          const ativa = e.empresaId === atual?.empresaId;
          return (
            <button
              key={e.empresaId}
              type="button"
              disabled={ativa}
              onClick={() => selecionarEmpresa(e)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default"
            >
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-fg-subtle">
                {e.logoUrl ? (
                  <img src={e.logoUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Store className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-fg">{e.nome}</p>
                <p className="text-[12px] text-fg-subtle">{num.format(e.saldoPontos)} pontos</p>
              </div>
              {ativa ? (
                <Check className="size-4 shrink-0 text-primary" />
              ) : (
                <ChevronRight className="size-4 shrink-0 text-fg-subtle" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PerfilPage() {
  const { cliente, sair } = useClienteAuth();
  const { empresa, empresas } = useEmpresaAtual();
  const toast = useToast();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const excluir = useMutation({
    mutationFn: () => portalApi.excluirConta(),
    onSuccess: () => {
      setPendingResgate(null);
      toast.success('Conta excluída');
      sair();
    },
    onError: (err) => toast.error('Não foi possível excluir', getErrorMessage(err)),
  });

  return (
    <Screen title="Perfil">
      <div className="flex flex-col gap-4">
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          <Linha label="Nome" value={cliente?.nome ?? '—'} />
          <Linha label="CPF" value={cliente?.cpf ? maskCPF(cliente.cpf) : '—'} />
          <Linha label="Telefone" value={cliente?.telefone || '—'} />
          {cliente?.email ? <Linha label="E-mail" value={cliente.email} /> : null}
          {empresa && empresas.length <= 1 ? <Linha label="Padaria" value={empresa.nome} /> : null}
        </div>

        <PadariasSection empresas={empresas} atual={empresa} />

        <NotificacoesToggle />
        <InstallPrompt />

        <button
          type="button"
          onClick={sair}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border-strong bg-surface text-[14px] font-semibold text-fg"
        >
          <LogOut className="size-4" />
          Sair da conta
        </button>

        <button
          type="button"
          onClick={() => setConfirmarExclusao(true)}
          className="mx-auto inline-flex items-center gap-1.5 py-1.5 text-[13px] font-semibold text-danger-fg"
        >
          <Trash2 className="size-3.5" />
          Excluir minha conta
        </button>
      </div>

      <ConfirmDialog
        open={confirmarExclusao}
        onOpenChange={setConfirmarExclusao}
        title="Excluir minha conta"
        description="Sua conta e todo o histórico de pontos serão apagados para sempre. Não dá para desfazer."
        confirmLabel="Sim, excluir"
        loading={excluir.isPending}
        onConfirm={() => excluir.mutate()}
      />
    </Screen>
  );
}
