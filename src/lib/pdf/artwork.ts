import sharp from 'sharp'
import type { TenantInfo } from './utils'

// Legacy uploads may contain large white/transparent margins. Keep their
// database value intact, but crop their PDF snapshot so the art is legible.
export async function prepareDocumentArtwork(tenant: TenantInfo): Promise<TenantInfo> {
  const prepared = { ...tenant }
  for (const field of ['logo', 'stamp', 'signature', 'secondarySignature'] as const) {
    const value = tenant[field]
    if (!value?.startsWith('data:image/') || !value.includes(';base64,')) continue
    try {
      const source = Buffer.from(value.split(';base64,')[1], 'base64')
      const cropped = await sharp(source, { failOn: 'error' }).rotate().trim({ threshold: 12 })
        .resize({ width: field === 'logo' ? 520 : 540, height: field === 'logo' ? 520 : 180,
          fit: 'inside', withoutEnlargement: true }).png({ compressionLevel: 9 }).toBuffer()
      prepared[field] = `data:image/png;base64,${cropped.toString('base64')}`
    } catch {
      // A malformed old image remains untouched; generation can still fall back.
    }
  }
  return prepared
}
