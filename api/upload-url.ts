import crypto from 'node:crypto'
import process from 'node:process'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { fail } from './_lib/http.js'
import { withinRateLimit } from './_lib/rate-limit.js'
import { getBearerUser } from './_lib/supabase.js'

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
])
const MAX_IMAGE_SIZE_BYTES = 25 * 1024 * 1024 // 25MB
const MAX_VIDEO_SIZE_BYTES = 25 * 1024 * 1024 // 25MB

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await getBearerUser(req)
    if (!user) return fail(401, 'Entre com sua conta Google para enviar fotos.')

    // Fails open: a limiter outage must not stop uploads during the party
    const allowed = await withinRateLimit('upload', user.id, 60, 600).catch((err: unknown) => {
      console.error('[upload-url]', err)
      return true
    })
    if (!allowed) {
      return fail(429, 'Muitos envios seguidos. Aguarde alguns minutos.')
    }

    const body = (await req.json()) as {
      contentType?: string
      fileType?: string
      sizeBytes?: number
    }

    const rawContentType = body.contentType || body.fileType || ''
    const contentType = (rawContentType.split(';')[0] ?? '').trim().toLowerCase()
    const { sizeBytes } = body

    // Validate MIME whitelist
    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType)) {
      return new Response(
        JSON.stringify({
          error:
            'Tipo de arquivo não permitido. Formatos aceitos: JPEG, PNG, WebP, MP4, WebM e MOV.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const isVideo = contentType.startsWith('video/')
    const maxAllowedBytes = isVideo ? MAX_VIDEO_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES

    // Validate size limit
    if (
      typeof sizeBytes !== 'number' ||
      !Number.isSafeInteger(sizeBytes) ||
      sizeBytes <= 0 ||
      sizeBytes > maxAllowedBytes
    ) {
      return new Response(
        JSON.stringify({
          error: `Tamanho excede o limite permitido (máximo ${maxAllowedBytes / (1024 * 1024)}MB).`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME || 'instawedding'
    const publicDomain = process.env.R2_PUBLIC_DOMAIN || '/media'

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(JSON.stringify({ error: 'Storage S3/R2 não configurado no servidor.' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const ext = MIME_EXTENSION_MAP[contentType.toLowerCase()] || 'jpg'
    const objectKey = `uploads/${year}/${month}/${crypto.randomUUID()}.${ext}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ContentType: contentType,
      // Signed into the URL: R2 rejects a body of any other size
      ContentLength: sizeBytes,
    })

    // Generate presigned PUT URL expiring in 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
      // The SDK leaves content-type unsigned by default, which would let a
      // client upload HTML to a URL issued for an image
      signableHeaders: new Set(['host', 'content-type', 'content-length']),
    })
    const publicUrl = `${publicDomain.replace(/\/$/, '')}/${objectKey}`

    return new Response(
      JSON.stringify({
        uploadUrl,
        publicUrl,
        key: objectKey,
        expiresIn: 300,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[upload-url]', error)
    return fail(500, 'Falha ao preparar o envio. Tente novamente.')
  }
}
