import { renderBrandIcon } from '@/branding/renderIcon'

export const dynamic = 'force-static'

// 48 CSS pixels at 3x density, including iPhone displays.
export function GET() {
  return renderBrandIcon(144)
}
