import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ImageResponse } from 'next/og'

// Render the same approved artwork at each platform's required size. Keeping
// the source server-side avoids shipping the full-resolution PNG to the UI.
const artwork = `data:image/png;base64,${readFileSync(
  path.join(process.cwd(), 'src/branding/spade.png'),
).toString('base64')}`

export function renderBrandIcon(size: number) {
  return new ImageResponse(
    <img src={artwork} width={size} height={size} alt="" />,
    { width: size, height: size },
  )
}
