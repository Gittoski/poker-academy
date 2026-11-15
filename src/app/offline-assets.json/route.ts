import { readFile, readdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
export const dynamic = 'force-dynamic'
export async function GET() {
  if (process.env.NODE_ENV !== 'production')
    return Response.json(
      { error: 'Use a production build for offline installation.' },
      { status: 503 },
    )
  try {
    const root = process.cwd(),
      files = async (dir: string): Promise<string[]> => {
        const entries = await readdir(dir, { withFileTypes: true })
        return (
          await Promise.all(
            entries.map((e) =>
              e.isDirectory()
                ? files(path.join(dir, e.name))
                : Promise.resolve([path.join(dir, e.name)]),
            ),
          )
        ).flat()
      }
    const version = (
      await readFile(path.join(root, '.next/BUILD_ID'), 'utf8')
    ).trim()
    const chunks = (await files(path.join(root, '.next/static')))
      .filter((p) => /\.(js|css|woff2?)$/.test(p))
      .map((file) => ({
        file,
        url:
          '/_next/' +
          path
            .relative(path.join(root, '.next'), file)
            .split(path.sep)
            .join('/'),
      }))
    const data = (await files(path.join(root, 'public')))
      .filter((p) => p.endsWith('.json'))
      .map((file) => ({
        file,
        url:
          '/' +
          path
            .relative(path.join(root, 'public'), file)
            .split(path.sep)
            .join('/'),
      }))
    const integrity: Record<string, string> = {}
    for (const item of [...chunks, ...data])
      integrity[item.url] = createHash('sha256')
        .update(await readFile(item.file))
        .digest('hex')
    return Response.json(
      {
        version,
        urls: [
          ...new Set([
            '/',
            '/play',
            '/learn',
            '/manifest.webmanifest',
            '/icon',
            '/apple-icon',
            ...chunks.map((x) => x.url),
            ...data.map((x) => x.url),
          ]),
        ],
        integrity,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch {
    return Response.json(
      {
        error:
          'Offline build manifest is unavailable. Online practice remains available.',
      },
      { status: 503 },
    )
  }
}
