import { DotLottieReact } from '@lottiefiles/dotlottie-react'

const SRC = 'https://lottie.host/69c5a69c-5299-4c35-a06b-e8991d6c17a9/hFZ7HRArQX.lottie'

export default function LottieStreak({ size = 20 }) {
  return (
    <DotLottieReact
      src={SRC}
      loop
      autoplay
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  )
}
