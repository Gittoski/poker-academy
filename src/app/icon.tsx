import { ImageResponse } from 'next/og'
export const size = { width: 512, height: 512 }
export const contentType = 'image/png'
export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#14243c',
        color: '#edf5ff',
        fontSize: 320,
        borderRadius: 90,
      }}
    >
      A
    </div>,
    size,
  )
}
