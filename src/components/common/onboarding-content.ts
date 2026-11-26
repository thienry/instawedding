import type { OnboardingScreen } from '@/utils/onboarding'

interface OnboardingTip {
  readonly icon: string
  readonly text: string
}

interface OnboardingContent {
  readonly title: string
  /** Three at most: guests read them in the middle of the party. */
  readonly tips: readonly OnboardingTip[]
}

export const ONBOARDING_CONTENT: Readonly<Record<OnboardingScreen, OnboardingContent>> = {
  feed: {
    title: 'Bem-vindo ao mural da festa! 📸',
    tips: [
      { icon: '🖼️', text: 'Aqui aparecem as fotos e os vídeos de todos os convidados, ao vivo.' },
      {
        icon: '📷',
        text: 'Toque no botão da câmera para mandar sua foto, um vídeo ou um recado para os noivos.',
      },
      { icon: '❤️', text: 'Toque duas vezes numa foto para curtir.' },
    ],
  },
  capture: {
    title: 'Como postar',
    tips: [
      {
        icon: '🔑',
        text: 'Entre com sua conta Google. É rapidinho e só serve para mostrar seu nome nos posts.',
      },
      {
        icon: '📷',
        text: 'Tire uma foto, escolha uma da galeria, grave um vídeo ou escreva um recado para os noivos.',
      },
      {
        icon: '📺',
        text: 'Antes de publicar, escolha se o post também aparece no telão da festa.',
      },
    ],
  },
  challenges: {
    title: 'Desafios da festa 🏆',
    tips: [
      { icon: '🎯', text: 'Cada desafio é uma ideia de foto para você tirar durante a festa.' },
      {
        icon: '📷',
        text: 'Toque na câmera ao lado do desafio para postar: a foto já vai marcada com ele.',
      },
      { icon: '🥇', text: 'Veja quantos você já cumpriu e quem lidera o ranking de fotógrafos.' },
    ],
  },
}
