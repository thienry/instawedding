import { Eye, FileText, Lock, ShieldCheck, Trash2, X } from 'lucide-react'

interface TermsModalProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onAccept?: () => void
}

export function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-lg max-h-[85vh] rounded-2xl shadow-2xl border border-sage-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-sage-100 flex items-center justify-between bg-sage-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-sage-200 text-sage-900 flex items-center justify-center">
              <FileText className="w-4 h-4 text-sage-800" />
            </div>
            <div>
              <h2
                id="terms-modal-title"
                className="font-serif text-base font-bold text-sage-900 leading-tight"
              >
                Termos de Uso & Privacidade
              </h2>
              <p className="text-[11px] text-sage-800/70">
                Casamento Thiago & Priscila (InstaWedding)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar termos"
            className="p-1.5 rounded-full text-sage-700 hover:text-sage-900 hover:bg-sage-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-sage-800/90 leading-relaxed divide-y divide-sage-100">
          {/* Section 1: Finalidade e Uso de Imagem */}
          <section className="space-y-1.5">
            <h3 className="font-semibold text-sage-900 flex items-center gap-1.5 text-xs">
              <Eye className="w-4 h-4 text-gold-500" />
              1. Finalidade e Transmissão no Telão
            </h3>
            <p>
              O <strong>InstaWedding</strong> é uma plataforma privada criada
              exclusivamente para a celebração do casamento de{' '}
              <strong>Thiago & Priscila</strong>. Ao publicar uma foto, você
              concorda em compartilhá-la com os noivos e convidados presentes,
              autorizando sua projeção em tempo real no telão da festa e sua
              inclusão no álbum digital de recordações do casal.
            </p>
          </section>

          {/* Section 2: LGPD & Zero Tracking */}
          <section className="space-y-1.5 pt-3">
            <h3 className="font-semibold text-sage-900 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-sage-800" />
              2. Privacidade & LGPD (Zero Rastreamento Comercial)
            </h3>
            <p>
              Em respeito à Lei Geral de Proteção de Dados (LGPD - Lei nº
              13.709/2018):
            </p>
            <ul className="list-disc pl-5 space-y-1 text-sage-800/80">
              <li>
                <strong>Sem anúncios ou monetização:</strong> Seus dados e fotos
                jamais serão vendidos, cedidos ou usados para fins
                publicitários.
              </li>
              <li>
                <strong>Sem cookies invasivos:</strong> Não utilizamos serviços
                de terceiros para monitoramento de comportamento ou perfil de
                consumo.
              </li>
              <li>
                <strong>Identificação mínima:</strong> Solicitamos apenas o seu
                nome ou apelido para assinar as fotos enviadas.
              </li>
            </ul>
          </section>

          {/* Section 3: Privacy by Design & GPS stripping */}
          <section className="space-y-1.5 pt-3">
            <h3 className="font-semibold text-sage-900 flex items-center gap-1.5 text-xs">
              <Lock className="w-4 h-4 text-sage-800" />
              3. Proteção Automática de Metadados (Privacy by Design)
            </h3>
            <p>
              Antes de qualquer foto ser transmitida para o servidor, o
              navegador do seu aparelho comprime e remove automaticamente todos
              os metadados sensíveis do arquivo (dados <em>EXIF</em>, incluindo
              coordenadas de geolocalização por GPS e dados técnicos do seu
              aparelho).
            </p>
          </section>

          {/* Section 4: Direito de Eliminação */}
          <section className="space-y-1.5 pt-3">
            <h3 className="font-semibold text-sage-900 flex items-center gap-1.5 text-xs">
              <Trash2 className="w-4 h-4 text-rose-600" />
              4. Direito à Exclusão (Art. 18 da LGPD)
            </h3>
            <p>
              Você mantém o controle sobre o que compartilhou. A qualquer
              momento durante o evento, você pode excluir qualquer foto
              publicada por você utilizando o botão de exclusão disponível
              diretamente no card da sua publicação no Feed. A foto será
              removida instantaneamente do feed e do telão.
            </p>
          </section>

          {/* Section 5: Moderação e Respeito */}
          <section className="space-y-1.5 pt-3">
            <h3 className="font-semibold text-sage-900 text-xs">
              5. Convivência e Moderação
            </h3>
            <p>
              Esta é uma festa de família e amigos. Os noivos e os organizadores
              reservam-se o direito de moderar e remover qualquer publicação que
              contenha conteúdo impróprio, desrespeitoso ou que fira a harmonia
              da comemoração.
            </p>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-sage-100 bg-sage-50/50 flex items-center justify-end gap-2.5">
          {onAccept ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-sage-800 hover:bg-sage-200/50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => {
                  onAccept()
                  onClose()
                }}
                className="px-5 py-2 rounded-xl bg-sage-900 hover:bg-sage-800 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                Concordo com os Termos
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-sage-900 hover:bg-sage-800 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
