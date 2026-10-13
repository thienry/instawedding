import { Link } from 'react-router-dom';
import { ArrowLeft, Tv } from 'lucide-react';

export function ProjectorPage() {
  return (
    <div className="min-h-screen bg-sage-950 text-white flex flex-col items-center justify-center p-6 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
        <Tv className="w-8 h-8 text-gold-400" />
      </div>
      <h1 className="font-serif text-2xl md:text-4xl font-bold">
        Modo Telão (Projector Wall)
      </h1>
      <p className="text-sm text-white/70 max-w-md">
        A visualização de telão com animações e sincronização ao vivo será estruturada na Fase 4.
      </p>
      <Link
        to="/"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Voltar para o Feed</span>
      </Link>
    </div>
  );
}
