import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { LogOut, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../components/shared/confirm-dialog';
import { useToast } from '../../components/ui/toast';
import { getErrorMessage } from '../../lib/errors';
import { maskCPF } from '../../lib/masks';
import { Screen } from '../components/screen';
import { InstallPrompt } from '../components/install-prompt';
import { useClienteAuth } from '../context/cliente-auth';
import { useEmpresaAtual } from '../hooks/use-empresa';
import { portalApi } from '../services/portal';
import { setPendingResgate } from '../lib/pending-resgate';

function Linha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[13px] text-fg-subtle">{label}</span>
      <span className="min-w-0 truncate text-[14px] font-semibold text-fg">{value}</span>
    </div>
  );
}

export function PerfilPage() {
  const { cliente, sair } = useClienteAuth();
  const { empresa } = useEmpresaAtual();
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
          {empresa ? <Linha label="Padaria" value={empresa.nome} /> : null}
        </div>

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
