import { renderBrandIcon } from '@/branding/renderIcon'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
export default function Icon() {
  return renderBrandIcon(size.width)
}
