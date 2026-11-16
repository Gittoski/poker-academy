import { renderBrandIcon } from '@/branding/renderIcon'
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'
export default function Icon() {
  return renderBrandIcon(size.width)
}
