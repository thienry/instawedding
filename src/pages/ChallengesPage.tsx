import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, Trophy } from 'lucide-react';
import type { Challenge } from '../types/domain';
import { getChallengeRepository } from '../services/repositories.factory';

export function ChallengesPage() {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const challengeRepo = getChallengeRepository();

  useEffect(() => {
    async function load() {
      try {
        const list = await challengeRepo.getChallenges();
        setChallenges(list);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [challengeRepo]);

  const handleStartChallenge = (challengeId: number) => {
    navigate(`/capture?challengeId=${challengeId}`);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-sage-900 to-sage-800 text-white rounded-3xl p-5 shadow-sm space-y-2 relative overflow-hidden">
        <div className="absolute top-2 right-2 opacity-10">
          <Trophy className="w-24 h-24" />
        </div>
        <div className="flex items-center gap-1.5 text-gold-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Caça ao Tesouro</span>
        </div>
        <h2 className="font-serif text-xl font-bold leading-tight">
          Desafios da Festa
        </h2>
        <p className="text-xs text-white/80 leading-relaxed max-w-xs">
          Encontre e registre cada momento especial abaixo para concorrer a surpresas dos noivos e animar o telão!
        </p>
      </div>

      {/* Challenges List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-sage-200/60 animate-pulse flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-sage-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-sage-200 rounded w-28" />
                  <div className="h-3 bg-sage-200 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="bg-white rounded-2xl p-4 border border-sage-200/70 shadow-xs flex items-center justify-between gap-3 transition-all hover:border-sage-300"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sage-50 border border-sage-200/80 flex items-center justify-center text-2xl shrink-0">
                  {challenge.icon}
                </div>
                <div className="space-y-0.5">
                  <h3 className="font-serif text-sm font-bold text-sage-900">
                    {challenge.title}
                  </h3>
                  <p className="text-[11px] text-sage-800/70 leading-snug">
                    {challenge.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleStartChallenge(challenge.id)}
                className="p-2.5 rounded-xl bg-sage-100 hover:bg-sage-900 text-sage-900 hover:text-white transition-all shrink-0 active:scale-95"
                title="Cumprir Desafio"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
