import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { hideSplash } from '../lib/splash';

/** Rota fora do "gate" de autenticação (ver ClienteApp.tsx) — precisa estar
 *  acessível antes de criar conta, pro checkbox de consentimento no cadastro
 *  (ver login.tsx) poder linkar pra cá sem exigir login. */
export function PrivacidadePage() {
  const navigate = useNavigate();

  useEffect(() => {
    hideSplash();
  }, []);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-md bg-canvas">
      <div
        className="flex items-center gap-3 border-b border-border px-5 pb-4"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)' }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-fg-muted hover:bg-surface"
          aria-label="Voltar"
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1 className="text-[17px] font-bold text-fg">Política de Privacidade</h1>
      </div>

      <div className="flex flex-col gap-5 px-5 py-6 text-[14px] leading-relaxed text-fg">
        <p className="text-fg-muted">Última atualização: outubro de 2026.</p>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">1. Quem somos</h2>
          <p>
            O Fideliza+ é a plataforma que viabiliza o programa de fidelidade de cada
            estabelecimento parceiro (padarias, restaurantes, lanchonetes). Cada estabelecimento é
            responsável pelo relacionamento com os próprios clientes; o Fideliza+ opera a
            tecnologia por trás disso.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">2. Quais dados coletamos</h2>
          <p>Para criar e manter sua conta, coletamos:</p>
          <ul className="list-disc pl-5">
            <li>Nome e CPF, para identificar você e seus pontos.</li>
            <li>Senha (armazenada de forma criptografada — nunca em texto simples).</li>
            <li>Telefone e e-mail, quando você opta por informá-los (opcional).</li>
            <li>
              Histórico de compras, pontos e resgates feitos no(s) estabelecimento(s) em que você
              tem conta.
            </li>
            <li>
              Dados técnicos do aparelho necessários para notificações push, quando você autoriza.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">3. Para que usamos seus dados</h2>
          <ul className="list-disc pl-5">
            <li>Operar o programa de fidelidade: somar pontos, liberar recompensas, mostrar extrato.</li>
            <li>Autenticar seu acesso e manter sua conta segura.</li>
            <li>Enviar notificações sobre promoções, quando você autoriza.</li>
            <li>Enviar o link de redefinição de senha, quando você solicita.</li>
            <li>Prevenir fraude (ex.: impedir que a mesma conta pontue de dois lugares ao mesmo tempo).</li>
          </ul>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">4. Com quem compartilhamos</h2>
          <p>
            Não vendemos nem compartilhamos seus dados com terceiros para fins de marketing. Seus
            dados de compras e pontos ficam visíveis apenas para o(s) estabelecimento(s) em que
            você tem conta — um estabelecimento parceiro não tem acesso aos seus dados em outro.
            Usamos prestadores de serviço (hospedagem e envio de e-mail/notificação) apenas para
            viabilizar o funcionamento do app, nunca para outro fim.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">5. Por quanto tempo guardamos</h2>
          <p>
            Enquanto sua conta existir no estabelecimento. Se você sair de um estabelecimento (ver
            "Perfil" no app), seus dados de compras e pontos ali são apagados; se era o único
            estabelecimento vinculado, sua conta inteira é apagada.
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">6. Seus direitos</h2>
          <p>Você pode, a qualquer momento, direto no app:</p>
          <ul className="list-disc pl-5">
            <li>Acessar e corrigir seus dados (tela "Perfil").</li>
            <li>Excluir sua conta em um estabelecimento, ou totalmente ("Perfil" → "Sair do estabelecimento").</li>
            <li>Desligar notificações push.</li>
          </ul>
          <p>
            Para qualquer outra solicitação relacionada aos seus dados (correção que não esteja no
            app, portabilidade, dúvidas), fale com a gente em{' '}
            <a href="mailto:privacidade@zdmsolutions.com.br" className="font-semibold text-primary">
              privacidade@zdmsolutions.com.br
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">7. Segurança</h2>
          <p>
            Sua senha é armazenada com hash (nunca em texto simples) e toda comunicação entre o
            app e nossos servidores é criptografada (HTTPS).
          </p>
        </section>

        <section className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-bold">8. Alterações nesta política</h2>
          <p>
            Podemos atualizar este texto para refletir mudanças no app ou na lei. Mudanças
            relevantes serão avisadas dentro do app.
          </p>
        </section>
      </div>
    </div>
  );
}
