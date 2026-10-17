import crypto from 'node:crypto'

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15MB

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as {
      contentType?: string
      fileType?: string
      sizeBytes?: number
      sessionId?: string
    }

    const contentType = body.contentType || body.fileType
    const { sizeBytes, sessionId } = body

    // Validate MIME whitelist
    if (!contentType || !ALLOWED_MIME_TYPES.has(contentType.toLowerCase())) {
      return new Response(
        JSON.stringify({
          error:
            'Tipo de arquivo não permitido. Apenas JPEG, PNG e WebP são aceitos.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate size limit
    if (!sizeBytes || sizeBytes > MAX_FILE_SIZE_BYTES || sizeBytes <= 0) {
      return new Response(
        JSON.stringify({
          error: `Tamanho excede o limite permitido (máximo ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB).`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate session identifier
    if (!sessionId || typeof sessionId !== 'string' || sessionId.length < 8) {
      return new Response(
        JSON.stringify({ error: 'Sessão do convidado inválida.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME || 'instawedding'
    const publicDomain =
      process.env.R2_PUBLIC_DOMAIN || 'https://media.instawedding.local'

    if (!accountId || !accessKeyId || !secretAccessKey) {
      return new Response(
        JSON.stringify({ error: 'Storage S3/R2 não configurado no servidor.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
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
    })

    // Generate presigned PUT URL expiring in 5 minutes (300 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 })
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
    const message =
      error instanceof Error ? error.message : 'Upload URL Generation Error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
